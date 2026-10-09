import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    telegramId: Number,
    username: String,
    fullName: String,
    chatTitle: String,

    type: String, // reset_mail_password, pc_issue, printer_issue ...
    subtype: String, // "Не вмикається", "Zoom" тощо
    printer: String, // для принтера
    location: String,
    mailLogin: String,
    details: String,
    eventDescription: String,
    eventDate: String,

    status: { type: String, default: "Нова" }, // Нова | Виконано
    adminReply: String,
    repliedAt: Date,
    autoResolved: { type: Boolean, default: false }, // скинуто автоматично через Google Workspace API

    sourceMessageId: Number, // якщо треба лінкуватись на ориг. повідомлення
  },
  { timestamps: true }, // createdAt / updatedAt
);

export const Ticket = mongoose.model("Ticket", ticketSchema);
