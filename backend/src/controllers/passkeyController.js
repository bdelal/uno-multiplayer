import * as passkeyService from "../services/PasskeyService.js";

/**
 * SCHRITT A: Registrierung starten.
 * Wird aufgerufen, wenn ein eingeloggter Nutzer auf "Passkey einrichten" klickt.
 * Gibt eine "Challenge"-> Zufallswert zurück, die der Browser gleich
 * mit seinem geheimen Schlüssel signieren muss
 * -> das beweist später, dass wirklich sein Gerät geantwortet hat, und niemand eine alte
 * Antwort einfach nochmal abspielt (sogenannter "Replay-Angriff").
 */
export const startRegistration = async (req, res, next) => {
  try {
    // req.user kommt von der authenticate-Middleware (Nutzer ist eingeloggt)
    const options = await passkeyService.startRegistration(
      req.user.id,
      req.user.username || `user_${req.user.id}`
    );
    res.status(200).json(options);
  } catch (error) {
    next(error);
  }
};

/**
 * SCHRITT B: Registrierung abschließen.
 * Der Browser hat die Challenge signiert und schickt die Antwort hierher.
 * Wir prüfen die Signatur und speichern den neuen Passkey in der DB.
 */
export const finishRegistration = async (req, res, next) => {
  try {
    const result = await passkeyService.finishRegistration(req.user.id, req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const startLogin = async (req, res, next) => {
  try {
    const options = await passkeyService.startLogin();
    res.status(200).json(options);
  } catch (error) {
    next(error);
  }
};

export const finishLogin = async (req, res, next) => {
  try {
    const result = await passkeyService.finishLogin(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};