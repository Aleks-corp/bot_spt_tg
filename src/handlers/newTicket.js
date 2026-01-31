import { Markup } from "telegraf";
import { sendTicketAndNotify } from "../utils/ticket.js";

// state: userId -> { step, data }
const userState = new Map();

const handleNewTicket = (ctx) => {
  userState.set(ctx.from.id, {
    step: "WAIT_NAME",
    data: {},
  });
  return ctx.reply("Введіть, будь ласка, ваше прізвище та ім'я.");
};

const handleTicketDialog = async (ctx) => {
  if (ctx.chat.type !== "private") return;

  // Якщо це команда — пропускаємо
  if (ctx.message.entities?.some((e) => e.type === "bot_command")) {
    return;
  }

  const state = userState.get(ctx.from.id);
  if (!state) return;

  if (state.step === "WAIT_NAME") {
    state.data.fullName = ctx.message.text.trim();
    state.step = "WAIT_TYPE";
    userState.set(ctx.from.id, state);

    return ctx.reply(
      "Оберіть тип проблеми:",
      Markup.keyboard([
        ["🔑 Скинути пароль пошти"],
        ["💻 Проблеми з ПК"],
        ["🖨️ Проблеми з принтером"],
        ["❓ Інша проблема"],
      ])
        .oneTime()
        .resize(),
    );
  }

  if (state.step === "WAIT_TYPE") {
    const text = ctx.message.text;

    let type = null;
    if (text === "🔑 Скинути пароль пошти") type = "reset_mail_password";
    else if (text === "💻 Проблеми з ПК") type = "pc_issue";
    else if (text === "🖨️ Проблеми з принтером") type = "printer_issue";
    else if (text === "❓ Інша проблема") type = "other_issue";

    if (!type) {
      return ctx.reply("Будь ласка, оберіть один із варіантів кнопками нижче.");
    }

    state.data.type = type;

    if (type === "reset_mail_password") {
      state.step = "WAIT_MAIL_INFO";
      userState.set(ctx.from.id, state);

      return ctx.reply(
        "Уточніть, будь ласка, адресу пошти (якщо у вас декілька) або залиште поле порожнім, якщо поштова скринька одна.",
      );
    } else {
      state.step = "WAIT_PROBLEM_DETAILS";
      userState.set(ctx.from.id, state);

      return ctx.reply(
        "Опишіть, будь ласка, проблему та вкажіть кабінет, де знаходиться робоче місце (щоб адмін міг підійти).",
      );
    }
  }

  if (state.step === "WAIT_MAIL_INFO") {
    state.data.mailInfo = ctx.message.text.trim();
    state.step = "FINALIZE";
    userState.set(ctx.from.id, state);

    await sendTicketAndNotify(ctx, state);
    userState.delete(ctx.from.id);
    return;
  }

  if (state.step === "WAIT_PROBLEM_DETAILS") {
    state.data.problemDetails = ctx.message.text.trim();
    state.step = "FINALIZE";
    userState.set(ctx.from.id, state);

    await sendTicketAndNotify(ctx, state);
    userState.delete(ctx.from.id);
    return;
  }
};

export { handleNewTicket, handleTicketDialog };
