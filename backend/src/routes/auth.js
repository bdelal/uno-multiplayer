import express from "express";
import { register, login, googleLogin, googleCallback } from "../controllers/authController.js";

const router = express.Router();

// Registrierung
router.post("/register", register);

// Login
router.post("/login", login);

router.get("/google", googleLogin);              
router.get("/google/callback", googleCallback);

export default router;