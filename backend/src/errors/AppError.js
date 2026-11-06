// backend/src/errors/AppError.js
/**
 * Basis Error Klasse für die gesamte Applikation
 * Alle Custom Errors erben von dieser Klasse
 */
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Wird geworfen wenn Ressource nicht gefunden wird
 * z.B. Spiel nicht gefunden, Spieler nicht gefunden
 */
export class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

/**
 * Wird geworfen wenn Validierung fehlschlägt
 * z.B. Ungültige Spielername, Lobby voll
 */
export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400)
    this.name = 'ValidationError'
  }
}

/**
 * Wird geworfen wenn Authentifizierung fehlschlägt
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentifizierung erforderlich') {
    super(message, 401)
    this.name = 'AuthenticationError'
  }
}

/**
 * Wird geworfen wenn Benutzer keine Berechtigung hat
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Keine Berechtigung') {
    super(message, 403)
    this.name = 'AuthorizationError'
  }
}

/**
 * Wird geworfen bei Spiellogik-Fehlern
 * z.B. Nicht dran, Karte nicht spielbar
 */
export class GameError extends AppError {
  constructor(message) {
    super(message, 400)
    this.name = 'GameError'
  }
}
