import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions, 
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import passkeyRepository from "../repositories/PasskeyRepository.js";
import userRepository from "../repositories/UserRepository.js";
import jwt from "jsonwebtoken";

// Merkt sich kurzfristig die "Challenge" (Zufallswert) pro Nutzer,
// zwischen dem Moment "Registrierung starten" und "Registrierung abschließen"
const pendingRegistrations = new Map();

// Diese Werte müssen zu tatsächlichen Domain passen.
// "localhost" für lokale Entwicklung.
const rpID = "localhost";
const rpName = "Uno Project";

/**
 * SCHRITT A der Registrierung.
 * Erzeugt eine "Challenge" (Zufallswert), die der Browser gleich signieren muss,
 * um zu beweisen, dass wirklich ein echtes Gerät antwortet (kein Replay-Angriff).
 */
export async function startRegistration(userId, username) {
  const userPasskeys = passkeyRepository.findByUserId(userId);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: username,
    // Bereits vorhandene Passkeys ausschließen, damit man nicht doppelt
    // denselben Passkey für denselben Nutzer registriert
    excludeCredentials: userPasskeys.map((pk) => ({
      id: pk.id,
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred", // "preferred" statt "required", damit auch PIN ohne Biometrie akzeptiert wird
    },
  });

  // Challenge zwischenspeichern, um sie in Schritt B wieder zu prüfen
  pendingRegistrations.set(userId, options.challenge);

  return options;
}

/**
 * SCHRITT B der Registrierung.
 * Wird aufgerufen, nachdem der Browser die Challenge signiert hat.
 * Prüft die Signatur und speichert den neuen Passkey in der Datenbank.
 */
export async function finishRegistration(userId, response) {
  const expectedChallenge = pendingRegistrations.get(userId);
  if (!expectedChallenge) {
    throw new Error("Keine laufende Registrierung gefunden oder abgelaufen");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: "http://localhost:5173", // muss zur Frontend-URL passen
    expectedRPID: rpID,
  });

  if (!verification.verified) {
    throw new Error("Passkey-Registrierung konnte nicht verifiziert werden");
  }

  pendingRegistrations.delete(userId); // Challenge ist verbraucht

  const { credential } = verification.registrationInfo;

  // Den neuen Passkey in der Datenbank speichern
  passkeyRepository.create(
    credential.id,
    userId,
    Buffer.from(credential.publicKey).toString("base64"),
  );

  return { success: true };
}



  // separater Speicher für Login-Challenges (getrennt von Registrierungs-Challenges)
  const pendingLogins = new Map();

/**
 * SCHRITT A des Logins.
 * Erzeugt eine neue Challenge, die der Browser mit einem vorhadenen
 * Passkey signieren muss.
 *
 * Anders als bei der Registrierung wissen wir hier noch nicht genau,
 * wer sich einloggen will-> deshalb ohne konkreten Nutzer, einfach eine allgemeine Challenge.
 */
export async function startLogin() {
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
  });

  // Challenge unter sich selbst speichern (kein Nutzer bekannt, deshalb
  // die Challenge selbst als Schlüssel nutzen)
  pendingLogins.set(options.challenge, true);

  return options;
}

/**
 * SCHRITT B des Logins.
 * Der Browser hat die Challenge mit einem gespeicherten Passkey signiert.
 * herausfinden: zu welchem Passkey (und damit: zu welchem Nutzer) gehört diese Antwort? Und ist die Signatur echt?
 */
export async function finishLogin(response) {
  // Die Antwort des Browsers enthält die ID des benutzten Passkeys
  const passkey = passkeyRepository.findById(response.id);
  if (!passkey) {
    throw new Error("Unbekannter Passkey");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: (challenge) => pendingLogins.has(challenge), // prüft, ob wir diese Challenge kennen
    expectedOrigin: "http://localhost:5173",
    expectedRPID: rpID,
    credential: {
      id: passkey.id,
      publicKey: Buffer.from(passkey.public_key, "base64"),
      counter: passkey.counter,
    },
  });

  if (!verification.verified) {
    throw new Error("Passkey-Login konnte nicht verifiziert werden");
  }

  // Counter aktualisieren (Schutz gegen geklonte Passkeys)
  passkeyRepository.updateCounter(passkey.id, verification.authenticationInfo.newCounter);

  // Zugehörigen Nutzer aus der DB holen
  const user = userRepository.findById(passkey.user_id);

  // Eigenen JWT ausstellen, genau wie bei den anderen Login-Wegen
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || "supersecret",
    { expiresIn: "1d" }
  );

  return {
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  };
}
