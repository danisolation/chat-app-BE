import { Request, Response } from "express";
import Message, { IMessage, IReaction } from "../models/Message";
import path from "path";
import mongoose from "mongoose";
import { toObjectId } from "../utils/objectId";
import User from "../models/User";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    }).sort("timestamp");

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages", error });
  }
};

export const sendFileMessage = async (req: Request, res: Response) => {
  try {
    const { receiver } = req.body;
    const sender = (req as any).user.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const fileUrl = `/uploads/${file.filename}`;

    const message: IMessage = new Message({
      sender,
      receiver,
      content: fileUrl,
      type: "file",
    });
    await message.save();

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Error sending file message", error });
  }
};

export const getFile = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "..", "..", "uploads", filename);
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving file", error });
  }
};

export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = (req as any).user.id;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: userId } },
      { new: true }
    );

    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: "Error marking message as read", error });
  }
};

export const addReaction = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = (req as any).user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    const reaction: IReaction = {
      user: new mongoose.Types.ObjectId(userId),
      emoji,
    };
    message.reactions.push(reaction);
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: "Error adding reaction", error });
  }
};

export const removeReaction = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = (req as any).user.id;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { $pull: { reactions: { user: userId } } },
      { new: true }
    );

    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: "Error removing reaction", error });
  }
};

export const replyToMessage = async (req: Request, res: Response) => {
  try {
    const { parentMessageId } = req.params;
    const { content, receiver, group } = req.body;
    const sender = (req as any).user.id;

    const parentMessage = await Message.findById(parentMessageId);
    if (!parentMessage) {
      res.status(404).json({ message: "Parent message not found" });
      return;
    }

    const replyMessage: IMessage = new Message({
      sender,
      receiver,
      group,
      content,
      parentMessage: parentMessageId,
    });

    await replyMessage.save();

    parentMessage.threadMessages.push(toObjectId(replyMessage.id));
    await parentMessage.save();

    res.status(201).json(replyMessage);
  } catch (error) {
    res.status(500).json({ message: "Error replying to message", error });
  }
};

export const getThreadMessages = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId).populate({
      path: "threadMessages",
      populate: { path: "sender", select: "username" },
    });

    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    res.status(200).json(message.threadMessages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching thread messages", error });
  }
};

export const searchMessages = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    const userId = (req as any).user.id;

    if (typeof query !== "string") {
      res.status(400).json({ message: "Invalid search query" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const messages = await Message.find(
      {
        $and: [
          { $text: { $search: query } },
          {
            $or: [
              { sender: userId },
              { receiver: userId },
              { group: { $in: user.groups } },
            ],
          },
        ],
      },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .populate("sender", "username")
      .populate("receiver", "username")
      .populate("group", "name")
      .limit(20);

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error searching messages", error });
  }
};

export const editMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = (req as any).user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: "Không tìm thấy tin nhắn" });
      return;
    }

    if (message.sender.toString() !== userId) {
      res
        .status(403)
        .json({ message: "Bạn không có quyền chỉnh sửa tin nhắn này" });
      return;
    }

    if (!message.originalContent) {
      message.originalContent = message.content;
    }

    message.content = content;
    message.editedAt = new Date();
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi chỉnh sửa tin nhắn", error });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = (req as any).user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ message: "Không tìm thấy tin nhắn" });
      return;
    }

    if (message.sender.toString() !== userId) {
      res.status(403).json({ message: "Bạn không có quyền xóa tin nhắn này" });
      return;
    }

    message.isDeleted = true;
    message.content = "Tin nhắn này đã bị xóa";
    await message.save();

    res.status(200).json({ message: "Tin nhắn đã được xóa" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa tin nhắn", error });
  }
};

export const forwardMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { receiverId, groupId } = req.body;
    const senderId = (req as any).user.id;

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      res.status(404).json({ message: "Không tìm thấy tin nhắn gốc" });
      return;
    }

    const forwardedMessage: IMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      group: groupId,
      content: originalMessage.content,
      forwardedFrom: originalMessage._id,
    });

    await forwardedMessage.save();

    res.status(201).json(forwardedMessage);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi chuyển tiếp tin nhắn", error });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { receiver, group, content } = req.body;
    const sender = (req as any).user.id;

    // Chuyển đổi Markdown thành HTML và làm sạch
    const htmlContent = sanitizeHtml(await marked(content), {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ["src", "alt"],
      },
    });

    const message: IMessage = new Message({
      sender,
      receiver,
      group,
      content: htmlContent,
    });

    await message.save();

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi gửi tin nhắn", error });
  }
};

export const sendVoiceMessage = async (req: Request, res: Response) => {
  try {
    const { receiver, group } = req.body;
    const sender = (req as any).user.id;
    const voiceFile = req.file;

    if (!voiceFile) {
      res.status(400).json({ message: "Không tìm thấy file âm thanh" });
      return;
    }

    const voiceUrl = `/uploads/voice/${voiceFile.filename}`;

    const message: IMessage = new Message({
      sender,
      receiver,
      group,
      content: voiceUrl,
      contentType: "voice",
      voiceUrl,
    });

    await message.save();

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi gửi tin nhắn thoại", error });
  }
};

export const sendLocationMessage = async (req: Request, res: Response) => {
  try {
    const { receiver, group, latitude, longitude } = req.body;
    const sender = (req as any).user.id;

    const message: IMessage = new Message({
      sender,
      receiver,
      group,
      content: "Vị trí đã được chia sẻ",
      contentType: "location",
      location: { latitude, longitude },
    });

    await message.save();

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi gửi vị trí", error });
  }
};
