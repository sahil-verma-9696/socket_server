const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
let db;
let client;

async function connectDB() {
  try {
    if (!MONGO_URI) {
      throw new Error("❌ MONGO_URI is missing in .env file");
    }

    client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    await client.connect();
    db = client.db("focusflow"); // Ensure this matches your DB name

    console.log("✅ Connected to MongoDB Atlas");
    return db; // Return db instance after successful connection
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1); // Exit process if DB connection fails
  }
}

function getDB() {
  if (!db) {
    throw new Error("❌ Database not connected yet! Call `connectDB()` first.");
  }
  return db;
}

// Graceful shutdown to close DB connection when server stops
process.on("SIGINT", async () => {
  if (client) { 
    await client.close();
    console.log("🛑 MongoDB connection closed.");
    process.exit(0);
  }
});

module.exports = { connectDB, getDB };
