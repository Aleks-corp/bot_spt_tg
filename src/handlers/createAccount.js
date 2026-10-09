import { Markup } from "telegraf";
import { DEPARTMENTS } from "../config/departments.js";
import { createWorkspaceUser } from "../services/googleWorkspace.js";

const SUPPORT_CHAT_ID = Number(process.env.SUPPORT_CHAT_ID);

// state: adminId -> { step, data }
const createAccountState = new Map();

function departmentsKeyboard() {
  const rows = [];
  for (let i = 0; i < DEPARTMENTS.length; i += 2) {
    rows.push(DEPARTMENTS.slice(i, i + 2));
  }
  rows.push(["⬅️ Скасувати"]);
  return Markup.keyboard(rows).resize().oneTime();
}

const handleCreateAccount = (ctx) => {
  createAccountState.set(ctx.from.id, { step: "WAIT_LASTNAME", data: {} });

  return ctx.reply(
    "Введіть, будь ласка, прізвище нового користувача.",
    Markup.removeKeyboard(),
  );
};

const handleCreateAccountDialog = async (ctx) => {
  if (ctx.chat.type !== "private") return false;

  const state = createAccountState.get(ctx.from.id);
  if (!state) return false;

  const text = ctx.message.text.trim();

  if (text === "⬅️ Скасувати") {
    createAccountState.delete(ctx.from.id);
    await ctx.reply("Створення акаунта скасовано.", Markup.removeKeyboard());
    return true;
  }

  if (state.step === "WAIT_LASTNAME") {
    state.data.lastName = text;
    state.step = "WAIT_FIRSTNAME";
    createAccountState.set(ctx.from.id, state);
    return ctx.reply("Введіть, будь ласка, ім'я нового користувача.");
  }

  if (state.step === "WAIT_FIRSTNAME") {
    state.data.firstName = text;
    state.step = "WAIT_DEPARTMENT";
    createAccountState.set(ctx.from.id, state);
    return ctx.reply("Оберіть підрозділ:", departmentsKeyboard());
  }

  if (state.step === "WAIT_DEPARTMENT") {
    if (!DEPARTMENTS.includes(text)) {
      return ctx.reply(
        "Будь ласка, оберіть підрозділ зі списку на клавіатурі.",
        departmentsKeyboard(),
      );
    }

    state.data.department = text;
    createAccountState.delete(ctx.from.id);

    try {
      const { email, newPassword } = await createWorkspaceUser({
        firstName: state.data.firstName,
        lastName: state.data.lastName,
        department: state.data.department,
      });

      await ctx.reply(
        "✅ Акаунт створено!\n\n" +
          `👤 ${state.data.lastName} ${state.data.firstName}\n` +
          `🏢 Підрозділ: ${state.data.department}\n` +
          `📧 Email: ${email}\n` +
          `🔑 Пароль: ${newPassword}\n\n` +
          "⚠️ Нікому не передавайте цей пароль.",
        Markup.removeKeyboard(),
      );

      await ctx.telegram.sendMessage(
        SUPPORT_CHAT_ID,
        "✅ Створено новий акаунт Google Workspace:\n" +
          `👤 ${state.data.lastName} ${state.data.firstName}\n` +
          `🏢 Підрозділ: ${state.data.department}\n` +
          `📧 Email: ${email}\n` +
          `🔑 Пароль: ${newPassword}`,
      );
    } catch (err) {
      console.error("❌ Помилка створення акаунта:", err.message);
      await ctx.reply(
        "⚠️ Не вдалося створити акаунт автоматично. Заявку передано системному адміністратору.\n" +
          `Причина: ${err.message}`,
        Markup.removeKeyboard(),
      );

      await ctx.telegram.sendMessage(
        SUPPORT_CHAT_ID,
        "❌ Не вдалося автоматично створити акаунт Google Workspace:\n" +
          `👤 ${state.data.lastName} ${state.data.firstName}\n` +
          `🏢 Підрозділ: ${state.data.department}\n` +
          `🆔 Telegram ID: ${ctx.from.id}\n` +
          `⚠️ Причина: ${err.message}\n\n` +
          "Створіть акаунт вручну і дайте відповідь на це повідомлення (reply) з паролем — його буде надіслано користувачу.",
      );
    }

    return true;
  }

  return false;
};

export { createAccountState, handleCreateAccount, handleCreateAccountDialog };
