import { Markup } from "telegraf";
import { sendTicketAndNotify } from "../utils/ticket.js";

// state: userId -> { step, data }
const userState = new Map();

const handleNewTicket = (ctx) => {
  userState.set(ctx.from.id, {
    step: "WAIT_MAIN_TYPE",
    data: {},
  });

  return ctx.reply(
    "Оберіть, будь ласка, що у вас сталося:",
    Markup.keyboard([
      ["🔑 Скинути пароль пошти"],
      ["💻 Комп’ютер", "📦 Програми"],
      ["🖨️ Принтер", "🌐 Інтернет / Wi‑Fi"],
      ["🎥 Проектор / телевізор"],
      ["❓ Інше питання"],
    ])
      .resize()
      .oneTime(),
  );
};

// допоміжні функції
const askName = (ctx, state) => {
  state.step = "WAIT_NAME";
  userState.set(ctx.from.id, state);
  return ctx.reply(
    "Введіть, будь ласка, ваше прізвище та ім'я.",
    Markup.removeKeyboard(),
  );
};

const askPlace = (ctx, state) => {
  state.step = "WAIT_PLACE";
  userState.set(ctx.from.id, state);
  return ctx.reply(
    "Введіть, будь ласка, місце розташування (кабінет, корпус).",
    Markup.removeKeyboard(),
  );
};

