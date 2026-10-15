import { Markup } from "telegraf";
import { Ticket } from "../models/ticket.model.js";
import { StrayMessage } from "../models/strayMessage.model.js";
import { isAdmin } from "../config/admins.js";

export const exportState = new Map();

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
  internal_printer_replace: "Заміна принтера",
  internal_pc_replace: "Заміна ПК / ноутбука",
  internal_user_request: "Заявка від користувача",
  internal_other: "Внутрішнє (інше)",
};

function parseMonthYear(str) {
  const match = str.trim().match(/^(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const year = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { month, year };
}

const escape = (value) => {
  if (value == null) return "";
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
};

async function generateCsv(start, end) {
  const [tickets, strayMessages] = await Promise.all([
    Ticket.find({ createdAt: { $gte: start, $lt: end } }).lean(),
    StrayMessage.find({ createdAt: { $gte: start, $lt: end } }).lean(),
  ]);

  const rows = [
    ...tickets.map((t) => ({
      createdAt: t.createdAt,
      type: TYPE_LABELS[t.type] || t.type || "",
      subtype: t.subtype || "",
      printer: t.printer || "",
      fullName: t.fullName || "",
      telegramId: t.telegramId || "",
      username: t.username ? `@${t.username}` : "",
      location: t.location || "",
      mailLogin: t.mailLogin || "",
      details: t.details || "",
      status: t.status || "",
      adminReply: t.adminReply || "",
    })),
    ...strayMessages.map((m) => ({
      createdAt: m.createdAt,
      type: "Повідомлення без заявки",
      subtype: "",
      printer: "",
      fullName: m.fullName || "",
      telegramId: m.telegramId || "",
      username: m.username ? `@${m.username}` : "",
      location: "",
      mailLogin: "",
      details: m.text || "",
      status: "",
      adminReply: "",
    })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (!rows.length) return null;

  const headers = [
    "Дата",
    "Тип",
    "Підтип",
    "Принтер",
    "ПІБ",
    "Telegram ID",
    "Username",
    "Місце",
    "Логін пошти",
    "Деталі",
    "Статус",
    "Відповідь адміна",
  ];

  const lines = [headers.join(";")];

  for (const r of rows) {
    lines.push(
      [
        r.createdAt ? new Date(r.createdAt).toLocaleString("uk-UA") : "",
        r.type,
        r.subtype,
        r.printer,
        r.fullName,
        r.telegramId,
        r.username,
        r.location,
        r.mailLogin,
        r.details,
        r.status,
        r.adminReply,
      ]
        .map(escape)
        .join(";"),
    );
  }

  return { csv: lines.join("\n"), count: rows.length };
}

export const handleAdminExport = (ctx) => {
  if (!isAdmin(ctx.from.id)) return;

  exportState.set(ctx.from.id, { step: "WAIT_FROM" });

  return ctx.reply(
    "Введіть початковий місяць і рік (формат: 03.2026):",
    Markup.removeKeyboard(),
  );
};

export const handleExportDialog = async (ctx) => {
  if (ctx.chat.type !== "private") return false;
  if (!isAdmin(ctx.from.id)) return false;

  const state = exportState.get(ctx.from.id);
  if (!state) return false;

  const text = ctx.message.text.trim();

  if (state.step === "WAIT_FROM") {
    const parsed = parseMonthYear(text);
    if (!parsed) {
      return ctx.reply("Невірний формат. Введіть у вигляді MM.YYYY, наприклад: 03.2026");
    }

    state.from = parsed;
    state.step = "WAIT_TO";
    exportState.set(ctx.from.id, state);

    return ctx.reply("Введіть кінцевий місяць і рік (формат: 03.2026):");
  }

  if (state.step === "WAIT_TO") {
    const parsed = parseMonthYear(text);
    if (!parsed) {
      return ctx.reply("Невірний формат. Введіть у вигляді MM.YYYY, наприклад: 03.2026");
    }

    const start = new Date(Date.UTC(state.from.year, state.from.month - 1, 1));
    const end = new Date(Date.UTC(parsed.year, parsed.month, 1));

    if (end <= start) {
      return ctx.reply("Кінцева дата має бути пізніше початкової. Введіть кінцевий місяць ще раз:");
    }

    exportState.delete(ctx.from.id);

    await ctx.reply("Генерую файл...", Markup.removeKeyboard());

    const result = await generateCsv(start, end);

    if (!result) {
      return ctx.reply("За вказаний період заявок не знайдено.");
    }

    const fromLabel = `${String(state.from.month).padStart(2, "0")}.${state.from.year}`;
    const toLabel = `${String(parsed.month).padStart(2, "0")}.${parsed.year}`;
    const filename = `tickets-${fromLabel}-${toLabel}.csv`;

    return ctx.replyWithDocument(
      { source: Buffer.from("﻿" + result.csv, "utf-8"), filename },
      { caption: `Знайдено заявок: ${result.count}` },
    );
  }

  return false;
};
