import { createRouter, createWebHistory } from 'vue-router'
import HomePage  from '../views/HomePage.vue'
import LobbyView from '../views/LobbyView.vue'
import Game from '../views/Game.vue'
import LoginView from "../views/LoginView.vue";
import RegisterView from "../views/RegisterView.vue";
import LoginCallback from "../views/LoginCallback.vue"
import AdminView from "../views/AdminView.vue"

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/lobby/:roomCode',
    name: 'lobby',
    component: LobbyView,
    props: true,
  },
  {
    path: '/game/:roomCode',
    name: 'game',
    component: Game,
    props: true,
  },
{
    path: "/login",
    name: "login",
    component: LoginView,
},
{
    path: "/register",
    name: "register",
    component: RegisterView,
},
{
    path: "/login/callback",
    name: "login-callback",
    component: LoginCallback,
},
{
    path: "/admin",       
    name: "admin",
    component: AdminView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {

  const token = sessionStorage.getItem("token");

  if (to.path === "/login" || to.path === "/register"|| to.path === "/login/callback") {
    return next()
  }

  if (!token) {
    return next("/login")
  }

  // /admin darf nur betreten werden, wenn die Rolle wirklich "admin" ist
  // echte Sicherheit kommt vom Backend: aber so verhindert auch im Frontend, dass normale User die Seite überhaupt sehen
  if (to.path === "/admin") {
    const userJson = sessionStorage.getItem("user")
    const user = userJson ? JSON.parse(userJson) : null
    if (!user || user.role !== "admin") {
      return next("/")
    }
  }

  next()

})
export default router;