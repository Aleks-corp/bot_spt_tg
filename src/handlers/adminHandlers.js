import { Ticket } from "../models/ticket.model.js";
import { isAdmin } from "../config/admins.js";

const TYPE_LABELS = {
  reset_mail_password: "Скидання паролю пошти",
  pc_issue: "Проблеми з ПК",
  prog_issue: "Проблеми з програмами",
  printer_issue: "Проблеми з принтером",
  internet_issue: "Проблеми з інтернетом",
  projector_issue: "Проблеми з проектором",
  event_notice: "Повідомлення про захід",
  other_issue: "Інша проблема",
  internal_diagnostic: "Діагностика",
  internal_planned_check: "Планова перевірка",
  internal_equipment_replace: "Заміна обладнання",
  internal_other: "Внутрішнє (інше)",
};

export const handleAdminStats = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

  const tickets = await Ticket.find({ createdAt: { $gte: startOfMonth } }).lean();

  if (tickets.length === 0) {
    return ctx.reply("📊 За поточний місяць заявок ще немає.");
  }

  const counts = {};
  for (const t of tickets) {
    const label = TYPE_LABELS[t.type] || t.type || "Невідомий";
    counts[label] = (counts[label] || 0) + 1;
  }

  const monthName = now.toLocaleString("uk-UA", { month: "long", year: "numeric" });
  const lines = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `• ${label}: ${count}`);

  return ctx.reply(
    `📊 Статистика за ${monthName} (всього: ${tickets.length}):\n\n` + lines.join("\n"),
  );
};

export const handleAdminActiveTickets = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  const tickets = await Ticket.find({ status: { $ne: "Виконано" } })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  if (tickets.length === 0) {
    return ctx.reply("👥 Заявок ще немає.");
  }

  const lines = tickets.map((t, i) => {
    const date = new Date(t.createdAt).toLocaleString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const typeLabel = TYPE_LABELS[t.type] || t.type || "?";
    const name = t.fullName || t.username || `ID ${t.telegramId}`;
    const location = t.location ? ` | ${t.location}` : "";
    return `${i + 1}. [${date}] ${name}${location}\n   ${typeLabel}`;
  });

  return ctx.reply("👥 Останні 15 заявок:\n\n" + lines.join("\n\n"));
};
