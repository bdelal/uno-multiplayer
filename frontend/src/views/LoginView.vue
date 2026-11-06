<template>
  <div class="auth-page">
    <div class="auth-container">
      <h1>Login</h1>

      <form @submit.prevent="handleLogin">
        <div class="input-group">
          <label>E-Mail</label>
          <input
            v-model="email"
            type="email"
            placeholder="E-Mail eingeben"
            required
          />
        </div>

        <div class="input-group">
          <label>Passwort</label>
          <input
            v-model="password"
            type="password"
            placeholder="Passwort eingeben"
            required
          />
        </div>

        <button type="submit">Login</button>

        <p class="error" v-if="error">{{ error }}</p>

        <p>
          Noch keinen Account?
          <router-link to="/register">
            Jetzt registrieren
          </router-link>
        </p>
      </form>
      <div class="divider">oder</div>
      <a class="google-btn" href="http://localhost:3000/auth/google">
        Mit Google anmelden
      </a>
    </div>
    <button type="button" class="google-btn passkey-btn" @click="handlePasskeyLogin">
      Mit Passkey anmelden
    </button>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { login } from "../services/unoapi.service";

const router = useRouter();
const email = ref("");
const password = ref("");
const error = ref("");

async function handleLogin() {
  error.value = "";
  try {
    const result = await login(email.value, password.value);
    sessionStorage.setItem("token", result.token);
    sessionStorage.setItem("user", JSON.stringify(result.user)); // für Admin-Check im Frontend
    router.push("/");
  } catch (err) {
    error.value = err.message;
  }
}
import { loginWithPasskey } from "../services/unoapi.service";

async function handlePasskeyLogin() {
  error.value = "";
  try {
    const result = await loginWithPasskey();
    sessionStorage.setItem("token", result.token);
    sessionStorage.setItem("user", JSON.stringify(result.user));
    router.push("/");
  } catch (err) {
    error.value = "Passkey-Login fehlgeschlagen: " + err.message;
  }
}
</script>