import express from "express";
import { loginUser, registerUser,getCurrentUser,logoutUser } from "../controllers/user.controllers.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register",registerUser)
router.post("/login",loginUser)
router.get("/me", protect,getCurrentUser)
router.post("/logout", logoutUser)
export default router