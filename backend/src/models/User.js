import mongoose from 'mongoose'

// ─────────────────────────────────────────
// User Schema
// Speichert alle Benutzer in der Datenbank
// ─────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // Eindeutiger Benutzername
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // Email Adresse eindeutig
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    // Passwort wird immer verschlüsselt gespeichert
    // Niemals das echte Passwort speichern
    password: {
      type: String,
      required: true,
    },
    // Rolle des Benutzers
    // 'user' = normaler Spieler
    // 'admin' = Administrator
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    // createdAt und updatedAt werden automatisch gesetzt
    timestamps: true,
  }
)

export default mongoose.model('User', userSchema)