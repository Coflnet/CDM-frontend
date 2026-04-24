<script setup lang="ts">
defineProps<{ videoUrl: string; siteName: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Driveway Video</h2>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>
      <p class="text-sm text-muted mb-2">Site: {{ siteName }}</p>
      <video :src="videoUrl" controls autoplay></video>
      <button class="btn-ghost btn-block mt-3" @click="emit('close')">Close</button>
    </div>
  </div>
</template>

<style scoped>
.mt-3 { margin-top: 1.25rem; }
</style>
