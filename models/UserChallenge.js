import mongoose from "mongoose";

const userChallengeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true 
    },
    day_number: {
      type: Number,
      required: true
    },
    completed: {
      type: Boolean,
      default: true
    },
    completedAt: { 
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export default mongoose.model("UserChallenge", userChallengeSchema);
