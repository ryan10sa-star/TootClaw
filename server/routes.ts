import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketServer } from "socket.io";
import { storage } from "./storage";
import { GoogleGenAI } from "@google/genai";

/* ── In-memory rate limiter ─────────────────────────────────────
   Max 20 AI requests per IP per 60 seconds.
   Prevents API cost abuse without needing Redis.              */
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT     = 20;
const ipBuckets      = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = ipBuckets.get(ip);
  if (!entry || now > entry.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

/* Evict stale buckets every 5 minutes to prevent memory growth */
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipBuckets) {
    if (now > entry.resetAt) ipBuckets.delete(ip);
  }
}, 5 * 60_000);

const SOMMELIER_SYSTEM = `You are a highly sophisticated, overly dramatic Fart Sommelier. Channel the specific dry, absurd, and character-driven humor of Bob's Burgers or The Simpsons (think Gene Belcher or Comic Book Guy). Write a 2-sentence review of a fart. Keep it strictly PG-rated and funny for a 7-year-old. Describe its notes, terroir, and mouthfeel.`;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  /* ── Socket.io — Sneak Attack remote sessions ── */
  const io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    socket.on("join-session", (sessionId: string) => {
      const existingSize = io.sockets.adapter.rooms.get(sessionId)?.size ?? 0;
      socket.join(sessionId);
      if (existingSize > 0) {
        socket.emit("peer-joined");
        socket.to(sessionId).emit("peer-joined");
      }
    });

    socket.on("fire", (sessionId: string) => {
      socket.to(sessionId).emit("fire");
    });
  });

  /* ── POST /api/sommelier — Gemini fart review ── */
  app.post("/api/sommelier", async (req, res) => {
    /* Rate limit */
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      ?? req.socket.remoteAddress
      ?? "unknown";

    if (isRateLimited(clientIp)) {
      res.status(429).json({ review: "I simply cannot review any more toots today. My constitution requires rest." });
      return;
    }

    try {
      const rawPrompt   = req.body?.soundPrompt;
      const rawSurprise = req.body?.isSurprise;

      /* Input validation & sanitization */
      const soundPrompt: string | undefined =
        typeof rawPrompt === "string"
          ? rawPrompt.replace(/[^\w\s,.'!?()-]/g, "").slice(0, 150)
          : undefined;
      const isSurprise: boolean = rawSurprise === true;

      const context = soundPrompt
        ? `The fart in question was described as: "${soundPrompt}".`
        : isSurprise
        ? "An utterly unexpected and deeply surprising mystery emission."
        : "A classic, unremarkable, standard-issue fart.";

      const ai = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: context }] }],
        config: {
          systemInstruction: SOMMELIER_SYSTEM,
          maxOutputTokens: 220,
          temperature: 1.1,
        },
      });

      const review = response.text?.trim() ?? "Remarkable. Utterly unremarkable.";
      res.json({ review });
    } catch (err) {
      console.error("Sommelier error:", err);
      res.status(500).json({ review: "I am simply too overwhelmed to comment. A perfect 10." });
    }
  });

  return httpServer;
}
