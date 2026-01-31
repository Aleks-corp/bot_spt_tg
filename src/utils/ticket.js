const SUPPORT_CHAT_ID = Number(process.env.SUPPORT_CHAT_ID);

export async function sendTicketAndNotify(ctx, state) {
  const user = ctx.from;
  const chatTitle = ctx.chat.title || "особистий чат";

  const typeLabel =
    {
      reset_mail_password: "Скидання паролю пошти",
      pc_issue: "Проблеми з ПК",
      printer_issue: "Проблеми з принтером",
      other_issue: "Інша проблема",
    }[state.data.type] || "Невідомий тип";

  let detailsText = "";

  if (state.data.type === "reset_mail_password") {
    detailsText =
      "Тип: Скидання паролю пошти\n" +
      `Пошта: ${state.data.mailInfo || "не вказано"}`;
  } else {
    detailsText =
      `Тип: ${typeLabel}\n` +
      `Деталі: ${state.data.problemDetails || "не вказано"}`;
  }

  const text =
    "Нова заявка:\n" +
    `👤 Від: ${state.data.fullName} (@${user.username || "no_username"})\n` +
    `🆔 Telegram ID: ${user.id}\n` +
    `💬 З чату: ${chatTitle}\n` +
    `🕒 Час: ${new Date().toLocaleString("uk-UA")}\n\n` +
    `${detailsText}`;

  await ctx.reply("Дякуємо! Заявка відправлена до техпідтримки. 👍");

  await ctx.telegram.sendMessage(SUPPORT_CHAT_ID, text);
}
