import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
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

interface Review {
  id: number;
  fileName: string;
  fileContent: string;
  language: string;
  bugs: BugItem[];
  suggestions: SuggestionItem[];
  explanation: string;
  createdAt: Date;
}

interface ChatMessage {
  id: number;
  reviewId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

// In-memory store
const reviews = new Map<number, Review>();
const chatMessages = new Map<number, ChatMessage[]>();
let nextReviewId = 1;
let nextMessageId = 1;

export const codeReviewRouter = router({
  // Upload and analyze code
  uploadAndReview: publicProcedure
    .input(z.object({ fileName: z.string(), fileContent: z.string() }))
    .mutation(async ({ input }) => {
      const language = detectLanguage(input.fileName);
      const analysis = await analyzeCode(input.fileContent, language);

      const id = nextReviewId++;
      const review: Review = {
        id,
        fileName: input.fileName,
        fileContent: input.fileContent,
        language,
        bugs: analysis.bugs,
        suggestions: analysis.suggestions,
        explanation: analysis.explanation,
        createdAt: new Date(),
      };
      reviews.set(id, review);

      return { reviewId: id, fileName: input.fileName, language, analysis };
    }),

  // Get review by ID
  getReview: publicProcedure
    .input(z.object({ reviewId: z.number() }))
    .query(({ input }) => {
      return reviews.get(input.reviewId) ?? null;
    }),

  // Get all review history
  getHistory: publicProcedure.query(() => {
    return Array.from(reviews.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }),

  // Chat about a review
  chat: publicProcedure
    .input(z.object({ reviewId: z.number(), message: z.string() }))
    .mutation(async ({ input }) => {
      const review = reviews.get(input.reviewId);
      if (!review) throw new Error("Review not found");

      const history = chatMessages.get(input.reviewId) ?? [];

      // Save user message
      history.push({ id: nextMessageId++, reviewId: input.reviewId, role: "user", content: input.message, createdAt: new Date() });

      const systemPrompt = `You are a helpful code review assistant. The user uploaded code and you previously analyzed it.
Current code:
\`\`\`${review.language}
${review.fileContent}
\`\`\`

Previous analysis:
Bugs: ${JSON.stringify(review.bugs)}
Suggestions: ${JSON.stringify(review.suggestions)}
Explanation: ${review.explanation}

Answer the user's follow-up questions about this code.`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ];

      const response = await invokeLLM({ messages });
      const responseContent = response.choices[0]?.message?.content;
      const assistantMessage = typeof responseContent === "string" ? responseContent : "I couldn't generate a response.";

      history.push({ id: nextMessageId++, reviewId: input.reviewId, role: "assistant", content: assistantMessage, createdAt: new Date() });
      chatMessages.set(input.reviewId, history);

      return { message: assistantMessage };
    }),

  // Get chat history for a review
  getChatHistory: publicProcedure
    .input(z.object({ reviewId: z.number() }))
    .query(({ input }) => {
      return chatMessages.get(input.reviewId) ?? [];
    }),
});

function detectLanguage(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    py: "python", js: "javascript", ts: "typescript", tsx: "typescript",
    jsx: "javascript", java: "java", cpp: "cpp", c: "c", cs: "csharp",
    rb: "ruby", go: "go", rs: "rust", php: "php", swift: "swift",
    kt: "kotlin", scala: "scala", sh: "bash", sql: "sql", html: "html",
    css: "css", json: "json", xml: "xml", yaml: "yaml", yml: "yaml",
  };
  return map[ext] || ext || "text";
}

async function analyzeCode(code: string, language: string): Promise<ReviewAnalysis> {
  const systemPrompt = `You are an expert code reviewer. Analyze the provided code and respond with a JSON object containing:
1. "bugs": Array of bug objects with fields: severity (critical/high/medium/low), line (optional), issue (description), fix (suggested fix)
2. "suggestions": Array of suggestion objects with fields: category (string), suggestion (description), benefit (why it matters)
3. "explanation": A clear, step-by-step explanation of what the code does and how it works

Respond ONLY with valid JSON, no markdown formatting.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`` },
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
                  severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
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
  return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
}
