import Database from "better-sqlite3";

const db = new Database("users.db");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT, 
    google_id TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'user'
);
`);

//Tabelle für Passkeys. Ein Nutzer kann mehrere Passkeys haben
db.exec(`
CREATE TABLE IF NOT EXISTS passkeys (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    device_name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
`);

export default db;