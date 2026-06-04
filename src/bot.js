import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import startBot from "./handlers/start.js";
import { handleNewTicket, handleTicketDialog } from "./handlers/newTicket.js";
import { handleReplyCommand, handleReplyToMessage } from "./handlers/reply.js";
import { handleAdminStats, handleAdminActiveTickets } from "./handlers/adminHandlers.js";
import { handleAdminNewTicket, handleAdminTicketDialog } from "./handlers/adminTicket.js";

const bot = new Telegraf(process.env.BOT_TOKEN);

// bot.use((ctx, next) => {
//   console.log("UPDATE:", JSON.stringify(ctx.update, null, 2));
//   return next();
// });

// Команди
bot.start(startBot);
bot.hears("📝 Нове звернення", handleNewTicket);
bot.hears("📋 Внутрішня заявка", handleAdminNewTicket);
bot.hears("📊 Статистика", handleAdminStats);
bot.hears("👥 Активні заявки", handleAdminActiveTickets);
bot.command("reply", handleReplyCommand);

// Текстові повідомлення
bot.on(message("text"), async (ctx) => {
  const handledByReply = await handleReplyToMessage(ctx);
  if (handledByReply) return;

  const handledByAdmin = await handleAdminTicketDialog(ctx);
  if (handledByAdmin) return;

  await handleTicketDialog(ctx);
});

export { bot };
