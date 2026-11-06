import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userRepository from "../repositories/UserRepository.js";
import {ValidationError,AuthenticationError} from "../errors/AppError.js";

class AuthService {

    async register(username, email, password) {

        // Prüfen, ob Email bereits existiert
        const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
        throw new ValidationError("Diese E-Mail wird bereits verwendet.");
    }

        const existingUsername = await userRepository.findByUsername(username);
    if (existingUsername) {
        throw new ValidationError("Dieser Benutzername ist bereits vergeben.");
    }

        // Passwort verschlüsseln
        const hashedPassword = await bcrypt.hash(password, 10);


        // Wenn diese E-Mail als ADMIN_EMAIL in der .env eingetragen ist,
        // wird der Account automatisch als "admin" angelegt.
        const role = (email === process.env.ADMIN_EMAIL) ? "admin" : "user";

        // Benutzer speichern
        const user = await userRepository.createUser(
        username,
        email,
        hashedPassword,
        role
    );

        return user;
    }

    async login(email, password) {

        const user = await userRepository.findByEmail(email);
    if (!user) {
        throw new AuthenticationError("Es existiert kein Benutzer mit dieser E-Mail.");
    }

        const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        throw new AuthenticationError("Das Passwort ist falsch.");
    }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET || "supersecret",
            {
                expiresIn: "1d" // expiresIn: "10m"
            }
        );

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        };
    }
}
export default new AuthService();