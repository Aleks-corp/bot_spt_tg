import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import startBot from "./handlers/start.js";
import { handleNewTicket, handleTicketDialog } from "./handlers/newTicket.js";
import { handleReplyCommand, handleReplyToMessage } from "./handlers/reply.js";
import { handleAdminStats, handleAdminActiveTickets } from "./handlers/adminHandlers.js";
import { handleAdminNewTicket, handleAdminTicketDialog } from "./handlers/adminTicket.js";
import { handleAdminExport, handleExportDialog } from "./handlers/adminExport.js";
import { handleCreateAccount, handleCreateAccountDialog } from "./handlers/createAccount.js";
import { Ticket } from "./models/ticket.model.js";

const SUPPORT_CHAT_ID = Number(process.env.SUPPORT_CHAT_ID);

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
bot.hears("📥 Експорт CSV", handleAdminExport);
bot.hears("➕ Створити акаунт", handleCreateAccount);
bot.command("reply", handleReplyCommand);

// Реакція в групі підтримки → статус "Виконано"
bot.on("message_reaction", async (ctx) => {
  const reaction = ctx.update.message_reaction;
  if (reaction.chat.id !== SUPPORT_CHAT_ID) return;
  if (!reaction.new_reaction?.length) return;

  await Ticket.findOneAndUpdate(
    { sourceMessageId: reaction.message_id, status: { $ne: "Виконано" } },
    { status: "Виконано" },
  );
});

// Текстові повідомлення
bot.on(message("text"), async (ctx) => {
  const handledByReply = await handleReplyToMessage(ctx);
  if (handledByReply) return;

  const handledByExport = await handleExportDialog(ctx);
  if (handledByExport) return;

  const handledByAdmin = await handleAdminTicketDialog(ctx);
  if (handledByAdmin) return;

  const handledByCreateAccount = await handleCreateAccountDialog(ctx);
  if (handledByCreateAccount) return;

  await handleTicketDialog(ctx);
});

export { bot };
