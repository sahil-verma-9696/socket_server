const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");
const http = require("http"); // Import HTTP module
const { Server } = require("socket.io");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server and attach Express app
const server = http.createServer(app); // Attach Express to the server

const io = new Server(server, {
  cors: {
    origin: "*", // Allow frontend access
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB Atlas
let db, tasksCollection, labelsCollection;
async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db("focusflow"); // Replace with your DB name
    tasksCollection = db.collection("tasks"); // Collection for tasks
    labelsCollection = db.collection("labels"); // Collection for labels
    console.log("✅ Connected to MongoDB Atlas");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
  }
}

connectDB();

// Socket setup
const users = new Map(); // { workspaceId: Map<socketId, username> }
const workspaceStores = new Map(); // Store latest state for each workspace

io.on("connection", (socket) => {
  const { workspaceId, username } = socket.handshake.query;

  if (workspaceId && username) {
    if (!users.has(workspaceId)) {
      users.set(workspaceId, new Map());
    }

    const userMap = users.get(workspaceId);

    // ✅ Ensure only the new socket is kept without force disconnecting the old one
    for (const [existingSocketId, existingUsername] of userMap.entries()) {
      if (existingUsername === username) {
        console.log(
          `♻️ Replacing old connection for ${username} in workspace ${workspaceId}`
        );
        userMap.delete(existingSocketId); // Just remove from map, don't disconnect forcefully
      }
    }

    // ✅ Add new user connection
    userMap.set(socket.id, username);
    socket.join(workspaceId);

    console.log(`👥 ${username} joined workspace: ${workspaceId}`);

    // 🔹 Debugging: Print before emitting
    console.log(
      `🚀 Emitting updateUsers event with:`,
      Array.from(userMap.entries())
    );

    // 🔴 Emit updated user list to all users in the workspace
    io.to(workspaceId).emit("updateUsers", Array.from(userMap.entries()));

    console.log(
      `📌 Current users in ${workspaceId}:`,
      Array.from(userMap.entries())
    );
  } else {
    console.log("❌ Connection rejected: Missing username or workspaceId");
    socket.disconnect();
  }

  // Handle user disconnect
  socket.on("disconnect", () => {
    if (users.has(workspaceId)) {
      const userMap = users.get(workspaceId);
      if (userMap.has(socket.id)) {
        console.log(
          `🔴 ${userMap.get(socket.id)} left workspace: ${workspaceId}`
        );
        userMap.delete(socket.id);

        // 🔹 Debugging: Print before emitting
        console.log(
          `🚀 Emitting updateUsers event after disconnect with:`,
          Array.from(userMap.entries())
        );

        io.to(workspaceId).emit("updateUsers", Array.from(userMap.entries()));

        if (userMap.size === 0) {
          users.delete(workspaceId);
        }
      }
    }
  });
});

// Root Route
app.get("/", (req, res) => {
  res.send("FocusFlow Backend is Running...");
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
