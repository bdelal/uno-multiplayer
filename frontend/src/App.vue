<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import UserMenu from './components/UserMenu.vue'

const route = useRoute()
const showMenu = computed(() => route.path !== '/login'  && route.name !== 'game')
</script>

<template>
  <div class="app-shell">
    <header class="app-header" v-if="showMenu">
      <UserMenu />
    </header>

    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  overflow: hidden;
}

body {
  background: #1a1a2e;
  color: #f0f0f0;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.app-shell {
  height: 100dvh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  background: rgba(10, 5, 40, 0.8);
  border-bottom: 1px solid rgba(150, 120, 255, 0.2);
  backdrop-filter: blur(10px);
}

.app-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>