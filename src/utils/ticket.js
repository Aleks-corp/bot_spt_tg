import { Ticket } from "../models/ticket.model.js";

const SUPPORT_CHAT_ID = Number(process.env.SUPPORT_CHAT_ID);

export async function sendTicketAndNotify(ctx, state) {
  const user = ctx.from;
  const chatTitle = ctx.chat.title || "особистий чат";

  const typeLabel =
    {
      reset_mail_password: "Скидання паролю пошти",
      pc_issue: "Проблеми з ПК",
      prog_issue: "Проблеми з програмами (MS Office тощо)",
      printer_issue: "Проблеми з принтером",
      internet_issue: "Проблеми з інтернетом",
      projector_issue: "Проблеми з проектором",
      other_issue: "Інша проблема",
      event_notice: "Повідомлення про захід",
      internal_diagnostic: "Діагностика",
      internal_planned_check: "Планова перевірка",
      internal_equipment_replace: "Заміна обладнання",
      internal_other: "Внутрішнє (інше)",
    }[state.data.type] || "Невідомий тип";

  let detailsText = "";

  const location = [state.data.building, state.data.room]
    .filter(Boolean)
    .join(", кab. ");

  if (state.data.type === "reset_mail_password") {
    detailsText =
      "Тип: Скидання паролю пошти\n" +
      `Логін: ${state.data.mailInfo || "не вказано"}\n` +
      "Домен: @oano.ukr.education";
  } else if (state.data.type === "event_notice") {
    detailsText =
      "Тип: Повідомлення про захід\n" +
      `Опис заходу: ${state.data.eventDescription || "не вказано"}\n` +
      `Дата заходу: ${state.data.eventDate || "не вказано"}\n` +
      (location ? `Місце: ${location}\n` : "");
  } else {
    detailsText =
      `Тип: ${typeLabel}\n` +
      (state.data.subtype ? `Підтип: ${state.data.subtype}\n` : "") +
      (state.data.type === "printer_issue" && state.data.printer
        ? `Принтер: ${state.data.printer}\n`
        : "") +
      (location ? `Місце: ${location}\n` : "") +
      `Деталі: ${state.data.problemDetails || "не вказано"}`;
  }

  const text =
    "Нова заявка:\n" +
    `👤 Від: ${state.data.fullName || "не вказано"} (@${user.username || "no_username"})\n` +
    `🆔 Telegram ID: ${user.id}\n` +
    `💬 З чату: ${chatTitle}\n` +
    `🕒 Час: ${new Date().toLocaleString("uk-UA")}\n\n` +
    detailsText;

  const ticket = await Ticket.create({
    telegramId: user.id,
    username: user.username || null,
    fullName: state.data.fullName || null,
    chatTitle,

    type: state.data.type,
    subtype: state.data.subtype || null,
    printer: state.data.printer || null,
    location: location || null,
    mailLogin: state.data.mailInfo || null,
    details: state.data.problemDetails || null,
    eventDescription: state.data.eventDescription || null,
    eventDate: state.data.eventDate || null,
  });

  await ctx.reply("Дякуємо! Заявка відправлена до техпідтримки. 👍");

  const sent = await ctx.telegram.sendMessage(SUPPORT_CHAT_ID, text);
  await Ticket.findByIdAndUpdate(ticket._id, { sourceMessageId: sent.message_id });
}
