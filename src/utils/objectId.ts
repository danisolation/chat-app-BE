import mongoose from "mongoose";

/**
 * Chuyển string thành ObjectId nếu cần
 */
export const toObjectId = (
  id: string | mongoose.Types.ObjectId
): mongoose.Types.ObjectId => {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
};

/**
 * Chuyển ObjectId thành string (nếu cần)
 */
export const toStringId = (id: string | mongoose.Types.ObjectId): string => {
  return id instanceof mongoose.Types.ObjectId ? id.toString() : id;
};
