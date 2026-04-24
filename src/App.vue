<script setup lang="ts">
import { authState } from './store/auth'
import AuthView from './components/AuthView.vue'
import AppHeader from './components/AppHeader.vue'
import CustomerDashboard from './components/customer/CustomerDashboard.vue'
import DriverDashboard from './components/driver/DriverDashboard.vue'
</script>

<template>
  <div id="app-root">
    <div v-if="authState.loading" class="loading-screen">
      <div class="spinner"></div>
    </div>

    <template v-else-if="!authState.user">
      <AuthView />
    </template>

    <template v-else-if="authState.profile">
      <AppHeader :title="authState.profile.role === 'driver' ? 'Driver View' : 'Customer Portal'" />
      <CustomerDashboard v-if="authState.profile.role === 'customer'" />
      <DriverDashboard v-else />
    </template>

    <div v-else class="loading-screen">
      <div class="spinner"></div>
      <p class="text-muted text-center" style="margin-top: 1rem">Loading profile...</p>
    </div>
  </div>
</template>

<style scoped>
#app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.loading-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
}
</style>
