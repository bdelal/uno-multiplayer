<template>
  <div class="auth-page">
    <div class="auth-container">
      <h1>Registrieren</h1>

      <form @submit.prevent="handleRegister">
        <div class="input-group">
          <label>Benutzername</label>
          <input
            v-model="username"
            type="text"
            placeholder="Benutzername"
            required
          />
        </div>

        <div class="input-group">
          <label>E-Mail</label>
          <input
            v-model="email"
            type="email"
            placeholder="E-Mail"
            required
          />
        </div>

        <div class="input-group">
          <label>Passwort</label>
          <input
            v-model="password"
            type="password"
            placeholder="Passwort"
            required
          />
        </div>

        <button type="submit">
          Registrieren
        </button>

        <p class="error" v-if="error">
          {{ error }}
        </p>

        <p>
          Bereits registriert?
          <router-link to="/login">
            Zum Login
          </router-link>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { register } from "../services/unoapi.service";

const router = useRouter();
const username = ref("");
const email = ref("");
const password = ref("");
const error = ref("");

async function handleRegister() {
  error.value = "";
  try {
    await register(
      username.value,
      email.value,
      password.value
    );
    router.push("/login");
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<style scoped>
/* Exakt dasselbe CSS wie beim funktionierenden Login */
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  box-sizing: border-box;
  padding: 20px;
}

.auth-container {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.input-group {
  display: flex;
  flex-direction: column;
  text-align: left;
}

input, button {
  padding: 10px;
  font-size: 1rem;
  border-radius: 4px;
  box-sizing: border-box;
}

button {
  cursor: pointer;
}

p {
  text-align: center;
}

.error {
  color: red;
  text-align: center;
}
</style>