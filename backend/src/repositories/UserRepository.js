import db from "../database/database.js";

class UserRepository {

    createUser(username, email, password, role = "user") {

        const stmt = db.prepare(`
            INSERT INTO users (username, email, password, role)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(username, email, password, role);

        return {
            id: result.lastInsertRowid,
            username,
            email,
            role
        };
    }

    // Legt einen Nutzer an, der sich über Google einloggt hat
    // "password" wird bewusst nicht gesetzt-> die google_id wird gespeichert, um den Nutzer beim nächsten Google-Login wiederzufinden.
    createGoogleUser(username, email, googleId, role = "user") {
        const stmt = db.prepare(`
            INSERT INTO users (username, email, password, google_id, role)
            VALUES (?, ?, NULL, ?, ?)
        `);
        const result = stmt.run(username, email, googleId, role);
        return {
            id: result.lastInsertRowid,
            username,
            email,
            role
        };
    }

    findByEmail(email) {

        const stmt = db.prepare(`
            SELECT * FROM users
            WHERE email = ?
        `);

        return stmt.get(email);
    }

    findByUsername(username) {

        const stmt = db.prepare(`
            SELECT * FROM users
            WHERE username = ?
        `);

        return stmt.get(username);
    }

    // Sucht einen Nutzer anhand seiner Google-ID (statt E-Mail/Username).
    // "Kennen wir diesen Google-Nutzer schon, oder müssen wir ihn neu anlegen?"
    findByGoogleId(googleId) {
        const stmt = db.prepare(`
            SELECT * FROM users
            WHERE google_id = ?
        `);
        return stmt.get(googleId);
    }

    findById(id) {

        const stmt = db.prepare(`
            SELECT * FROM users
            WHERE id = ?
        `);

        return stmt.get(id);
    }

    // alle Nutzer abrufen (für Admin-Übersicht).
    // password und google_id werden nicht ausgewählt, damit sensible Daten nicht ans Frontend gehen.
    findAll() {
        const stmt = db.prepare(`SELECT id, username, email, role FROM users`);
        return stmt.all();
    }

     //Nutzer löschen-> gibt true zurück, wenn wirklich einer gelöscht wurde.
    deleteUser(id) {
        const deletePasskeysStmt = db.prepare(`DELETE FROM passkeys WHERE user_id = ?`);
        deletePasskeysStmt.run(id);

        const stmt = db.prepare(`DELETE FROM users WHERE id = ?`);
        const result = stmt.run(id);
        return result.changes > 0;
    }
     // Rolle eines Nutzers ändern
    updateRole(id, newRole) {
        const stmt = db.prepare(`UPDATE users SET role = ? WHERE id = ?`);
        const result = stmt.run(newRole, id);
        return result.changes > 0;
    }
}

export default new UserRepository();