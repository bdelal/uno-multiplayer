import jwt from 'jsonwebtoken'

// Auth Middleware
// Prüft ob ein gültiger Token vorhanden ist
// Wird vor geschützten Routen ausgeführt

export const authenticate = (req, res, next) => {
  try {
    // Token aus dem Header lesen
    // Frontend schickt: Authorization: Bearer <token>
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Kein Token vorhanden – bitte einloggen' 
      })
    }

    // "Bearer token123" → nur "token123" nehmen
    const token = authHeader.split(' ')[1]

    // Token prüfen – ist er gültig und nicht abgelaufen?
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // userId und role in req.user speichern
    // damit spätere Controller wissen wer der Benutzer ist
    req.user = decoded

    // Weiter zum nächsten Middleware oder Controller
    next()

  } catch (error) {
    // Token ist ungültig oder abgelaufen
    return res.status(401).json({ 
      error: 'Token ungültig oder abgelaufen' 
    })
  }
}

// Rolle Middleware
// Prüft ob der Benutzer die richtige Rolle hat
// wie nur Admins dürfen Spiele löschen
export const requireRole = (role) => {
  return (req, res, next) => {
    // req.user wurde von authenticate() gesetzt
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Nicht eingeloggt' 
      })
    }

    // Hat der Benutzer die richtige Rolle?
    if (req.user.role !== role) {
      return res.status(403).json({ 
        // 403 = Forbidden –> man darf nicht
        error: 'Keine Berechtigung' 
      })
    }

    next()
  }
}