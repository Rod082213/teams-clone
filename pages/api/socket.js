// pages/api/socket.js
import { Server } from "socket.io";

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    console.log("*First use, starting Socket.IO");
    const io = new Server(res.socket.server);

    io.on("connection", (socket) => {
      console.log("A user connected:", socket.id);

      // Your existing server.js logic goes here.
      // Example:
      socket.on("send-message", (obj) => {
        io.emit("receive-message", obj);
      });

      socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
      });
    });

    res.socket.server.io = io;
  } else {
    console.log("Socket.IO already running");
  }
  res.end();
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default ioHandler;