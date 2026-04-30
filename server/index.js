import express from "express";
import { ENV } from "./env.js";
import codeReviewRouter from "./routes/codeReview.js";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: "2mb" }));

// API routes first — before Vite middleware
app.use("/api/reviews", codeReviewRouter);

// Vite dev middleware in development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    configFile: path.join(__dirname, "../vite.config.js"),
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "../dist/client")));
  app.get("*", (_, res) => res.sendFile(path.join(__dirname, "../dist/client/index.html")));
}

app.listen(ENV.port, () => {
  console.log(`Server running at http://localhost:${ENV.port}`);
});
