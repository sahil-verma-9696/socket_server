const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const {connectDB} = require("./config/db");
const setupSockets = require("./sockets/socketHandlers");
const routes = require("./routes/index");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Connect to MongoDB
connectDB();

// Setup Socket.IO
setupSockets(io);

// Use routes
app.use("/", routes);

app.get("/", (req, res) => {
  res.send("Welcome to Chat App API");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
