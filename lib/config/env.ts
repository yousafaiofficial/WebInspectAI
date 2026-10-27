export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  MAX_CONCURRENT_AUDITS: parseInt(process.env.MAX_CONCURRENT_AUDITS || "2", 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || "3", 10),
  RATE_LIMIT_WINDOW_SECONDS: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || "3600", 10),
  AUDIT_TIMEOUT_SECONDS: parseInt(process.env.AUDIT_TIMEOUT_SECONDS || "90", 10),
  BASE_URL: process.env.BASE_URL || "https://webinspectai.com",
};
