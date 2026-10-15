import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import startBot from "./handlers/start.js";
import { handleNewTicket, handleTicketDialog, userState } from "./handlers/newTicket.js";
import { handleReplyCommand, handleReplyToMessage } from "./handlers/reply.js";
import {
  handleAdminStats,
  handleAdminActiveTickets,
  handleCloseAllTickets,
} from "./handlers/adminHandlers.js";
import {
  handleAdminNewTicket,
  handleAdminTicketDialog,
  adminTicketState,
} from "./handlers/adminTicket.js";
import { handleAdminExport, handleExportDialog, exportState } from "./handlers/adminExport.js";
import {
  handleCreateAccount,
  handleCreateAccountDialog,
  createAccountState,
} from "./handlers/createAccount.js";
import {
  handleAdminMessage,
  handleAdminMessageDialog,
  adminMessageState,
} from "./handlers/adminMessage.js";
import { handleStrayMessage } from "./handlers/strayMessage.js";
import { Ticket } from "./models/ticket.model.js";

const SUPPORT_CHAT_ID = Number(process.env.SUPPORT_CHAT_ID);

const bot = new Telegraf(process.env.BOT_TOKEN);

// bot.use((ctx, next) => {
//   console.log("UPDATE:", JSON.stringify(ctx.update, null, 2));
//   return next();
// });

// Повністю скидає пам'ять усіх діалогів для юзера — викликається при
// вході в будь-який новий флоу, щоб завислий стан одного діалогу не
// перехоплював повідомлення іншого (напр. недороблене створення
// акаунта блокувало звичайну заявку).
function clearAllStates(userId) {
  userState.delete(userId);
  createAccountState.delete(userId);
  adminTicketState.delete(userId);
  exportState.delete(userId);
  adminMessageState.delete(userId);
}

// Команди
bot.start(startBot);
bot.hears("📝 Нове звернення", (ctx) => {
  clearAllStates(ctx.from.id);
  return handleNewTicket(ctx);
});
bot.hears("📋 Внутрішня заявка", (ctx) => {
  clearAllStates(ctx.from.id);
  return handleAdminNewTicket(ctx);
});
bot.hears("📊 Статистика", handleAdminStats);
bot.hears("👥 Активні заявки", handleAdminActiveTickets);
bot.hears("✅ Закрити всі заявки", handleCloseAllTickets);
bot.hears("📥 Експорт CSV", (ctx) => {
  clearAllStates(ctx.from.id);
  return handleAdminExport(ctx);
});
bot.hears("➕ Створити акаунт", (ctx) => {
  clearAllStates(ctx.from.id);
  return handleCreateAccount(ctx);
});
bot.hears("✉️ Написати користувачу", (ctx) => {
  clearAllStates(ctx.from.id);
  return handleAdminMessage(ctx);
});
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

  const handledByAdminMessage = await handleAdminMessageDialog(ctx);
  if (handledByAdminMessage) return;

  const handledByTicket = await handleTicketDialog(ctx);
  if (handledByTicket) return;

  await handleStrayMessage(ctx);
});

export { bot };
