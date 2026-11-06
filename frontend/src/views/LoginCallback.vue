<template>
  <div class="callback">
    <p v-if="error">Login fehlgeschlagen. <router-link to="/login">Zurück zum Login</router-link></p>
    <p v-else>Wird angemeldet...</p>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const error = ref(false);

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const userJson = params.get("user");

  if (!token || !userJson) {
    error.value = true;
    return;
  }

  sessionStorage.setItem("token", token);
  sessionStorage.setItem("user", userJson);

  router.push("/");
});
</script>