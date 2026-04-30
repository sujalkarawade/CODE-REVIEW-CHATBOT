import { Router } from "express";
import { invokeLLM, truncateCode } from "../llm.js";

const router = Router();

// In-memory store
const reviews = new Map();
const chatMessages = new Map();
let nextReviewId = 1;

function detectLanguage(fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const map = {
    py: "python", js: "javascript", ts: "typescript", tsx: "typescript",
    jsx: "javascript", java: "java", cpp: "cpp", c: "c", cs: "csharp",
    rb: "ruby", go: "go", rs: "rust", php: "php", swift: "swift",
    kt: "kotlin", sh: "bash", sql: "sql", html: "html", css: "css",
    json: "json", xml: "xml", yaml: "yaml", yml: "yaml",
  };
  return map[ext] || ext || "text";
}

async function analyzeCode(code, language) {
  const truncated = truncateCode(code);

  const systemPrompt = `You are a code reviewer. Analyze the code and respond with ONLY a JSON object (no markdown, no explanation outside JSON):
{"bugs":[{"severity":"critical|high|medium|low","line":1,"issue":"...","fix":"..."}],"suggestions":[{"category":"...","suggestion":"...","benefit":"..."}],"explanation":"2-3 sentence summary of what the code does"}
Keep bugs and suggestions to the most important ones only (max 5 each).`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this ${language} code:\n\`\`\`${language}\n${truncated}\n\`\`\`` },
    ],
    maxTokens: 1024,
  });

  const content = response?.choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}

// POST /api/reviews — upload & analyze
router.post("/", async (req, res) => {
  try {
    const { fileName, fileContent } = req.body;
    if (!fileName || !fileContent) return res.status(400).json({ error: "fileName and fileContent required" });

    const language = detectLanguage(fileName);
    const analysis = await analyzeCode(fileContent, language);

    const id = nextReviewId++;
    const review = { id, fileName, fileContent, language, ...analysis, createdAt: new Date() };
    reviews.set(id, review);

    res.json({ reviewId: id, fileName, language, analysis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews — history
router.get("/", (req, res) => {
  const list = Array.from(reviews.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json(list);
});

// GET /api/reviews/:id
router.get("/:id", (req, res) => {
  const review = reviews.get(parseInt(req.params.id));
  if (!review) return res.status(404).json({ error: "Review not found" });
  res.json(review);
});

// POST /api/reviews/:id/chat
router.post("/:id/chat", async (req, res) => {
  try {
    const review = reviews.get(parseInt(req.params.id));
    if (!review) return res.status(404).json({ error: "Review not found" });

    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });

    const history = chatMessages.get(review.id) ?? [];
    history.push({ role: "user", content: message, createdAt: new Date() });

    const systemPrompt = `You are a helpful code review assistant. The user uploaded code and you previously analyzed it.
Code:
\`\`\`${review.language}
${truncateCode(review.fileContent)}
\`\`\`
Bugs found: ${JSON.stringify(review.bugs)}
Suggestions: ${JSON.stringify(review.suggestions)}
Explanation: ${review.explanation}
Answer the user's follow-up questions about this code concisely.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
      maxTokens: 512,
    });

    const assistantMessage = response?.choices?.[0]?.message?.content ?? "No response.";
    history.push({ role: "assistant", content: assistantMessage, createdAt: new Date() });
    chatMessages.set(review.id, history);

    res.json({ message: assistantMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews/:id/chat
router.get("/:id/chat", (req, res) => {
  const history = chatMessages.get(parseInt(req.params.id)) ?? [];
  res.json(history);
});

export default router;
