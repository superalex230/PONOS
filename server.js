import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static("public"));

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

const wss = new WebSocketServer({ server });
const rooms = new Map();

function getRoom(name) {
  if (!rooms.has(name)) {
    rooms.set(name, new Set());
  }
  return rooms.get(name);
}

wss.on("connection", (socket) => {
  let roomName = null;

  socket.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (error) {
      console.error("Invalid JSON message", error);
      return;
    }

    if (message.type === "join") {
      roomName = message.room;
      const room = getRoom(roomName);
      room.add(socket);
      return;
    }

    if (!roomName) {
      return;
    }

    const room = getRoom(roomName);
    for (const client of room) {
      if (client !== socket && client.readyState === client.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  });

  socket.on("close", () => {
    if (!roomName) {
      return;
    }
    const room = getRoom(roomName);
    room.delete(socket);
    if (room.size === 0) {
      rooms.delete(roomName);
    }
  });
});
