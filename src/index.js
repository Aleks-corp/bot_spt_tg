import http from "http";
import "dotenv/config";
import axios from "axios";
import { bot } from "./bot.js";

const PORT = process.env.PORT || 3000;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// HTTP Server
const server = http.createServer(async (req, res) => {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("OK");
  }

  // Webhook endpoint для Telegram (тільки в production)
  if (IS_PRODUCTION && WEBHOOK_DOMAIN && req.url.startsWith("/telegraf/")) {
    // Збираємо body з POST запиту
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const update = JSON.parse(body);
        await bot.handleUpdate(update);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error("Webhook error:", err);
        res.writeHead(500);
        res.end("Internal Server Error");
      }
    });
    return;
  }

  // Default response
  res.writeHead(200);
  res.end(`Bot is running (${IS_PRODUCTION ? "webhooks" : "polling"})`);
});

server.listen(PORT, () => {
  console.log(`🌐 HTTP server running on port ${PORT}`);
});

// Validation
if (!process.env.BOT_TOKEN || !process.env.SUPPORT_CHAT_ID) {
  console.error(
    "❌ Error: BOT_TOKEN or SUPPORT_CHAT_ID is not set in environment variables.",
  );
  process.exit(1);
}

// Bot launch logic
if (IS_PRODUCTION && WEBHOOK_DOMAIN) {
  // PRODUCTION: Webhooks
  const webhookPath = `/telegraf/${bot.secretPathComponent()}`;
  const webhookUrl = `${WEBHOOK_DOMAIN}${webhookPath}`;

  bot.telegram
    .setWebhook(webhookUrl)
    .then(() => {
      console.log(`✅ Webhook set to: ${webhookUrl}`);
      console.log("🤖 Bot started in PRODUCTION mode (webhooks)");
    })
    .catch((err) => {
      console.error("❌ Failed to set webhook:", err);
      process.exit(1);
    });
} else {
  // DEVELOPMENT: Polling
  bot.launch().then(() => {
    console.log("🚀 Bot started in DEVELOPMENT mode (polling)");
  });

  // Graceful stop для polling
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

// Self-ping (щоб Render не засинав)
if (WEBHOOK_DOMAIN) {
  setInterval(
    async () => {
      try {
        await axios.get(`${WEBHOOK_DOMAIN}/health`);
        console.log("✅ Self ping OK");
      } catch (err) {
        console.error("❌ Self ping error:", err.message);
      }
    },
    12 * 60 * 1000, // кожні 12 хвилин
  );
} else {
  console.warn("⚠️ WEBHOOK_DOMAIN is not set, self ping disabled");
}
