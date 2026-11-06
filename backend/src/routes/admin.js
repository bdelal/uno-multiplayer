import express from "express";
import { getAllUsers, deleteUser, updateUserRole } from "../controllers/adminController.js";
import { authenticate, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Jede Route hier: erst prüfen "eingeloggt?",
// dann prüfen "ist es ein Admin?"
router.get("/users", authenticate, requireRole("admin"), getAllUsers);
router.delete("/users/:id", authenticate, requireRole("admin"), deleteUser);
router.patch("/users/:id/role", authenticate, requireRole("admin"), updateUserRole);

export default router;