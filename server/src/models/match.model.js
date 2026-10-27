import mongoose from "mongoose";
 
const MATCH_STATUS = ["waiting", "in_progress", "completed"];
 
const matchSchema = new mongoose.Schema(
  {
    player1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    player2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: MATCH_STATUS,
        message: "Status must be waiting, in_progress, or completed",
      },
      default: "waiting",
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

matchSchema.index({ status: 1, endsAt: 1 });

const Match = mongoose.model("Match", matchSchema);

export default Match;