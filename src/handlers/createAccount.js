import { Markup } from "telegraf";
import { DEPARTMENT_TREE } from "../config/departments.js";
import { createWorkspaceUser } from "../services/googleWorkspace.js";

const SUPPORT_CHAT_ID = Number(process.env.SUPPORT_CHAT_ID);

// state: adminId -> { step, data }
const createAccountState = new Map();

function toKeyboard(labels) {
  const rows = [];
  for (let i = 0; i < labels.length; i += 2) {
    rows.push(labels.slice(i, i + 2));
  }
  rows.push(["⬅️ Скасувати"]);
  return Markup.keyboard(rows).resize().oneTime();
}

function topLevelKeyboard() {
  return toKeyboard(DEPARTMENT_TREE.map((item) => item.label));
}

function childrenKeyboard(parent) {
  return toKeyboard(parent.children.map((item) => item.label));
}

const handleCreateAccount = (ctx) => {
  createAccountState.set(ctx.from.id, { step: "WAIT_LASTNAME", data: {} });

  return ctx.reply(
    "Введіть, будь ласка, прізвище нового користувача.",
    Markup.removeKeyboard(),
  );
};

async function finalizeAccount(ctx, state, { label, orgUnitPath }) {
  state.data.departmentLabel = label;
  createAccountState.delete(ctx.from.id);

  try {
    const { email, newPassword } = await createWorkspaceUser({
      firstName: state.data.firstName,
      lastName: state.data.lastName,
      department: label,
      orgUnitPath,
    });

    await ctx.reply(
      "✅ Акаунт створено!\n\n" +
        `👤 ${state.data.lastName} ${state.data.firstName}\n` +
        `🏢 Підрозділ: ${label}\n` +
        `📧 Email: ${email}\n` +
        `🔑 Пароль: ${newPassword}\n\n` +
        "⚠️ Нікому не передавайте цей пароль.",
      Markup.removeKeyboard(),
    );

    await ctx.telegram.sendMessage(
      SUPPORT_CHAT_ID,
      "✅ Створено новий акаунт Google Workspace:\n" +
        `👤 ${state.data.lastName} ${state.data.firstName}\n` +
        `🏢 Підрозділ: ${label}\n` +
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
        `🏢 Підрозділ: ${label}\n` +
        `🆔 Telegram ID: ${ctx.from.id}\n` +
        `⚠️ Причина: ${err.message}\n\n` +
        "Створіть акаунт вручну і дайте відповідь на це повідомлення (reply) з паролем — його буде надіслано користувачу.",
    );
  }
}

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
    return ctx.reply("Оберіть підрозділ:", topLevelKeyboard());
  }

  if (state.step === "WAIT_DEPARTMENT") {
    const match = DEPARTMENT_TREE.find((item) => item.label === text);
    if (!match) {
      return ctx.reply(
        "Будь ласка, оберіть підрозділ зі списку на клавіатурі.",
        topLevelKeyboard(),
      );
    }

    if (match.children) {
      state.step = "WAIT_SUBDEPARTMENT";
      state.data.parentLabel = match.label;
      createAccountState.set(ctx.from.id, state);
      return ctx.reply(`Оберіть підрозділ у "${match.label}":`, childrenKeyboard(match));
    }

    return finalizeAccount(ctx, state, match);
  }

  if (state.step === "WAIT_SUBDEPARTMENT") {
    const parent = DEPARTMENT_TREE.find(
      (item) => item.label === state.data.parentLabel,
    );
    const match = parent?.children.find((item) => item.label === text);
    if (!match) {
      return ctx.reply(
        "Будь ласка, оберіть підрозділ зі списку на клавіатурі.",
        childrenKeyboard(parent),
      );
    }

    return finalizeAccount(ctx, state, {
      label: `${parent.label} / ${match.label}`,
      orgUnitPath: match.orgUnitPath,
    });
  }

  return false;
};

export { createAccountState, handleCreateAccount, handleCreateAccountDialog };
