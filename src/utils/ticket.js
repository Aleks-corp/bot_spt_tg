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
    }[state.data.type] || "Невідомий тип";

  let detailsText = "";

  if (state.data.type === "reset_mail_password") {
    detailsText =
      "Тип: Скидання паролю пошти\n" +
      `Логін: ${state.data.mailInfo || "не вказано"}\n` +
      "Домен: @oano.ukr.education";
  } else {
    detailsText =
      `Тип: ${typeLabel}\n` +
      (state.data.subtype ? `Підтип: ${state.data.subtype}\n` : "") +
      (state.data.location ? `Місце: ${state.data.location}\n` : "") +
      `Деталі: ${state.data.problemDetails || "не вказано"}`;
  }

  const text =
    "Нова заявка:\n" +
    `👤 Від: ${state.data.fullName || "не вказано"} (@${user.username || "no_username"})\n` +
    `🆔 Telegram ID: ${user.id}\n` +
    `💬 З чату: ${chatTitle}\n` +
    `🕒 Час: ${new Date().toLocaleString("uk-UA")}\n\n` +
    detailsText;

  await ctx.reply("Дякуємо! Заявка відправлена до техпідтримки. 👍");

  await ctx.telegram.sendMessage(SUPPORT_CHAT_ID, text);
}