const handleTicketDialog = async (ctx) => {
  if (ctx.chat.type !== "private") return;

  // Якщо це команда — пропускаємо
  if (ctx.message.entities?.some((e) => e.type === "bot_command")) {
    return;
  }

  const state = userState.get(ctx.from.id);
  if (!state) return;

  const text = ctx.message.text.trim();

  //
  // 1) ВИБІР ОСНОВНОГО ТИПУ
  //
  if (state.step === "WAIT_MAIN_TYPE") {
    let type = null;
    if (text === "🔑 Скинути пароль пошти") type = "reset_mail_password";
    else if (text === "💻 Комп’ютер") type = "pc_issue";
    else if (text === "📦 Програми") type = "prog_issue";
    else if (text === "🖨️ Принтер") type = "printer_issue";
    else if (text === "🌐 Інтернет / Wi‑Fi") type = "internet_issue";
    else if (text === "🎥 Проектор / телевізор") type = "projector_issue";
    else if (text === "❓ Інше питання") type = "other_issue";

    if (!type) {
      return ctx.reply("Будь ласка, оберіть один із варіантів на клавіатурі.");
    }

    state.data.type = type;

    // Пароль — одразу логін пошти
    if (type === "reset_mail_password") {
      state.step = "WAIT_MAIL_INFO";
      userState.set(ctx.from.id, state);

      return ctx.reply(
        "Введіть, будь ласка, логін пошти — без @oano.ukr.education.",
        Markup.removeKeyboard(),
      );
    }

    // Інше питання — одразу опис
    if (type === "other_issue") {
      state.step = "WAIT_PROBLEM_DETAILS_OTHER";
      userState.set(ctx.from.id, state);

      return ctx.reply(
        "Опишіть, будь ласка, ваше питання або проблему.",
        Markup.removeKeyboard(),
      );
    }

    // Інші типи — підтипи
    state.step = "WAIT_SUBTYPE";
    userState.set(ctx.from.id, state);

    if (type === "pc_issue") {
      return ctx.reply(
        "Що саме з комп’ютером?",
        Markup.keyboard([
          ["📴 Не вмикається", "🐢 Працює повільно"],
          ["🧊 Зависає / синій екран"],
          ["⌨️ Миша / клавіатура / інше обладнання"],
          ["📎 Інше з комп’ютером"],
          ["⬅️ Назад"],
        ])
          .resize()
          .oneTime(),
      );
    }

    if (type === "prog_issue") {
      return ctx.reply(
        "З якою програмою проблема?",
        Markup.keyboard([
          ["📞 Zoom", "📄 Office"],
          ["🌐 Браузер (Chrome / Opera)"],
          ["📘 Електронний журнал / сайт"],
          ["📌 Інша програма"],
          ["⬅️ Назад"],
        ])
          .resize()
          .oneTime(),
      );
    }

    if (type === "printer_issue") {
      return ctx.reply(
        "Що саме з принтером?",
        Markup.keyboard([
          ["⛔ Не друкує", "🧃 Закінчився тонер / фарба"],
          ["📄 Застрягає папір", "🖼️ Погана якість друку"],
          ["📌 Інше з принтером"],
          ["⬅️ Назад"],
        ])
          .resize()
          .oneTime(),
      );
    }

    if (type === "internet_issue") {
      return ctx.reply(
        "Що саме з інтернетом / Wi‑Fi?",
        Markup.keyboard([
          ["🖥️ Немає інтернету на комп’ютері"],
          ["📶 Проблема з Wi‑Fi"],
          ["🐌 Дуже повільний інтернет"],
          ["🌍 Не відкриває сайти / сервіси"],
          ["📌 Інше з інтернетом"],
          ["⬅️ Назад"],
        ])
          .resize()
          .oneTime(),
      );
    }

    if (type === "projector_issue") {
      return ctx.reply(
        "Що саме з проектором / телевізором?",
        Markup.keyboard([
          ["⛔ Не вмикається", "🚫 Немає зображення"],
          ["🔌 Немає сигналу з комп’ютера"],
          ["🎚️ Дуже темне / нечітке зображення"],
          ["📌 Інша проблема"],
          ["⬅️ Назад"],
        ])
          .resize()
          .oneTime(),
      );
    }
  }

  //
  // 1а) ЛОГІН ПОШТИ
  //
  if (state.step === "WAIT_MAIL_INFO") {
    state.data.mailInfo = text;
    // далі питаємо ПІБ
    return askName(ctx, state);
  }

  //
  // 2) ПІДТИП ДЛЯ ПОЛОМОК
  //
  if (state.step === "WAIT_SUBTYPE") {
    state.data.subtype = text;

    if (text === "⬅️ Назад") {
      // повертаємось до вибору основного типу
      state.step = "WAIT_MAIN_TYPE";
      state.data.type = null;
      state.data.subtype = null;
      userState.set(ctx.from.id, state);

      return ctx.reply(
        "Оберіть, будь ласка, що у вас сталося:",
        Markup.keyboard([
          ["🔑 Скинути пароль пошти"],
          ["💻 Комп’ютер", "📦 Програми"],
          ["🖨️ Принтер", "🌐 Інтернет / Wi‑Fi"],
          ["🎥 Проектор / телевізор"],
          ["❓ Інше питання"],
        ])
          .resize()
          .oneTime(),
      );
    }

    // якщо обрали один із "інших" підтипів — просимо опис
    const isOtherSubtype =
      text === "📎 Інше з комп’ютером" ||
      text === "📌 Інша програма" ||
      text === "📌 Інше з принтером" ||
      text === "📌 Інше з інтернетом";

    if (isOtherSubtype) {
      state.step = "WAIT_PROBLEM_DETAILS_AFTER_SUBTYPE";
      userState.set(ctx.from.id, state);

      return ctx.reply(
        "Опишіть, будь ласка, проблему детальніше.",
        Markup.removeKeyboard(),
      );
    }

    // для всіх інших підтипів одразу питаємо місце
    return askPlace(ctx, state);
  }

  // 2б) ОПИС ДЛЯ "ІНШИХ" ПІДТИПІВ (ПК/програми/принтер/інтернет)
  if (state.step === "WAIT_PROBLEM_DETAILS_AFTER_SUBTYPE") {
    state.data.problemDetails = text;
    // далі як для звичайних поломок: місце → ПІБ
    return askPlace(ctx, state);
  }

  //
  // 3) МІСЦЕ (КАБІНЕТ / КОРПУС)
  //
  if (state.step === "WAIT_PLACE") {
    state.data.location = text;
    return askName(ctx, state);
  }

  //
  // 4) ПІБ
  //
  if (state.step === "WAIT_NAME") {
    state.data.fullName = text;

    state.step = "FINALIZE";
    userState.set(ctx.from.id, state);

    await sendTicketAndNotify(ctx, state);
    userState.delete(ctx.from.id);
    return;
  }
};

export { userState, handleNewTicket, handleTicketDialog };
