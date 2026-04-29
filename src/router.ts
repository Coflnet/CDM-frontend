import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import InfoPage from './components/InfoPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/info', name: 'info', component: InfoPage },
    { path: '/:pathMatch(.*)*', component: App },
  ],
})

export default router
