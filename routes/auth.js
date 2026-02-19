import express from "express";
import { register, login, verifyOTP,updateUser } from "../controllers/authController.js";
import { updatePassword } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js"; 
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.put('/update-profile', protect, updateUser);
router.put("/update-password", protect, updatePassword);
router.post("/verify-otp", verifyOTP);

export default router;
 