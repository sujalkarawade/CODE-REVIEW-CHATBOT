import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
  port: process.env.PORT ?? 3001,
};
