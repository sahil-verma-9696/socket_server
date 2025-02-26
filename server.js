const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const { connectDB } = require("./config/db");
const setupSockets = require("./sockets/socketHandlers");
const routes = require("./routes/index");
const session = require("express-session");

dotenv.config();
const app = express();
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // 🛑 Localhost pe HTTP use ho raha hai, toh isko false rakho
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
  path: "/socket.io/", // Important for correct path handling
});

// Connect to MongoDB
connectDB();

// Setup Socket.IO
setupSockets(io);

// Use routes
app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("FocusFlow Backend is Running...");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
