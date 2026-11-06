import db from "../database/database.js";

class PasskeyRepository {
    // Speichert einen neuen Passkey nach erfolgreicher Registrierung
    create(id, userId, publicKey, deviceName = null) {
        const stmt = db.prepare(`
            INSERT INTO passkeys (id, user_id, public_key, counter, device_name)
            VALUES (?, ?, ?, 0, ?)
        `);
        stmt.run(id, userId, publicKey, deviceName);
    }

    // Sucht einen Passkey anhand seiner Credential-ID
    // (wird beim Login gebraucht, um zu prüfen, ob der Passkey bekannt ist)
    findById(id) {
        const stmt = db.prepare(`SELECT * FROM passkeys WHERE id = ?`);
        return stmt.get(id);
    }

    // Gibt alle Passkeys eines Nutzers zurück
    findByUserId(userId) {
        const stmt = db.prepare(`SELECT * FROM passkeys WHERE user_id = ?`);
        return stmt.all(userId);
    }

    // Aktualisiert den "counter" nach jedem erfolgreichen Login.
    // Der counter schützt vor geklonten Passkeys: steigt er nicht ->konsistent an, könnte der Schlüssel dupliziert worden sein.
    updateCounter(id, newCounter) {
        const stmt = db.prepare(`UPDATE passkeys SET counter = ? WHERE id = ?`);
        stmt.run(newCounter, id);
    }

    //Löscht alle Passkeys eines Nutzers 
    deleteByUserId(userId) {
    const stmt = db.prepare(`DELETE FROM passkeys WHERE user_id = ?`);
    stmt.run(userId);
}
}

export default new PasskeyRepository();