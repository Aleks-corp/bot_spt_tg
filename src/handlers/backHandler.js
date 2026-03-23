export const backHandler = (state, userState, step) => {
  state.step = step;
  state.data.type = null;
  state.data.printer = null;
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
};
