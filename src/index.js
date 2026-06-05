import http from "http";
import "dotenv/config";
import axios from "axios";
import { bot } from "./bot.js";
import { connectDB, closeDB } from "./db.js";
import { handleExport } from "./utils/export.js";

const PORT = process.env.PORT || 3000;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// HTTP Server (як було)
const server = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("OK");
  }

  if (req.url.startsWith("/export")) {
    return handleExport(req, res);
  }

  if (IS_PRODUCTION && WEBHOOK_DOMAIN && req.url.startsWith("/telegraf/")) {
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

// Головний запуск: спочатку Mongo, потім бот
(async () => {
  try {
    await connectDB();

    if (IS_PRODUCTION && WEBHOOK_DOMAIN) {
      const webhookPath = `/telegraf/${bot.secretPathComponent()}`;
      const webhookUrl = `${WEBHOOK_DOMAIN}${webhookPath}`;

      await bot.telegram.setWebhook(webhookUrl, {
        allowed_updates: ["message", "message_reaction", "callback_query"],
      });
      console.log(`✅ Webhook set to: ${webhookUrl}`);
      console.log("🤖 Bot started in PRODUCTION mode (webhooks)");
    } else {
      await bot.launch({
        allowedUpdates: ["message", "message_reaction", "callback_query"],
      });
      console.log("🚀 Bot started in DEVELOPMENT mode (polling)");

      process.once("SIGINT", async () => {
        await closeDB();
        bot.stop("SIGINT");
      });
      process.once("SIGTERM", async () => {
        await closeDB();
        bot.stop("SIGTERM");
      });
    }
  } catch (err) {
    console.error("❌ Failed to start app:", err);
    process.exit(1);
  }
})();

// Self-ping
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
    12 * 60 * 1000,
  );
} else {
  console.warn("⚠️ WEBHOOK_DOMAIN is not set, self ping disabled");
}
