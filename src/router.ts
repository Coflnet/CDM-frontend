import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Public pages are lazy-loaded so they (and the 3D viewer) stay out of the
    // main app bundle. App.vue renders the auth/dashboard experience via a
    // <router-view> guarded on the route name.
    { path: '/info', name: 'info', component: () => import('./components/InfoPage.vue') },
    { path: '/ar', name: 'ar', component: () => import('./components/ArPage.vue') },
    { path: '/:pathMatch(.*)*', component: App },
  ],
})

export default router
