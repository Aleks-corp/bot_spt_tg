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

export const askRoomPlace = (ctx, state) => {
  state.step = "WAIT_ROOM_PLACE";
  userState.set(ctx.from.id, state);
  return ctx.reply("Введіть, будь ласка, кабінет.", Markup.removeKeyboard());
};

export const askBuildingPlace = (ctx, state) => {
  state.step = "WAIT_BUILDING_PLACE";
  userState.set(ctx.from.id, state);
  return ctx.reply(
    "Виберіть, будь ласка, корпус",
    Markup.keyboard([
      ["Пл. Милайлівська, 1 корпус"],
      ["Пл. Милайлівська, 2 корпус"],
      ["Пл. Милайлівська, 3 корпус"],
      ["Вул. Лесича 8"],
      ["Вул. Ясиновського 3-А"],
      ["⬅️ Назад"],
    ])
      .resize()
      .oneTime(),
  );
};
