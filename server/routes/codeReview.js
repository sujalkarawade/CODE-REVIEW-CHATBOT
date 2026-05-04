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

function safeParseJSON(text) {
  let cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  // Extract first JSON object in case there's surrounding text
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  // Try direct parse
  try { return JSON.parse(cleaned); } catch (_) {}

  // Fix common LLM issues: unescaped backslashes, control chars, trailing commas
  const fixed = cleaned
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\\(?!["\\/bfnrtu])/g, "\\\\")
    .replace(/,\s*([}\]])/g, "$1");

  try { return JSON.parse(fixed); } catch (err) {
    throw new Error(`JSON parse failed: ${err.message} — Raw response: ${text.slice(0, 300)}`);
  }
}

async function analyzeCode(code, language) {
  const truncated = truncateCode(code);

  const systemPrompt = `You are a code reviewer. Respond with ONLY a valid JSON object, no markdown, no code fences, no extra text.
Required structure:
{"bugs":[{"severity":"critical","line":1,"issue":"plain text description","fix":"plain text fix"}],"suggestions":[{"category":"Performance","suggestion":"plain text suggestion","benefit":"plain text benefit"}],"explanation":"plain text 2-3 sentence summary"}
Rules:
- severity: critical, high, medium, or low only
- line: integer line number, omit if unknown
- max 5 bugs, max 5 suggestions
- string values must be plain text only — no backticks, no code, no backslashes, no quotes inside values`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this ${language} code:\n\`\`\`${language}\n${truncated}\n\`\`\`` },
    ],
    maxTokens: 1024,
    responseFormat: { type: "json_object" },
  });

  const content = response?.choices?.[0]?.message?.content ?? "";
  return safeParseJSON(content);
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

// POST /api/reviews/:id/fix — generate fixed code
router.post("/:id/fix", async (req, res) => {
  try {
    const review = reviews.get(parseInt(req.params.id));
    if (!review) return res.status(404).json({ error: "Review not found" });

    // Return cached fix if already generated
    if (review.fixedCode) return res.json({ fixedCode: review.fixedCode });

    const truncated = truncateCode(review.fileContent);
    const bugsDesc = review.bugs.map((b, i) =>
      `${i + 1}. Line ${b.line || "?"}: ${b.issue} — Fix: ${b.fix}`
    ).join("\n");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a code fixer. Apply the listed bug fixes to the code and return ONLY the complete fixed code with no explanation, no markdown, no code fences.`,
        },
        {
          role: "user",
          content: `Fix the following bugs in this ${review.language} code:\n\nBugs to fix:\n${bugsDesc}\n\nOriginal code:\n${truncated}\n\nReturn only the fixed code.`,
        },
      ],
      maxTokens: 2048,
    });

    let fixedCode = response?.choices?.[0]?.message?.content ?? "";
    // Strip any accidental code fences
    fixedCode = fixedCode.replace(/^```[\w]*\n?/i, "").replace(/\n?```$/i, "").trim();

    // Cache it
    review.fixedCode = fixedCode;
    reviews.set(review.id, review);

    res.json({ fixedCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
