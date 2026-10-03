import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation/contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_SUBMISSIONS = 3;
const submissionsByClient = new Map<string, { count: number; windowStartedAt: number }>();

function clientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(key: string, now: number): boolean {
  if (submissionsByClient.size >= 500) {
    for (const [client, entry] of submissionsByClient) {
      if (now - entry.windowStartedAt >= RATE_LIMIT_WINDOW_MS) submissionsByClient.delete(client);
    }
    if (submissionsByClient.size >= 500) {
      const oldestClient = submissionsByClient.keys().next().value;
      if (oldestClient) submissionsByClient.delete(oldestClient);
    }
  }

  const entry = submissionsByClient.get(key);
  if (!entry || now - entry.windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
    submissionsByClient.set(key, { count: 1, windowStartedAt: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX_SUBMISSIONS) return true;
  entry.count += 1;
  return false;
}

export async function POST(request: Request) {
  if (isRateLimited(clientKey(request), Date.now())) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the submitted fields." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !sender) {
    console.error("[contact] Email delivery is not configured", {
      missing: [
        ...(!apiKey ? ["RESEND_API_KEY"] : []),
        ...(!sender ? ["RESEND_FROM_EMAIL"] : []),
      ],
    });
    return NextResponse.json({ error: "Contact email is temporarily unavailable." }, { status: 503 });
  }

  const { name, email, mobile, subject, message } = parsed.data;
  const text = [
    "Source: SynSphere Technologies website contact form",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Mobile: ${mobile}`,
    `Subject: ${subject}`,
    "",
    "Message:",
    message,
    "",
    `Submitted at: ${new Date().toISOString()}`,
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: ["info@synsphere.in"],
        reply_to: email,
        subject: `[Website Contact] ${subject}`,
        text,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[contact] Email provider rejected the message", { status: response.status });
      return NextResponse.json({ error: "Contact email is temporarily unavailable." }, { status: 502 });
    }
  } catch (error) {
    console.error("[contact] Email provider request failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Contact email is temporarily unavailable." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
