import app from "./app";
import http from "http";
import { Server, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "./models/Message";
import User from "./models/User";
import Group from "./models/Group";
import Poll from "./models/Poll";
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

const PORT = process.env.PORT || 3000;

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

io.use((socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };
    socket.userId = decoded.id;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", async (socket: AuthenticatedSocket) => {
  console.log("A user has connected");

  if (socket.userId) {
    await User.findByIdAndUpdate(socket.userId, { status: "online" });
    io.emit("userStatusChange", { userId: socket.userId, status: "online" });
  }

  socket.on("join", (userId: string) => {
    socket.join(userId);
  });

  socket.on("joinGroup", (groupId: string) => {
    socket.join(groupId);
  });

  socket.on(
    "sendMessage",
    async ({
      receiverId,
      groupId,
      content,
      contentType,
      latitude,
      longitude,
      publicKey,
    }) => {
      if (socket.userId) {
        const sender = await User.findById(socket.userId);
        let receiver, group;

        if (receiverId) {
          receiver = await User.findById(receiverId);
        } else if (groupId) {
          group = await Group.findById(groupId);
        }

        if (
          (sender &&
            receiver &&
            !sender.blockedUsers.includes(receiverId) &&
            !receiver.blockedUsers.includes(toObjectId(socket.userId))) ||
          (sender && group)
        ) {
          let messageContent = content;
          const messageContentType = contentType || "text";

          if (contentType === "text") {
            const htmlContent = sanitizeHtml(await marked(content), {
              allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
              allowedAttributes: {
                ...sanitizeHtml.defaults.allowedAttributes,
                img: ["src", "alt"],
              },
            });
            messageContent = await encryptMessage(
              htmlContent,
              JSON.parse(receiver ? receiver.publicKey! : group!.publicKey!)
            );
          }

          const message = new Message({
            sender: socket.userId,
            receiver: receiverId,
            group: groupId,
            content: messageContent,
            contentType: messageContentType,
            location:
              contentType === "location" ? { latitude, longitude } : undefined,
          });
          await message.save();

          if (receiverId) {
            io.to(receiverId).emit("newMessage", message);
          } else if (groupId) {
            io.to(groupId).emit("newMessage", message);
          }
        }
      }
    }
  );

  socket.on("markAsRead", async ({ messageId }) => {
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

  socket.on("typing", ({ receiverId, groupId }) => {
    if (socket.userId) {
      if (receiverId) {
        socket.to(receiverId).emit("userTyping", { userId: socket.userId });
      } else if (groupId) {
        socket
          .to(groupId)
          .emit("userTyping", { userId: socket.userId, groupId });
      }
    }
  });

  socket.on("stopTyping", ({ receiverId, groupId }) => {
    if (socket.userId) {
      if (receiverId) {
        socket
          .to(receiverId)
          .emit("userStoppedTyping", { userId: socket.userId });
      } else if (groupId) {
        socket
          .to(groupId)
          .emit("userStoppedTyping", { userId: socket.userId, groupId });
      }
    }
  });

  socket.on("pinMessage", async ({ messageId }) => {
    if (socket.userId) {
      const message = await Message.findById(messageId);
      if (message) {
        message.isPinned = !message.isPinned;
        await message.save();

        if (message.receiver) {
          io.to(message.receiver.toString()).emit("messagePinned", {
            messageId,
            isPinned: message.isPinned,
          });
        } else if (message.group) {
          io.to(message.group.toString()).emit("messagePinned", {
            messageId,
            isPinned: message.isPinned,
          });
        }
      }
    }
  });

  socket.on(
    "createPoll",
    async ({ question, options, expiresAt, isMultipleChoice, groupId }) => {
      if (socket.userId) {
        const poll = new Poll({
          creator: socket.userId,
          question,
          options: options.map((option: string) => ({
            text: option,
            votes: [],
          })),
          expiresAt,
          isMultipleChoice,
          group: groupId,
        });
        await poll.save();

        const message = new Message({
          sender: socket.userId,
          group: groupId,
          content: question,
          contentType: "poll",
          pollId: poll._id,
        });
        await message.save();

        io.to(groupId).emit("newPoll", { poll, message });
      }
    }
  );

  socket.on("votePoll", async ({ pollId, optionIndexes }) => {
    if (socket.userId) {
      const poll = await Poll.findById(pollId);
      if (poll) {
        for (const index of optionIndexes) {
          if (index >= 0 && index < poll.options.length) {
            const option = poll.options[index];
            if (!option.votes.includes(toObjectId(socket.userId))) {
              option.votes.push(toObjectId(socket.userId));
            }
          }
        }
        await poll.save();
        io.to(poll.group.toString()).emit("pollUpdated", poll);
      }
    }
  });

  socket.on("disconnect", async () => {
    console.log("A user has disconnected");
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
  console.log(`Server is running on port ${PORT}`);
});
