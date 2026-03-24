// utils/export.js
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function getDb() {
  if (!db) {
    await client.connect();
    // важливо: та сама назва бази що і в Mongoose
    db = client.db(process.env.MONGODB_DB || "tickets");
  }
  return db;
}

function parseRange(rangeStr) {
  if (!rangeStr) {
    throw new Error("Параметр range обов'язковий. Формат: MM.YYYY-MM.YYYY");
  }

  const parts = rangeStr.split("-");
  if (parts.length !== 2) {
    throw new Error("Невірний формат. Очікується: MM.YYYY-MM.YYYY");
  }

  const [fromStr, toStr] = parts;
  const [fromMonth, fromYear] = fromStr.split(".").map(Number);
  const [toMonth, toYear] = toStr.split(".").map(Number);

  if (
    !fromMonth ||
    !fromYear ||
    !toMonth ||
    !toYear ||
    fromMonth < 1 ||
    fromMonth > 12 ||
    toMonth < 1 ||
    toMonth > 12
  ) {
    throw new Error("Невірні місяці або роки у параметрі range");
  }

  const start = new Date(fromYear, fromMonth - 1, 1);
  const end = new Date(toYear, toMonth, 1);

  return {
    start,
    end,
    label: `${String(fromMonth).padStart(2, "0")}.${fromYear}_to_${String(toMonth).padStart(2, "0")}.${toYear}`,
  };
}

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

export async function handleExport(req, res) {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const rangeParam = urlObj.searchParams.get("range");

    const { start, end, label } = parseRange(rangeParam);

    const db = await getDb();

    // виведи в лог, щоб перевірити назву колекції
    const collections = await db.listCollections().toArray();
    console.log(
      "Collections in DB:",
      collections.map((c) => c.name),
    );

    const tickets = db.collection("tickets");

    const docs = await tickets
      .find({ createdAt: { $gte: start, $lt: end } })
      .sort({ createdAt: 1 })
      .toArray();

    console.log(`Found ${docs.length} tickets from ${start} to ${end}`);

    // якщо немає заявок — повертаємо 404 з повідомленням
    if (docs.length === 0) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end(
        `За період ${label.replace("_to_", " — ")} заявок не знайдено.`,
      );
    }

    const lines = [headers.join(";")];

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

    const filename = `tickets-${label}.csv`;

    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    res.end(lines.join("\n"));
  } catch (err) {
    console.error("Export error:", err.message);
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Помилка: ${err.message}`);
  }
}
