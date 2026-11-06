import * as client from "openid-client";
import jwt from "jsonwebtoken";
import userRepository from "../repositories/UserRepository.js";

// Speichert laufende Login-Versuche zwischen (state -> nonce/codeVerifier)
const pendingLogins = new Map();

let oidcConfig = null;

// Baut die Verbindung zu Google einmalig auf, indem Googles Konfiguration
// automatisch geladen wird
async function getConfig() {
  if (oidcConfig) return oidcConfig;
  oidcConfig = await client.discovery(
    new URL(process.env.OIDC_ISSUER),
    process.env.OIDC_CLIENT_ID,
    process.env.OIDC_CLIENT_SECRET
  );
  return oidcConfig;
}

// Schritt 1: Login-URL erzeugen, zu der der Nutzer weitergeleitet wird
export async function getAuthorizationUrl() {
  const config = await getConfig();

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();
  const nonce = client.randomNonce();

  pendingLogins.set(state, { nonce, codeVerifier, createdAt: Date.now() });

  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account", //Kontoauswahl zu zeigen
  });

  return url.href;
}

// Schritt 2: wird aufgerufen, wenn Google den Nutzer zurückschickt.
// currentUrl = die komplette Callback-URL inkl. Query-String (?code=...&state=...)
export async function handleCallback(currentUrl, receivedState) {
  const config = await getConfig();

  const pending = pendingLogins.get(receivedState);
  if (!pending) throw new Error("Ungültiger oder abgelaufener Login-Versuch");
  pendingLogins.delete(receivedState);

  // Tauscht den Code gegen Tokens ein, prüft dabei state/nonce/PKCE automatisch
  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: pending.codeVerifier,
    expectedState: receivedState,
    expectedNonce: pending.nonce,
  });

  // Verifizierte Nutzerdaten aus dem ID-Token
  const claims = tokens.claims(); // claims.sub, claims.email, claims.name, ...

  let user = userRepository.findByGoogleId(claims.sub);
  if (!user) {
    const username = claims.email.split("@")[0] + "_" + claims.sub.slice(0, 6);
    const role = (claims.email === process.env.ADMIN_EMAIL) ? "admin" : "user"; 
    user = userRepository.createGoogleUser(username, claims.email, claims.sub, role); // Rolle übergeben
  }

  // Eigenen JWT erstellen, genau wie beim normalen Login
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || "supersecret",
    { expiresIn: "1d" } //expiresIn: "10m"
  );

  return {
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  };
}