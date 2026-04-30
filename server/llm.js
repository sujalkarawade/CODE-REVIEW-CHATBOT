import { ENV } from "./env.js";

const MAX_CODE_CHARS = 8000;

export async function invokeLLM({ messages, maxTokens = 1024 }) {
  if (!ENV.groqApiKey) throw new Error("GROQ_API_KEY is not set");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.groqApiKey}`,
    },
    body: JSON.stringify({
      model: ENV.groqModel,
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM error: ${response.status} – ${err}`);
  }

  return response.json();
}

export function truncateCode(code) {
  return code.length > MAX_CODE_CHARS
    ? code.slice(0, MAX_CODE_CHARS) + "\n\n// ... (truncated)"
    : code;
}
