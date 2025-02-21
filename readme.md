{
    title : "",
    assignee: [], // for assigne same task to multiple person
    status: option [Backlog,Ready,In progress, In review, Done],
    deadline: Date,
    desciption: "",
    creatate At: Date,
    modify At: Date,
}

# Socket connection

# FocusFlow Backend Documentation

## Overview
This backend is built using Node.js and Express, with real-time collaboration support via Socket.io. It connects to MongoDB Atlas for data storage and includes features like workspaces and user presence tracking.

## Tech Stack
- **Node.js**: Backend runtime.
- **Express**: API framework.
- **MongoDB Atlas**: Cloud database.
- **Socket.io**: Real-time communication.
- **Cors**: Handles cross-origin requests.
- **Dotenv**: Manages environment variables.
- **HTTP Module**: Creates an HTTP server for WebSockets.

---

## Code Breakdown

### 1. Dependencies and Configuration
```javascript
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();
```
- **Express**: Used to handle API routes.
- **Cors**: Allows cross-origin requests.
- **Dotenv**: Loads environment variables.
- **MongoDB**: Database connection.
- **HTTP Module**: Enables WebSocket communication.
- **Socket.io**: Real-time updates between clients.

### 2. Server Setup
```javascript
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
```
- **Creates Express App**: Handles API requests.
- **Applies Middleware**: CORS and JSON parsing.
- **Wraps App in HTTP Server**: Required for WebSockets.

### 3. MongoDB Connection
```javascript
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

let db, tasksCollection, labelsCollection;
async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db("focusflow");
    tasksCollection = db.collection("tasks");
    labelsCollection = db.collection("labels");
    console.log("✅ Connected to MongoDB Atlas");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
  }
}
connectDB();
```
- **Reads MongoDB URI from `.env`**.
- **Creates MongoDB Client** and connects asynchronously.
- **Defines Collections** for `tasks` and `labels`.
- **Handles Errors Gracefully**.

### 4. Socket.io Setup
```javascript
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});
```
- **Enables Cross-Origin Requests**.
- **Supports Multiple HTTP Methods**.

### 5. User Management
```javascript
const users = new Map(); // { workspaceId: Map<socketId, username> }
const workspaceStores = new Map(); // Store latest state for each workspace
```
- **`users` Map**: Tracks connected users per workspace.
- **`workspaceStores` Map**: Stores the latest state of workspaces.

### 6. Handling WebSocket Connections
```javascript
io.on("connection", (socket) => {
  const { workspaceId, username } = socket.handshake.query;
```
- **Extracts `workspaceId` and `username` from the connection request**.

#### Handling New User Connection
```javascript
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

    userMap.set(socket.id, username);
    socket.join(workspaceId);
```
- **Checks if `workspaceId` and `username` exist**.
- **Removes old connection for the same user** (if reconnecting), but does not forcefully disconnect them.
- **Adds new user connection to `userMap`**.
- **Joins the workspace room**.

#### Emitting User Updates
```javascript
    io.to(workspaceId).emit("updateUsers", Array.from(userMap.entries()));
```
- **Broadcasts the updated user list to the workspace**.

#### Handling Disconnection
```javascript
  socket.on("disconnect", () => {
    if (users.has(workspaceId)) {
      const userMap = users.get(workspaceId);
      if (userMap.has(socket.id)) {
        userMap.delete(socket.id);
        io.to(workspaceId).emit("updateUsers", Array.from(userMap.entries()));
        if (userMap.size === 0) {
          users.delete(workspaceId);
        }
      }
    }
  });
});
```
- **Removes user on disconnect**.
- **Updates other users in the workspace**.
- **Deletes workspace if empty**.

### 7. Root Route
```javascript
app.get("/", (req, res) => {
  res.send("FocusFlow Backend is Running...");
});
```
- **Provides a simple status check for the backend**.

### 8. Starting the Server
```javascript
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
```
- **Starts Express & WebSocket server** on the given port.

---

## WebSocket Events Table

| Event Name      | Description |
|----------------|-------------|
| `connection`   | Triggered when a new user connects. |
| `updateUsers`  | Broadcasts the list of active users in a workspace. |
| `disconnect`   | Removes a user from the workspace on disconnection. |

---

## Summary
### Features
✔️ **Real-time User Collaboration** using WebSockets.
✔️ **MongoDB Atlas Integration** for data persistence.
✔️ **Cross-Origin Support** for frontend connectivity.
✔️ **Automatic Reconnection Handling** for users.
✔️ **Scalability** with workspaces and real-time updates.

### Next Steps
- **Add Database CRUD Operations** for `tasks` and `labels`.
- **Implement Authentication** for secure access.
- **Optimize WebSocket Performance** with Redis Pub/Sub for scalability.

---

This documentation serves as a guide to understand and extend the FocusFlow backend. 🚀

