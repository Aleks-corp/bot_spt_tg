import { StrayMessage } from "../models/strayMessage.model.js";
import { isAdmin } from "../config/admins.js";
import { handleNewTicket } from "./newTicket.js";

const SUPPORT_CHAT_ID = Number(process.env.SUPPORT_CHAT_ID);

// В стилі Монобанка — трохи поглузувати, перш ніж відправити на нормальну заявку.
const ROASTS = [
  "Гарна спроба, але я не живий адміністратор 😏 Записав собі в блокнотик. Тепер оформимо справжню заявку:",
  "Повідомлення кудись доставлено... 👀 Але я його просто зберіг. А тепер треба зробити справжню заявку:",
  "Круто, що написали. Шкода, що не як заявку 🙂 Ось правильний варіант:",
  "Занотував для статистики 📋 А тепер зробимо правильне звернення:",
  "Бачу, бачу 👀 Але щоб заявка дійшла до адміна, її треба оформити правильно:",
  "Повідомлення отримано, але воно поки нікуди не потрапило 🙂 Тисніть кнопки, і оформимо як слід:",
  "Я б відповів, але я бот 🤖 Тому краще зробімо правильну заявку:",
];

function pickRoast() {
  return ROASTS[Math.floor(Math.random() * ROASTS.length)];
}

// Ловить повідомлення, написані без /start і без кнопки "Нове звернення"
// (тобто немає жодного активного діалогу). Зберігає текст для статистики,
// кидає копію в групу підтримки й одразу відкриває звичайний флоу заявки.
const handleStrayMessage = async (ctx) => {
  if (ctx.chat.type !== "private") return false;
  if (ctx.message.entities?.some((e) => e.type === "bot_command")) return false;
  if (isAdmin(ctx.from.id)) return false;

  const text = ctx.message.text.trim();
  const user = ctx.from;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");

  await StrayMessage.create({
    telegramId: user.id,
    username: user.username || null,
    fullName: fullName || null,
    text,
  });

  await ctx.telegram.sendMessage(
    SUPPORT_CHAT_ID,
    "🤡 Хтось написав боту напряму замість заявки:\n" +
      `👤 ${fullName || "Невідомо"} (@${user.username || "no_username"})\n` +
      `🆔 Telegram ID: ${user.id}\n` +
      `💬 Текст: ${text}`,
  );

  await ctx.reply(pickRoast());

  return handleNewTicket(ctx);
};

export { handleStrayMessage };
