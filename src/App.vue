<script setup lang="ts">
import { ref } from 'vue'
import { authState, login, selectRole, logout } from './store/auth'
import type { UserRole } from './store/auth'
import CustomerDashboard from './components/customer/CustomerDashboard.vue'
import DriverDashboard from './components/driver/DriverDashboard.vue'

const tokenInput = ref('')
const tokenError = ref('')
const pendingRole = ref<UserRole | null>(null)

function chooseRole(role: UserRole) {
  if (authState.authenticated) {
    selectRole(role)
  } else {
    pendingRole.value = role
  }
}

function submitToken() {
  if (!tokenInput.value.trim()) {
    tokenError.value = 'Bitte gib deinen API-Token ein.'
    return
  }
  login(tokenInput.value.trim(), pendingRole.value!)
  tokenInput.value = ''
  tokenError.value = ''
  pendingRole.value = null
}

function cancelToken() {
  pendingRole.value = null
  tokenError.value = ''
  tokenInput.value = ''
}
</script>

<template>
  <div id="app-root">
    <!-- Token entry overlay -->
    <div v-if="pendingRole" class="role-screen">
      <div class="role-card">
        <div class="brand">
          <span class="brand-diamond">&#9670;</span>
          <span class="brand-name">CDM</span>
        </div>
        <p class="brand-sub">API-Token eingeben</p>

        <div v-if="tokenError" class="alert-inline">{{ tokenError }}</div>

        <div class="form-group" style="text-align:left;margin-top:1.5rem">
          <label>Bearer Token</label>
          <input
            v-model="tokenInput"
            type="password"
            placeholder="eyJ..."
            autofocus
            @keyup.enter="submitToken"
          />
          <p class="hint">Dein JWT aus dem Firebase-Login oder der API-Dokumentation.</p>
        </div>

        <div class="row mt-3" style="gap:0.75rem">
          <button class="btn-ghost btn-block" @click="cancelToken">Zurück</button>
          <button class="btn-primary btn-block" @click="submitToken">Anmelden</button>
        </div>
      </div>
    </div>

    <!-- Role selector -->
    <div v-else-if="!authState.role" class="role-screen">
      <div class="role-card">
        <div class="brand">
          <span class="brand-diamond">&#9670;</span>
          <span class="brand-name">CDM</span>
        </div>
        <p class="brand-sub">Container- &amp; Mulden-Management</p>
        <p class="brand-by">von Coflnet</p>

        <p class="choose-label">Wer bist du?</p>

        <div class="role-options">
          <button class="role-btn" @click="chooseRole('customer')">
            <span class="role-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </span>
            <span class="role-title">Kunde</span>
            <span class="role-desc">Container verwalten &amp; Abholungen planen</span>
          </button>

          <button class="role-btn" @click="chooseRole('driver')">
            <span class="role-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            </span>
            <span class="role-title">Fahrer</span>
            <span class="role-desc">Abholwarteschlange &amp; Navigation zu Standorten</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Dashboards -->
    <template v-else>
      <header class="app-header">
        <div class="app-header-title">
          <span class="logo-accent"></span>
          CDM &mdash; {{ authState.role === 'driver' ? 'Fahreransicht' : 'Kundenportal' }}
        </div>
        <div class="row" style="gap:0.5rem">
          <button class="btn-ghost btn-sm" @click="authState.role = null">Rolle wechseln</button>
          <button class="btn-ghost btn-sm" @click="logout">Abmelden</button>
        </div>
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

.alert-inline {
  background: rgba(231,76,60,0.12);
  border: 1px solid rgba(231,76,60,0.3);
  border-radius: var(--radius-sm);
  color: #e74c3c;
  font-size: 0.82rem;
  padding: 0.5rem 0.75rem;
  margin-top: 0.75rem;
}

.hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.4rem;
  text-align: left;
}

.mt-3 { margin-top: 1.25rem; }
</style>
