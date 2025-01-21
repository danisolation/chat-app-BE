import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "dotenv";
import { connectDB } from "./config/database";
import userRoutes from "./routes/userRoutes";
import messageRoutes from "./routes/messageRoutes";
import groupRoutes from "./routes/groupRoutes";
import path from "path";

config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);

app.get("/", (req, res) => {
  res.send("Chat App API is running");
});

export default app;
