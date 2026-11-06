import express from "express";
import { startRegistration, finishRegistration, startLogin, finishLogin } from "../controllers/passkeyController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// "authenticate" ist unsere Middleware, die prüft, ob im Request ein gültiger
// Login-Token mitgeschickt wird.

// Beide Routen sind geschützt: nur eingeloggte Nutzer dürfen sich
// einen Passkey einrichten 
router.post("/register/start", authenticate, startRegistration);
router.post("/register/finish", authenticate, finishRegistration);

//Login braucht kein authenticate-> weil der Nutzer sich ja gerade erst einloggen will
router.post("/login/start", startLogin);
router.post("/login/finish", finishLogin);

export default router;