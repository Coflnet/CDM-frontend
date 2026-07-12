import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'

const app = createApp(App).use(router).use(i18n)
// Wait for the initial navigation so a deep link (e.g. /ar) resolves before the
// first render instead of flashing the landing screen.
router.isReady().then(() => app.mount('#app'))
