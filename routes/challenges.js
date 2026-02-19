import express from "express";
import { getTodayChallenge, completeTodayChallenge, getAllChallenges } from "../controllers/challengeController.js";
import { protect } from "../middleware/authMiddleware.js"; 

const router = express.Router();

router.get("/today", protect, getTodayChallenge);
router.post("/complete", protect, completeTodayChallenge);
router.get("/all", protect, getAllChallenges);

export default router;