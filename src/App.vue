<script setup lang="ts">
import { ref } from 'vue'
import { authState, login, selectRole, logout } from './store/auth'
import CustomerDashboard from './components/customer/CustomerDashboard.vue'
import DriverDashboard from './components/driver/DriverDashboard.vue'

const emailInput = ref('')
const passwordInput = ref('')
const loginError = ref('')
const loginLoading = ref(false)

async function submitLogin() {
  if (!emailInput.value.trim() || !passwordInput.value) {
    loginError.value = 'Bitte E-Mail und Passwort eingeben.'
    return
  }
  loginLoading.value = true
  loginError.value = ''
  try {
    await login(emailInput.value.trim(), passwordInput.value)
    emailInput.value = ''
    passwordInput.value = ''
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
      loginError.value = 'E-Mail oder Passwort falsch.'
    } else if (msg.includes('invalid-email')) {
      loginError.value = 'Ungültige E-Mail-Adresse.'
    } else if (msg.includes('too-many-requests')) {
      loginError.value = 'Zu viele Versuche. Bitte später nochmal versuchen.'
    } else {
      loginError.value = 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.'
    }
  } finally {
    loginLoading.value = false
  }
}
</script>

<template>
  <div id="app-root">
    <!-- Loading splash -->
    <div v-if="authState.loading" class="role-screen">
      <div class="loading-spinner"></div>
    </div>

    <!-- Login screen -->
    <div v-else-if="!authState.authenticated" class="role-screen">
      <div class="role-card">
        <div class="brand">
          <span class="brand-diamond">&#9670;</span>
          <span class="brand-name">CDM</span>
        </div>
        <p class="brand-sub">Container- &amp; Mulden-Management</p>
        <p class="brand-by">von Coflnet</p>

        <div v-if="loginError" class="alert-inline">{{ loginError }}</div>

        <div class="form-group">
          <label>E-Mail</label>
          <input
            v-model="emailInput"
            type="email"
            placeholder="name@firma.de"
            autocomplete="email"
            @keyup.enter="submitLogin"
          />
        </div>

        <div class="form-group">
          <label>Passwort</label>
          <input
            v-model="passwordInput"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            @keyup.enter="submitLogin"
          />
        </div>

        <button
          class="btn-primary btn-block mt-4"
          :disabled="loginLoading"
          @click="submitLogin"
        >
          <span v-if="loginLoading" class="btn-spinner"></span>
          <span v-else>Anmelden</span>
        </button>
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
          <button class="role-btn" @click="selectRole('customer')">
            <span class="role-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </span>
            <span class="role-title">Kunde</span>
            <span class="role-desc">Container verwalten &amp; Abholungen planen</span>
          </button>

          <button class="role-btn" @click="selectRole('driver')">
            <span class="role-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            </span>
            <span class="role-title">Fahrer</span>
            <span class="role-desc">Abholwarteschlange &amp; Navigation zu Standorten</span>
          </button>
        </div>

        <button class="btn-ghost btn-block mt-4" style="font-size:0.82rem" @click="logout">Abmelden</button>
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

.form-group {
  text-align: left;
  margin-top: 1.1rem;
}
.form-group label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}
.form-group input {
  width: 100%;
  box-sizing: border-box;
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

.mt-4 { margin-top: 1.5rem; }

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-card);
  border-top-color: var(--accent-blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: middle;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
