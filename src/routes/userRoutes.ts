import express from "express";
import {
  createUser,
  loginUser,
  getUsers,
  generateKeys,
  blockUser,
  unblockUser,
  updateProfile,
  updateAvatar,
} from "../controllers/userController";
import { auth } from "../middleware/auth";
import upload from "../middleware/upload";

const router = express.Router();

router.post("/register", createUser);
router.post("/login", loginUser);
router.get("/", auth, getUsers);
router.post("/generate-keys", auth, generateKeys);
router.post("/block/:blockedUserId", auth, blockUser);
router.post("/unblock/:blockedUserId", auth, unblockUser);
router.put("/profile", auth, updateProfile);
router.put("/avatar", auth, upload.single("avatar"), updateAvatar);
export default router;
