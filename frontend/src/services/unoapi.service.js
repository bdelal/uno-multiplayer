const BASE_URL = 'http://localhost:3000'
import { startRegistration as webauthnRegister, startAuthentication as webauthnLogin } from '@simplewebauthn/browser'

export async function createLobby(playerName, maxPlayers) {
  const res = await fetch(`${BASE_URL}/lobby/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName, maxPlayers }),
  })
  if (!res.ok) throw new Error('Lobby konnte nicht erstellt werden')
  return res.json()
}

export async function joinLobby(roomCode, playerName) {
  const res = await fetch(`${BASE_URL}/lobby/join/${roomCode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName }),
  })
  if (res.status === 404) throw new Error('Lobby nicht gefunden')
  if (res.status === 400) throw new Error('Lobby ist voll')
  if (!res.ok) throw new Error('Beitreten fehlgeschlagen')
  return res.json()
}

export async function register(username, email, password) {

  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
   throw new Error(
    data.error.message || "Registrierung fehlgeschlagen"
);
  }

  return data;
}

export async function login(email, password) {

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
   throw new Error(
    data.error.message || "Login fehlgeschlagen"
  );
  }

  return data;
}

// Alle Nutzer laden-> nur für Admins (Backend prüft das über requireRole("admin"))
export async function getAllUsers() {
  const token = sessionStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/admin/users`, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Nutzer konnten nicht geladen werden");
  const data = await res.json();
  return data.users;
}

// Nutzer löschen
export async function deleteUserById(id) {
  const token = sessionStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/admin/users/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Nutzer konnte nicht gelöscht werden");
  return res.json();
}

// Rolle eines Nutzers ändern (z.B. "user" -> "admin" oder umgekehrt)
export async function updateUserRoleById(id, role) {
  const token = sessionStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/admin/users/${id}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error("Rolle konnte nicht geändert werden");
  return res.json();
}

// Passkey registrieren (für bereits eingeloggte Nutzer)
export async function registerPasskey(token) {
  // Schritt A: Challenge vom Server holen
  const startRes = await fetch(`${BASE_URL}/passkey/register/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // Login-Token mitschicken, damit der Server weiß, WER sich einen Passkey einrichtet
    },
  })
  const options = await startRes.json()

  // Schritt B: Browser fragt Nutzer nach Fingerabdruck/PIN und erzeugt Schlüsselpaar
  // Das übernimmt komplett die Bibliothek "@simplewebauthn/browser"
  const attestationResponse = await webauthnRegister({ optionsJSON: options })

  // Schritt C: Ergebnis zurück an den Server schicken zur Prüfung/Speicherung
  const finishRes = await fetch(`${BASE_URL}/passkey/register/finish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(attestationResponse),
  })

  if (!finishRes.ok) throw new Error('Passkey-Registrierung fehlgeschlagen')
  return finishRes.json()
}

// Mit Passkey einloggen (für Nutzer, die schon einen Passkey eingerichtet haben)
export async function loginWithPasskey() {
  // Schritt A: Challenge vom Server holen
  const startRes = await fetch(`${BASE_URL}/passkey/login/start`, {
    method: 'POST',
  })
  const options = await startRes.json()

  // Schritt B: Browser fragt Nutzer nach Fingerabdruck/PIN,
  // signiert die Challenge mit dem gespeicherten privaten Schlüssel
 const assertionResponse = await webauthnLogin({ optionsJSON: options })

  // Schritt C: Signatur zur Prüfung an den Server schicken
  const finishRes = await fetch(`${BASE_URL}/passkey/login/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assertionResponse),
  })

  if (!finishRes.ok) throw new Error('Passkey-Login fehlgeschlagen')
  return finishRes.json() // enthält { token, user }
}