import { Markup } from "telegraf";
import { sendTicketAndNotify } from "../utils/ticket.js";
import { isAdmin } from "../config/admins.js";
import { askName, askRoomPlace, askBuildingPlace } from "./dialogHelpers.js";

// state: userId -> { step, data }
const adminTicketState = new Map();

const handleAdminNewTicket = (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  adminTicketState.set(ctx.from.id, {
    step: "WAIT_ADMIN_TYPE",
    data: {},
  });

  return ctx.reply(
    "Оберіть тип внутрішньої заявки:",
    Markup.keyboard([
      ["🔍 Діагностика обладнання"],
      ["🗓️ Планова перевірка"],
      ["🖨️ Заміна принтера", "💻 Заміна ПК / ноутбука"],
      ["📝 Заявка від користувача"],
      ["📌 Внутрішнє (інше)"],
    ])
      .resize()
      .oneTime(),
  );
};

const handleAdminTicketDialog = async (ctx) => {
  if (ctx.chat.type !== "private") return false;
  if (!isAdmin(ctx.from.id)) return false;

  const state = adminTicketState.get(ctx.from.id);
  if (!state) return false;

  const text = ctx.message.text.trim();

  if (state.step === "WAIT_ADMIN_TYPE") {
    let type = null;
    if (text === "🔍 Діагностика обладнання") type = "internal_diagnostic";
    else if (text === "🗓️ Планова перевірка") type = "internal_planned_check";
    else if (text === "🖨️ Заміна принтера") type = "internal_printer_replace";
    else if (text === "💻 Заміна ПК / ноутбука") type = "internal_pc_replace";
    else if (text === "📝 Заявка від користувача") type = "internal_other";
    else if (text === "📌 Внутрішнє (інше)") type = "internal_other";

    if (!type) {
      return ctx.reply("Будь ласка, оберіть один із варіантів на клавіатурі.");
    }

    state.data.type = type;
    state.data.subtype = text;

    if (type === "internal_printer_replace") {
      state.step = "WAIT_ADMIN_EQUIPMENT_TYPE";
      adminTicketState.set(ctx.from.id, state);

      return ctx.reply(
        "Який саме принтер потрібно замінити?",
        Markup.keyboard([
          ["🖨️ Принтер Kyocera", "🖨️ Принтер Brother"],
          ["🖨️ Принтер HP LaserJet"],
          ["📌 Інше обладнання"],
        ])
          .resize()
          .oneTime(),
      );
    }

    if (type === "internal_pc_replace") {
      state.step = "WAIT_ADMIN_EQUIPMENT_TYPE";
      adminTicketState.set(ctx.from.id, state);

      return ctx.reply(
        "Що саме потрібно замінити?",
        Markup.keyboard([
          ["💻 ПК", "💻 Ноутбук"],
          ["📌 Інше обладнання"],
        ])
          .resize()
          .oneTime(),
      );
    }

    state.step = "WAIT_ADMIN_DETAILS";
    adminTicketState.set(ctx.from.id, state);

    return ctx.reply(
      "Опишіть, будь ласка, деталі заявки.",
      Markup.removeKeyboard(),
    );
  }

  if (state.step === "WAIT_ADMIN_EQUIPMENT_TYPE") {
    state.data.subtype = text;
    state.step = "WAIT_ADMIN_DETAILS";
    adminTicketState.set(ctx.from.id, state);

    return ctx.reply(
      "Опишіть, будь ласка, деталі (стан обладнання, причина заміни тощо).",
      Markup.removeKeyboard(),
    );
  }

  if (state.step === "WAIT_ADMIN_DETAILS") {
    state.data.problemDetails = text;
    return askBuildingPlace(ctx, state, adminTicketState);
  }

  if (state.step === "WAIT_BUILDING_PLACE") {
    state.data.building = text;
    return askRoomPlace(ctx, state, adminTicketState);
  }

  if (state.step === "WAIT_ROOM_PLACE") {
    state.data.room = text;
    return askName(ctx, state, adminTicketState);
  }

  if (state.step === "WAIT_NAME") {
    state.data.fullName = text;
    state.step = "FINALIZE";
    adminTicketState.set(ctx.from.id, state);

    await sendTicketAndNotify(ctx, state);
    adminTicketState.delete(ctx.from.id);
    return true;
  }

  return false;
};

export { adminTicketState, handleAdminNewTicket, handleAdminTicketDialog };
