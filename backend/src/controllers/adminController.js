import userRepository from "../repositories/UserRepository.js";
import { NotFoundError, ValidationError } from "../errors/AppError.js";

// Alle Nutzer abrufen
export const getAllUsers = async (req, res, next) => {
  try {
    const users = userRepository.findAll();
    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

// Nutzer löschen
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = userRepository.deleteUser(id);
    if (!deleted) {
      throw new NotFoundError("Nutzer nicht gefunden");
    }
    res.status(200).json({ message: "Nutzer gelöscht" });
  } catch (error) {
    next(error);
  }
};

// Nutzer-Rolle ändern 
export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      throw new ValidationError("Ungültige Rolle");
    }

    const updated = userRepository.updateRole(id, role);
    if (!updated) {
      throw new NotFoundError("Nutzer nicht gefunden");
    }
    res.status(200).json({ message: "Rolle aktualisiert" });
  } catch (error) {
    next(error);
  }
};