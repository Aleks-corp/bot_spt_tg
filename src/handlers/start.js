import { Markup } from "telegraf";

const startBot = (ctx) => {
  return ctx.reply(
    "Вітаю! Я бот техпідтримки КЗВО ОАНО 😊\n" +
      "Допоможу передати вашу заявку до системних адміністраторів.\n\n" +
      "Оберіть, будь ласка, що у вас сталося:",
    Markup.keyboard([["📝 Нове звернення"]]).resize(),
  );
};
export default startBot;
