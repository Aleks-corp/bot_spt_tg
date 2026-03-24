// db.js
import mongoose from "mongoose";
import "dotenv/config";

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("❌ MONGODB_URI is not set");
  process.exit(1);
}

export async function connectDB() {
  await mongoose.connect(uri, {
    // опції за потреби
  });
  console.log("✅ Connected to MongoDB via Mongoose");
}

export async function closeDB() {
  await mongoose.connection.close();
  console.log("🛑 MongoDB connection closed");
}
