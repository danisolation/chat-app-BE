import { Request, Response } from "express";
import User, { IUser } from "../models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateKeyPair } from "../utils/encryption";

//hashedpassWord -> save user -> create token -> return user and token
export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user: IUser = new User({ username, email, password: hashedPassword });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
      expiresIn: "1h",
    });
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
      expiresIn: "1h",
    });
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
};

export const generateKeys = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { publicKey, privateKey } = await generateKeyPair();

    await User.findByIdAndUpdate(userId, {
      publicKey: JSON.stringify(publicKey),
    });

    res.json({ publicKey, privateKey });
  } catch (error) {
    res.status(500).json({ message: "Error generating keys", error });
  }
};

export const blockUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { blockedUserId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { blockedUsers: blockedUserId } },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error blocking user", error });
  }
};

export const unblockUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { blockedUserId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { blockedUsers: blockedUserId } },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error unblocking user", error });
  }
};
