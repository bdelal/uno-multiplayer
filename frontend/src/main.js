import { createApp } from 'vue'
import './assets/base.css'
import './assets/style.css'
import './assets/main.css'
import App from './App.vue'
import router from './router/index.js'

createApp(App).use(router).mount('#app')
