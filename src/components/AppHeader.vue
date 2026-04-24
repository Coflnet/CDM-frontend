<script setup lang="ts">
import { authState, signOut } from '../store/auth'

defineProps<{ title: string }>()
</script>

<template>
  <header class="app-header">
    <div class="app-header-title">
      <span class="logo-accent"></span>
      CDM &mdash; {{ title }}
    </div>
    <div class="row">
      <span class="role-badge">{{ authState.profile?.role }}</span>
      <button class="btn-ghost btn-sm" @click="signOut">Sign Out</button>
    </div>
  </header>
</template>

<style scoped>
.role-badge {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  display: none;
}
@media (min-width: 480px) {
  .role-badge { display: block; }
}
</style>
