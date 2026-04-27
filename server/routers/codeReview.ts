import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createCodeReview, getCodeReviewById, getUserCodeReviews, createChatMessage, getReviewChatMessages } from "../db";
import { storagePut, storageGet } from "../storage";
import { invokeLLM } from "../_core/llm";

interface BugItem {
  severity: "critical" | "high" | "medium" | "low";
  line?: number;
  issue: string;
  fix: string;
}

interface SuggestionItem {
  category: string;
  suggestion: string;
  benefit: string;
}

interface ReviewAnalysis {
  bugs: BugItem[];
  suggestions: SuggestionItem[];
  explanation: string;
}

export const codeReviewRouter = router({
  // Upload and analyze code
  uploadAndReview: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileContent: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Store file in S3
        const fileKey = `code-reviews/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url: fileUrl } = await storagePut(fileKey, input.fileContent, "text/plain");

        // Detect language from filename
        const language = detectLanguage(input.fileName);

        // Call LLM for analysis
        const analysis = await analyzeCode(input.fileContent, language);

        // Create code review record
        const result = await createCodeReview({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileKey,
          fileUrl,
          fileContent: input.fileContent,
          language,
          bugs: JSON.stringify(analysis.bugs),
          suggestions: JSON.stringify(analysis.suggestions),
          explanation: analysis.explanation,
        });

        // Get the inserted ID
        const reviewId = (result as any).insertId;

        return {
          reviewId,
          fileName: input.fileName,
          language,
          analysis,
          fileUrl,
        };
      } catch (error) {
        console.error("Error uploading and reviewing code:", error);
        throw error;
      }
    }),

  // Get review by ID
  getReview: protectedProcedure
    .input(z.object({ reviewId: z.number() }))
    .query(async ({ input, ctx }) => {
      const review = await getCodeReviewById(input.reviewId);
      if (!review) return null;

      // Verify ownership
      if (review.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      return {
        ...review,
        bugs: review.bugs ? JSON.parse(review.bugs) : [],
        suggestions: review.suggestions ? JSON.parse(review.suggestions) : [],
      };
    }),

  // Get user's review history
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const reviews = await getUserCodeReviews(ctx.user.id);
    return reviews.map((review) => ({
      ...review,
      bugs: review.bugs ? JSON.parse(review.bugs) : [],
      suggestions: review.suggestions ? JSON.parse(review.suggestions) : [],
    }));
  }),

  // Download original code file
  downloadFile: protectedProcedure
    .input(z.object({ reviewId: z.number() }))
    .query(async ({ input, ctx }) => {
      const review = await getCodeReviewById(input.reviewId);
      if (!review) return null;

      // Verify ownership
      if (review.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      // Get presigned URL for download
      const { url } = await storageGet(review.fileKey);
      return {
        fileName: review.fileName,
        downloadUrl: url,
      };
    }),

  // Chat about code review
  chat: protectedProcedure
    .input(
      z.object({
        reviewId: z.number(),
        message: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify review ownership
      const review = await getCodeReviewById(input.reviewId);
      if (!review) throw new Error("Review not found");
      if (review.userId !== ctx.user.id) throw new Error("Unauthorized");

      // Save user message
      await createChatMessage({
        reviewId: input.reviewId,
        userId: ctx.user.id,
        role: "user",
        content: input.message,
      });

      // Get chat history for context
      const chatHistory = await getReviewChatMessages(input.reviewId);

      // Generate assistant response using LLM
      const systemPrompt = `You are a helpful code review assistant. The user uploaded code and you previously analyzed it.
Current code:
\`\`\`${review.language}
${review.fileContent}
\`\`\`

Previous analysis:
Bugs: ${review.bugs}
Suggestions: ${review.suggestions}
Explanation: ${review.explanation}

Answer the user's follow-up questions about this code.`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...chatHistory.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user" as const, content: input.message },
      ];

      const response = await invokeLLM({ messages });
      const responseContent = response.choices[0]?.message?.content;
      const assistantMessage = typeof responseContent === "string" ? responseContent : "I couldn't generate a response.";

      // Save assistant response
      await createChatMessage({
        reviewId: input.reviewId,
        userId: ctx.user.id,
        role: "assistant",
        content: assistantMessage,
      });

      return {
        message: assistantMessage,
      };
    }),

  // Get chat history for a review
  getChatHistory: protectedProcedure
    .input(z.object({ reviewId: z.number() }))
    .query(async ({ input, ctx }) => {
      const review = await getCodeReviewById(input.reviewId);
      if (!review) throw new Error("Review not found");
      if (review.userId !== ctx.user.id) throw new Error("Unauthorized");

      return await getReviewChatMessages(input.reviewId);
    }),
});

// Helper function to detect programming language from filename
function detectLanguage(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const languageMap: Record<string, string> = {
    py: "python",
    js: "javascript",
    ts: "typescript",
    tsx: "typescript",
    jsx: "javascript",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    rb: "ruby",
    go: "go",
    rs: "rust",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    scala: "scala",
    sh: "bash",
    sql: "sql",
    html: "html",
    css: "css",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
  };
  return languageMap[ext] || ext || "text";
}

// Helper function to analyze code using LLM
async function analyzeCode(code: string, language: string): Promise<ReviewAnalysis> {
  const systemPrompt = `You are an expert code reviewer. Analyze the provided code and respond with a JSON object containing:
1. "bugs": Array of bug objects with fields: severity (critical/high/medium/low), line (optional), issue (description), fix (suggested fix)
2. "suggestions": Array of suggestion objects with fields: category (string), suggestion (description), benefit (why it matters)
3. "explanation": A clear, step-by-step explanation of what the code does and how it works

Respond ONLY with valid JSON, no markdown formatting.`;

  const userPrompt = `Analyze this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "code_review",
        strict: true,
        schema: {
          type: "object",
          properties: {
            bugs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: {
                    type: "string",
                    enum: ["critical", "high", "medium", "low"],
                  },
                  line: { type: "number" },
                  issue: { type: "string" },
                  fix: { type: "string" },
                },
                required: ["severity", "issue", "fix"],
              },
            },
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  suggestion: { type: "string" },
                  benefit: { type: "string" },
                },
                required: ["category", "suggestion", "benefit"],
              },
            },
            explanation: { type: "string" },
          },
          required: ["bugs", "suggestions", "explanation"],
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from LLM");

  const contentStr = typeof content === "string" ? content : JSON.stringify(content);
  return JSON.parse(contentStr);
}
