import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import startBot from "./handlers/start.js";
import { handleNewTicket, handleTicketDialog } from "./handlers/newTicket.js";
import { handleReplyCommand, handleReplyToMessage } from "./handlers/reply.js";

const bot = new Telegraf(process.env.BOT_TOKEN);

// bot.use((ctx, next) => {
//   console.log("UPDATE:", JSON.stringify(ctx.update, null, 2));
//   return next();
// });

// Команди
bot.start(startBot);
bot.hears("📝 Нова заявка", handleNewTicket);
bot.command("reply", handleReplyCommand);

// Текстові повідомлення
bot.on(message("text"), async (ctx) => {
  // Спочатку перевіряємо reply в групі
  const handledByReply = await handleReplyToMessage(ctx);
  if (handledByReply) return; // ⭐ Якщо оброблено — зупиняємось

  // Потім діалог створення заявки
  await handleTicketDialog(ctx);
});

export { bot };
