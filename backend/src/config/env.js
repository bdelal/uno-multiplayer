// backend/src/config/env.js
/**
 * Environment Configuration
 * 
 * Zentrale Stelle für alle Umgebungsvariablen
 * Validiert dass alle erforderlichen Variablen gesetzt sind
 */

import dotenv from 'dotenv'

dotenv.config()

const requiredEnvVars = [
  'MONGO_URI',
  'PORT'
]

// Validiere erforderliche Variablen
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
if (missingEnvVars.length > 0) {
  throw new Error(`Fehlende Umgebungsvariablen: ${missingEnvVars.join(', ')}`)
}

export const config = {
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  MONGO_URI: process.env.MONGO_URI,
  
  // CORS
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Auth (Wird später implementiert)
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key',
  OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
  OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
  OIDC_ISSUER: process.env.OIDC_ISSUER
}
