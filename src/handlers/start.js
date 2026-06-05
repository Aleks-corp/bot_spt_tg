import { Markup } from "telegraf";
import { isAdmin } from "../config/admins.js";

const startBot = (ctx) => {
  if (isAdmin(ctx.from.id)) {
    return ctx.reply(
      "Вітаю! Панель адміністратора техпідтримки КЗВО ОАНО.\n\nОберіть дію:",
      Markup.keyboard([
        ["📝 Нове звернення"],
        ["📋 Внутрішня заявка"],
        ["👥 Активні заявки", "📊 Статистика"],
        ["📥 Експорт CSV"],
      ]).resize(),
    );
  }

  return ctx.reply(
    "Вітаю! Я бот техпідтримки КЗВО ОАНО 😊\n" +
      "Допоможу передати вашу заявку до системних адміністраторів.\n\n" +
      "Оберіть, будь ласка, що у вас сталося:",
    Markup.keyboard([["📝 Нове звернення"]]).resize(),
  );
};
export default startBot;
