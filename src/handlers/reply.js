import { Markup } from "telegraf";
import { Ticket } from "../models/ticket.model.js";

const SUPPORT_CHAT_ID = Number(process.env.SUPPORT_CHAT_ID);

async function saveReply(telegramId, replyText) {
  const ticket = await Ticket.findOne({ telegramId })
    .sort({ createdAt: -1 })
    .exec();
  if (!ticket) return;
  ticket.adminReply = replyText;
  ticket.repliedAt = new Date();
  await ticket.save();
}

const handleReplyCommand = async (ctx) => {
  console.log("REPLY CMD RAW:", ctx.chat.id, ctx.message.text);
  if (ctx.chat.id !== SUPPORT_CHAT_ID) return false;

  const parts = ctx.message.text.split(" ");
  if (parts.length < 3) {
    await ctx.reply(
      "Формат: /reply <telegram_id> <текст відповіді>\nНапр.: /reply 505182524 Готово, пароль змінено.",
    );
    return true;
  }

  const userId = Number(parts[1]);
  if (!Number.isFinite(userId)) {
    await ctx.reply(
      "Другий аргумент має бути числом (Telegram ID користувача).",
    );
    return true;
  }

  const answerText = parts.slice(2).join(" ").trim();
  if (!answerText) {
    await ctx.reply("Введіть текст відповіді після ID.");
    return true;
  }

  try {
    await ctx.telegram.sendMessage(
      userId,
      `Відповідь від техпідтримки:\n${answerText}`,
    );

    await ctx.telegram.sendMessage(
      userId,
      "Якщо у вас є ще питання, можете залишити нову заявку:",
      Markup.keyboard([["📝 Нове звернення"]]).resize(),
    );

    await saveReply(userId, answerText);
    await ctx.reply("✅ Відповідь користувачу відправлена.");
    return true;
  } catch (error) {
    console.error("Failed to send reply:", error);
    await ctx.reply(`❌ Помилка відправки: ${error.message}`);
    return true;
  }
};

const handleReplyToMessage = async (ctx) => {
  if (ctx.chat.id !== SUPPORT_CHAT_ID) return false;

  // Якщо це команда — пропускаємо
  if (ctx.message.entities?.some((e) => e.type === "bot_command")) {
    return false;
  }

  // Якщо це не reply на повідомлення — пропускаємо
  if (!ctx.message.reply_to_message) return false;

  // Якщо reply не на повідомлення від бота — пропускаємо
  if (!ctx.message.reply_to_message.from?.is_bot) return false;

  const originalText = ctx.message.reply_to_message.text || "";
  const answerText = ctx.message.text.trim();

  // Витягуємо Telegram ID
  const idMatch = originalText.match(/🆔 Telegram ID:\s*(\d+)/);

  if (!idMatch) {
    await ctx.reply(
      "❌ Не вдалося знайти Telegram ID у повідомленні. Використайте команду:\n/reply <id> <текст>",
    );
    return true;
  }

  const userId = Number(idMatch[1]);

  if (!answerText) {
    await ctx.reply("❌ Введіть текст відповіді.");
    return true;
  }

  try {
    await ctx.telegram.sendMessage(
      userId,
      `Відповідь від техпідтримки:\n${answerText}`,
    );

    await ctx.telegram.sendMessage(
      userId,
      "Якщо у вас є ще питання, можете залишити нову заявку:",
      Markup.keyboard([["📝 Нове звернення"]]).resize(),
    );

    await saveReply(userId, answerText);
    return true;
  } catch (error) {
    console.error("Failed to send reply:", error);
    await ctx.reply(`❌ Помилка відправки: ${error.message}`);
    return true;
  }
};

export { handleReplyCommand, handleReplyToMessage };
