import express from "express";
import {
  sendMessage,
  getMessages,
  sendFileMessage,
  markMessageAsRead,
  getFile,
  addReaction,
  removeReaction,
  replyToMessage,
  getThreadMessages,
  searchMessages,
  editMessage,
  deleteMessage,
  forwardMessage,
  sendVoiceMessage,
  sendLocationMessage,
} from "../controllers/messageController";
import { auth } from "../middleware/auth";
import upload from "../middleware/upload";

const router = express.Router();

router.post("/", auth, sendMessage);
router.get("/:otherUserId", auth, getMessages);
router.post("/file", auth, upload.single("file"), sendFileMessage);
router.post("/:messageId/read", auth, markMessageAsRead);
router.get("/file/:filename", auth, getFile);
router.post("/:messageId/reaction", auth, addReaction);
router.delete("/:messageId/reaction", auth, removeReaction);
router.post("/:parentMessageId/reply", auth, replyToMessage);
router.get("/:messageId/thread", auth, getThreadMessages);
router.get("/search", auth, searchMessages);
router.put("/:messageId", auth, editMessage);
router.delete("/:messageId", auth, deleteMessage);
router.post("/:messageId/forward", auth, forwardMessage);

// Thêm các routes mới
router.post("/voice", auth, upload.single("voice"), sendVoiceMessage);
router.post("/location", auth, sendLocationMessage);

export default router;
