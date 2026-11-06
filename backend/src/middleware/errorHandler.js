/**
 * Error Handler Middleware
 * 
 * Zentrale Fehlerbehandlung für alle Requests
 * Wird am Ende als Middleware verwendet: app.use(errorHandler)
 * 
 * Gibt standardisierte Error Responses zurück
 */

import { AppError } from '../errors/AppError.js'

export const errorHandler = (err, req, res, next) => {
  // Default Werte
  let statusCode = 500
  let message = 'Interner Server Fehler'
  let isOperational = false

  // Wenn es unser AppError ist
  if (err instanceof AppError) {
    statusCode = err.statusCode
    message = err.message
    isOperational = err.isOperational
  } else if (err instanceof SyntaxError && 'body' in err) {
    // JSON Parse Error
    statusCode = 400
    message = 'Ungültige JSON Eingabe'
    isOperational = true
  } else {
    // Unerwarteter Error
    console.error('Unerwarteter Error:', err)
    message = 'Ein unerwarteter Fehler ist aufgetreten'
  }

  // Response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  })
}

/**
 * 404 Handler - wird vor errorHandler mounted
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route nicht gefunden: ${req.method} ${req.path}`,
      statusCode: 404
    }
  })
}
