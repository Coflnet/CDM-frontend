import { onMounted, onUnmounted } from 'vue'

export function useBodyLock() {
  onMounted(() => {
    document.body.classList.add('modal-open')
  })
  onUnmounted(() => {
    document.body.classList.remove('modal-open')
  })
}
