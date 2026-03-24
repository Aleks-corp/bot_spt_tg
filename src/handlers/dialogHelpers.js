import { Markup } from "telegraf";
import { userState } from "./newTicket.js";

export const askName = (ctx, state) => {
  state.step = "WAIT_NAME";
  userState.set(ctx.from.id, state);
  return ctx.reply(
    "Введіть, будь ласка, ваше прізвище та ім'я.",
    Markup.removeKeyboard(),
  );
};

export const askPlace = (ctx, state) => {
  state.step = "WAIT_PLACE";
  userState.set(ctx.from.id, state);
  return ctx.reply(
    "Введіть, будь ласка, місце розташування (кабінет, корпус).",
    Markup.removeKeyboard(),
  );
};
