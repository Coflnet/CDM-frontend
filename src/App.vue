<script setup lang="ts">
import { authState, selectRole, clearRole } from './store/auth'
import CustomerDashboard from './components/customer/CustomerDashboard.vue'
import DriverDashboard from './components/driver/DriverDashboard.vue'
</script>

<template>
  <div id="app-root">
    <!-- Role selector -->
    <div v-if="!authState.role" class="role-screen">
      <div class="role-card">
        <div class="brand">
          <span class="brand-diamond">&#9670;</span>
          <span class="brand-name">CDM</span>
        </div>
        <p class="brand-sub">Container &amp; Dumpster Management</p>
        <p class="brand-by">by Coflnet</p>

        <p class="choose-label">Who are you?</p>

        <div class="role-options">
          <button class="role-btn" @click="selectRole('customer')">
            <span class="role-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </span>
            <span class="role-title">Customer</span>
            <span class="role-desc">Manage containers &amp; schedule pickups</span>
          </button>

          <button class="role-btn" @click="selectRole('driver')">
            <span class="role-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            </span>
            <span class="role-title">Driver</span>
            <span class="role-desc">View pickup queue &amp; navigate to sites</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Dashboards -->
    <template v-else>
      <header class="app-header">
        <div class="app-header-title">
          <span class="logo-accent"></span>
          CDM &mdash; {{ authState.role === 'driver' ? 'Driver View' : 'Customer Portal' }}
        </div>
        <button class="btn-ghost btn-sm" @click="clearRole">Switch Role</button>
      </header>
      <CustomerDashboard v-if="authState.role === 'customer'" />
      <DriverDashboard v-else />
    </template>
  </div>
</template>

<style scoped>
#app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.role-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: var(--bg-base);
}

.role-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-lg);
  padding: 2.25rem 2rem;
  box-shadow: var(--shadow);
  text-align: center;
}

.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  margin-bottom: 0.25rem;
}
.brand-diamond {
  color: var(--accent-blue);
  font-size: 1.6rem;
  filter: drop-shadow(0 0 8px rgba(58,143,212,0.6));
}
.brand-sub {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-bottom: 0.15rem;
}
.brand-by {
  color: #3a3a3a;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
  margin-bottom: 2rem;
}

.choose-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.role-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.role-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  background: #181818;
  border: 1px solid var(--border-card);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
  width: 100%;
  text-align: center;
}
.role-btn:hover {
  border-color: var(--accent-blue);
  background: #1c1c1c;
  box-shadow: 0 0 20px rgba(58,143,212,0.15);
}
.role-btn:active {
  transform: scale(0.97);
}

.role-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(58,143,212,0.12);
  border: 1px solid rgba(58,143,212,0.25);
  color: var(--accent-blue-light);
}
.role-icon svg {
  width: 24px;
  height: 24px;
  stroke-width: 1.8;
}

.role-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}
.role-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
