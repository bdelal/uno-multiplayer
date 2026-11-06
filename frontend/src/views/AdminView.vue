<template>
  <div class="admin-page">
    <h1>Admin-Bereich</h1>
    <router-link to="/">← Zurück zur Startseite</router-link>

    <p v-if="error" class="error">{{ error }}</p>

    <table v-if="users.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>Username</th>
          <th>Email</th>
          <th>Rolle</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.id }}</td>
          <td>{{ u.username }}</td>
          <td>{{ u.email }}</td>
          <td>{{ u.role }}</td>
          <td>
            <button v-if="u.role !== 'admin'" @click="promote(u)">
              Zu Admin machen
            </button>
            <button v-else @click="demote(u)">
              Adminrechte entziehen
            </button>
            <button @click="remove(u)">Löschen</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>Keine Benutzer gefunden.</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAllUsers, deleteUserById, updateUserRoleById } from '../services/unoapi.service.js'

const users = ref([])
const error = ref('')

// aktualisiert die Nutzerliste vom Backend
async function loadUsers() {
  error.value = ''
  try {
    users.value = await getAllUsers()
  } catch (e) {
    error.value = e.message
  }
}

async function promote(user) {
  try {
    await updateUserRoleById(user.id, 'admin')
    await loadUsers() // Liste danach neu laden, damit die Anzeige aktuell ist
  } catch (e) {
    error.value = e.message
  }
}

async function demote(user) {
  try {
    await updateUserRoleById(user.id, 'user')
    await loadUsers()
  } catch (e) {
    error.value = e.message
  }
}

async function remove(user) {
  if (!confirm(`Nutzer "${user.username}" wirklich löschen?`)) return
  try {
    await deleteUserById(user.id)
    await loadUsers()
  } catch (e) {
    error.value = e.message
  }
}

onMounted(loadUsers)
</script>
