import mongoose, { type Document, Schema } from "mongoose";

export interface IPollOption extends Document {
  text: string;
  votes: mongoose.Types.ObjectId[];
}

export interface IPoll extends Document {
  creator: mongoose.Types.ObjectId;
  question: string;
  options: IPollOption[];
  expiresAt?: Date;
  isMultipleChoice: boolean;
  group: mongoose.Types.ObjectId;
}

const PollOptionSchema: Schema = new Schema({
  text: { type: String, required: true },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

const PollSchema: Schema = new Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    question: { type: String, required: true },
    options: [PollOptionSchema],
    expiresAt: { type: Date },
    isMultipleChoice: { type: Boolean, default: false },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IPoll>("Poll", PollSchema);
