const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
let db;

async function connectDB() {
  try {
    if (!MONGO_URI) {
      throw new Error("❌ MONGO_URI is missing in .env file");
    }

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db("focusflow"); // Make sure this matches your DB name

    console.log("✅ Connected to MongoDB Atlas");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1); // Stop the server if DB connection fails
  }
}

function getDB() {
  if (!db) {
    throw new Error("❌ Database not connected yet!");
  }
  return db;
}

module.exports = { connectDB, getDB };
