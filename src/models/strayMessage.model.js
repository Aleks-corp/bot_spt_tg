import mongoose from "mongoose";

// Повідомлення, які юзер написав боту напряму, без /start і без вибору
// кнопки "Нове звернення". Зберігаємо для статистики (показати на
// ректораті, хто ігнорує кнопки) — сама заявка при цьому все одно
// оформлюється через звичайний Ticket-флоу.
const strayMessageSchema = new mongoose.Schema(
  {
    telegramId: Number,
    username: String,
    fullName: String,
    text: String,
  },
  { timestamps: true },
);

export const StrayMessage = mongoose.model("StrayMessage", strayMessageSchema);
