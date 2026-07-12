import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // <model-viewer> is a web component registered at runtime, not a Vue component.
          isCustomElement: (tag) => tag === 'model-viewer',
        },
      },
    }),
  ],
})
