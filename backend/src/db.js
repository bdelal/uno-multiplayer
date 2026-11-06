// backend/db.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const connectMongo = async () => {
  // Während der Jest-Tests keine Verbindung herstellen
  if (process.env.NODE_ENV === 'test') {
    return
  }
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/uno'
  try {
    await mongoose.connect(uri)
    console.log('MongoDB verbunden')
  } catch (err) {
    console.error('MongoDB Fehler:', err.message)
    process.exit(1)
  }
}

export { connectMongo }