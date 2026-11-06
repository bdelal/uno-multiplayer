import authService from "../services/AuthService.js";
import * as oidcService from "../services/OidcService.js";      
import { AuthenticationError } from "../errors/AppError.js";

// Benutzer registrieren
export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Validierung
    if (!username || !email || !password) {
  return res.status(400).json({
    error: { message: "Username, Email und Passwort erforderlich" },
  });
}

    const user = await authService.register(username, email, password);

    res.status(201).json({
      message: "Registrierung erfolgreich",
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Benutzer anmelden
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validierung
   if (!email || !password) {
  return res.status(400).json({
    error: { message: "Email und Passwort erforderlich" },
  });
}

    const result = await authService.login(email, password);

    res.status(200).json({
      message: "Login erfolgreich",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }}
 // Google-Login starten: leitet den Browser zu Googles Login-Seite weiter
export const googleLogin = async (req, res, next) => {
  try {
    const url = await oidcService.getAuthorizationUrl();
    res.redirect(url);
  } catch (error) {
    next(error);
  }
};

// Google leitet hierher zurück (mit ?code=...&state=... im Query-String)
export const googleCallback = async (req, res, next) => {
  try {
    if (req.query.error) {
      throw new AuthenticationError("Google-Login wurde abgebrochen oder abgelehnt.");
    }
    const currentUrl = new URL(req.originalUrl, `${req.protocol}://${req.get("host")}`);
    const { state } = req.query;
    const { token, user } = await oidcService.handleCallback(currentUrl, state);
    // Zurück zum Vue-Frontend, Token + User als Query-Params mitgeben
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const params = new URLSearchParams({
      token,
      user: JSON.stringify(user),
    });
    res.redirect(`${frontendUrl}/login/callback?${params.toString()}`);
  } catch (error) {
    console.error("Google-Login Fehler:", error);
    console.error("Query von Google:", req.query);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/login?error=google_login_failed`);
  }
};