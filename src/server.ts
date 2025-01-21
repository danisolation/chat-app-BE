import app from "./app";
import http from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "./models/Message";
import User from "./models/User";
import { encryptMessage, decryptMessage } from "./utils/encryption";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { toObjectId } from "./utils/objectId";

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5001;

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

io.use((socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Lỗi xác thực"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };
    socket.userId = decoded.id;
    next();
  } catch (error) {
    next(new Error("Lỗi xác thực"));
  }
});

io.on("connection", async (socket: AuthenticatedSocket) => {
  console.log("Một người dùng đã kết nối");

  if (socket.userId) {
    await User.findByIdAndUpdate(socket.userId, { status: "online" });
    io.emit("userStatusChange", { userId: socket.userId, status: "online" });
  }

  socket.on("join", (userId: string) => {
    socket.join(userId);
  });

  socket.on("sendMessage", async ({ receiverId, content, publicKey }) => {
    if (socket.userId) {
      const sender = await User.findById(socket.userId);
      const receiver = await User.findById(receiverId);

      if (
        sender &&
        receiver &&
        !sender.blockedUsers.includes(receiverId) &&
        !receiver.blockedUsers.includes(toObjectId(socket.userId))
      ) {
        const htmlContent = sanitizeHtml(await marked(content), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            img: ["src", "alt"],
          },
        });

        const encryptedContent = await encryptMessage(
          htmlContent,
          JSON.parse(receiver.publicKey)
        );

        const message = new Message({
          sender: socket.userId,
          receiver: receiverId,
          content: encryptedContent,
        });
        await message.save();

        io.to(receiverId).emit("newMessage", message);
      }
    }
  });

  socket.on("editMessage", async ({ messageId, content }) => {
    if (socket.userId) {
      const message = await Message.findById(messageId);
      if (message && message.sender.toString() === socket.userId) {
        if (!message.originalContent) {
          message.originalContent = message.content;
        }
        const htmlContent = sanitizeHtml(await marked(content), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            img: ["src", "alt"],
          },
        });
        message.content = htmlContent;
        message.editedAt = new Date();
        await message.save();

        io.to(message.receiver?.toString() || "").emit(
          "messageEdited",
          message
        );
      }
    }
  });

  socket.on("deleteMessage", async ({ messageId }) => {
    if (socket.userId) {
      const message = await Message.findById(messageId);
      if (message && message.sender.toString() === socket.userId) {
        message.isDeleted = true;
        message.content = "Tin nhắn này đã bị xóa";
        await message.save();

        io.to(message.receiver?.toString() || "").emit("messageDeleted", {
          messageId,
        });
      }
    }
  });

  socket.on("forwardMessage", async ({ messageId, receiverId, groupId }) => {
    if (socket.userId) {
      const originalMessage = await Message.findById(messageId);
      if (originalMessage) {
        const forwardedMessage = new Message({
          sender: socket.userId,
          receiver: receiverId,
          group: groupId,
          content: originalMessage.content,
          forwardedFrom: originalMessage._id,
        });
        await forwardedMessage.save();

        io.to(receiverId || groupId).emit(
          "newForwardedMessage",
          forwardedMessage
        );
      }
    }
  });

  socket.on("markMessageAsRead", async ({ messageId }) => {
    if (socket.userId) {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { readBy: socket.userId } },
        { new: true }
      );

      if (message) {
        io.to(message.sender.toString()).emit("messageRead", {
          messageId,
          readBy: socket.userId,
        });
      }
    }
  });

  socket.on("disconnect", async () => {
    console.log("Người dùng đã ngắt kết nối");
    if (socket.userId) {
      await User.findByIdAndUpdate(socket.userId, {
        status: "offline",
        lastSeen: new Date(),
      });
      io.emit("userStatusChange", { userId: socket.userId, status: "offline" });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
});
