// export-tickets.js
import "dotenv/config";
import fs from "fs";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

function parseRange() {
  const range = process.env.EXPORT_RANGE; // формат: MM.YYYY-MM.YYYY
  if (!range) {
    throw new Error(
      "EXPORT_RANGE is not set. Expected format: MM.YYYY-MM.YYYY (e.g. 02.2026-03.2026)",
    );
  }

  const [fromStr, toStr] = range.split("-");
  if (!fromStr || !toStr) {
    throw new Error("Invalid EXPORT_RANGE format. Use MM.YYYY-MM.YYYY");
  }

  const [fromMonthStr, fromYearStr] = fromStr.split(".");
  const [toMonthStr, toYearStr] = toStr.split(".");

  const fromMonth = Number(fromMonthStr) - 1; // 0–11
  const fromYear = Number(fromYearStr);
  const toMonth = Number(toMonthStr) - 1;
  const toYear = Number(toYearStr);

  if (
    !Number.isFinite(fromMonth) ||
    !Number.isFinite(fromYear) ||
    !Number.isFinite(toMonth) ||
    !Number.isFinite(toYear)
  ) {
    throw new Error("Invalid EXPORT_RANGE numbers. Use MM.YYYY-MM.YYYY");
  }

  const start = new Date(fromYear, fromMonth, 1);
  // кінець – перший день наступного місяця після toMonth/toYear
  const end = new Date(
    toYear,
    toMonth + 1, // наступний місяць
    1,
  );

  return {
    start,
    end,
    fromYear,
    fromMonth: fromMonth + 1,
    toYear,
    toMonth: toMonth + 1,
  };
}

async function run() {
  const { start, end, fromYear, fromMonth, toYear, toMonth } = parseRange();

  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "oano_bot");
  const tickets = db.collection("tickets");

  const docs = await tickets
    .find({ createdAt: { $gte: start, $lt: end } })
    .sort({ createdAt: 1 })
    .toArray();

  const headers = [
    "createdAt",
    "type",
    "subtype",
    "printer",
    "fullName",
    "telegramId",
    "username",
    "location",
    "mailLogin",
    "details",
  ];

  const escape = (value) => {
    if (value == null) return "";
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines = [];
  lines.push(headers.join(";"));

  for (const t of docs) {
    lines.push(
      [
        t.createdAt?.toISOString() || "",
        t.type || "",
        t.subtype || "",
        t.printer || "",
        t.fullName || "",
        t.telegramId || "",
        t.username || "",
        t.location || "",
        t.mailLogin || "",
        t.details || "",
      ]
        .map(escape)
        .join(";"),
    );
  }

  const filename = `tickets-${fromYear}-${String(fromMonth).padStart(
    2,
    "0",
  )}_to_${toYear}-${String(toMonth).padStart(2, "0")}.csv`;
  fs.writeFileSync(filename, lines.join("\n"), "utf8");
  console.log(`Saved ${docs.length} tickets to ${filename}`);

  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
