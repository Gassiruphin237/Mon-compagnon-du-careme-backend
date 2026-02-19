import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema({
  day_number: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  verse: { type: String, required: true }
});

export default mongoose.model("Challenge", challengeSchema);
