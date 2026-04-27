import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { codeReviewRouter } from "./routers/codeReview";

export const appRouter = router({
  system: systemRouter,
  codeReview: codeReviewRouter,
});

export type AppRouter = typeof appRouter;
