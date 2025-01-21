import express from "express";
import {
  createGroup,
  getGroup,
  updateGroup,
  addMember,
  removeMember,
} from "../controllers/groupController";
import { auth } from "../middleware/auth";

const router = express.Router();

router.post("/", auth, createGroup);
router.get("/:groupId", auth, getGroup);
router.put("/:groupId", auth, updateGroup);
router.post("/:groupId/members", auth, addMember);
router.delete("/:groupId/members/:userId", auth, removeMember);

export default router;
