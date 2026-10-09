import { Markup } from "telegraf";
import { isAdmin } from "../config/admins.js";

// state: adminId -> { step, data }
const adminMessageState = new Map();

const handleAdminMessage = (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  adminMessageState.set(ctx.from.id, { step: "WAIT_USER_ID", data: {} });

  return ctx.reply(
    "Введіть Telegram ID користувача, якому потрібно написати.",
    Markup.removeKeyboard(),
  );
};

const handleAdminMessageDialog = async (ctx) => {
  if (ctx.chat.type !== "private") return false;
  if (!isAdmin(ctx.from.id)) return false;

  const state = adminMessageState.get(ctx.from.id);
  if (!state) return false;

  const text = ctx.message.text.trim();

  if (text === "⬅️ Скасувати") {
    adminMessageState.delete(ctx.from.id);
    await ctx.reply("Скасовано.", Markup.removeKeyboard());
    return true;
  }

  if (state.step === "WAIT_USER_ID") {
    const userId = Number(text);
    if (!Number.isFinite(userId)) {
      return ctx.reply("Telegram ID має бути числом. Спробуйте ще раз.");
    }

    state.data.userId = userId;
    state.step = "WAIT_TEXT";
    adminMessageState.set(ctx.from.id, state);

    return ctx.reply(
      "Введіть текст повідомлення для користувача.",
      Markup.keyboard([["⬅️ Скасувати"]])
        .resize()
        .oneTime(),
    );
  }

  if (state.step === "WAIT_TEXT") {
    adminMessageState.delete(ctx.from.id);

    try {
      await ctx.telegram.sendMessage(
        state.data.userId,
        `Повідомлення від техпідтримки:\n${text}`,
      );
      await ctx.reply("✅ Повідомлення надіслано.", Markup.removeKeyboard());
    } catch (err) {
      console.error("❌ Помилка надсилання повідомлення:", err.message);
      await ctx.reply(
        `⚠️ Не вдалося надіслати повідомлення.\nПричина: ${err.message}`,
        Markup.removeKeyboard(),
      );
    }

    return true;
  }

  return false;
};

export { adminMessageState, handleAdminMessage, handleAdminMessageDialog };
