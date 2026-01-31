import { Markup } from "telegraf";

const startBot = (ctx) => {
  return ctx.reply(
    "Вітаю! Це бот техпідтримки.\nНатисніть кнопку, щоб залишити заявку.",
    Markup.keyboard([["📝 Нова заявка"]]).resize(),
  );
};
export default startBot;
