import express from "express";
import {
  createUser,
  loginUser,
  getUsers,
  generateKeys,
  blockUser,
  unblockUser,
} from "../controllers/userController";
import { auth } from "../middleware/auth";

const router = express.Router();

router.post("/register", createUser);
router.post("/login", loginUser);
router.get("/", auth, getUsers);
router.post("/generate-keys", auth, generateKeys);
router.post("/block/:blockedUserId", auth, blockUser);
router.post("/unblock/:blockedUserId", auth, unblockUser);

export default router;
