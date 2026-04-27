export const ENV = {
  isProduction: process.env.NODE_ENV === "production",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
};
