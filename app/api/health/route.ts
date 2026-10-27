import { NextResponse } from "next/server";

export function GET() {
  const memory = process.memoryUsage();
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryRssMb: Math.round(memory.rss / (1024 * 1024)),
    browserConfigured: true,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
}
