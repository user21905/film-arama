import { createRouter, createWebHistory } from 'vue-router';
import HelloWorld from './components/HelloWorld.vue';
import Favorites from './views/Favorites.vue';
import Login from './views/Login.vue';
import Register from './views/Register.vue';
import MovieDetail from './views/MovieDetail.vue';

const routes = [
  { path: '/', name: 'Home', component: HelloWorld },
  { path: '/favorites', name: 'FavoritesPage', component: Favorites },
  { path: '/login', name: 'LoginPage', component: Login },
  { path: '/register', name: 'RegisterPage', component: Register },
  { path: '/movie/:id', name: 'MovieDetail', component: MovieDetail, props: true }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router; 