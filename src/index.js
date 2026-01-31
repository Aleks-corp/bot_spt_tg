import http from "http";
import "dotenv/config";
import axios from "axios";
import { bot } from "./bot.js";

const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end("OK");
    }
    res.writeHead(200);
    res.end("Bot is running");
  })
  .listen(PORT, () => console.log(`HTTP server on ${PORT}`));

if (!process.env.BOT_TOKEN || !process.env.SUPPORT_CHAT_ID) {
  console.error(
    "Error: BOT_TOKEN or SUPPORT_CHAT_ID is not set in environment variables.",
  );
  process.exit(1);
}

// Грейсфул стоп (Render любить)
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

bot.launch().then(() => {
  console.log("Bot started");
});

if (process.env.SELF_URL) {
  setInterval(
    async () => {
      try {
        await axios.get(`${SELF_URL}/health`);
        console.log("Self ping OK");
      } catch (err) {
        console.error("Self ping error", err.message);
      }
    },
    12 * 60 * 1000,
  ); // кожні 12 хвилин
} else {
  console.warn("SELF_URL is not set, self ping disabled");
}
