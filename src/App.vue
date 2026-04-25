<script setup lang="ts">
import { ref } from 'vue'
import { authState, login, register, selectRole, logout } from './store/auth'
import CustomerDashboard from './components/customer/CustomerDashboard.vue'
import DriverDashboard from './components/driver/DriverDashboard.vue'

type AuthView = 'login' | 'signup'
const authView = ref<AuthView>('login')

const emailInput = ref('')
const passwordInput = ref('')
const confirmPasswordInput = ref('')
const authError = ref('')
const authLoading = ref(false)

function switchView(view: AuthView) {
  authView.value = view
  emailInput.value = ''
  passwordInput.value = ''
  confirmPasswordInput.value = ''
  authError.value = ''
}

function mapFirebaseError(msg: string, isSignup: boolean): string {
  if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found'))
    return 'E-Mail oder Passwort falsch.'
  if (msg.includes('email-already-in-use'))
    return 'Diese E-Mail-Adresse ist bereits registriert.'
  if (msg.includes('invalid-email'))
    return 'Ungültige E-Mail-Adresse.'
  if (msg.includes('weak-password'))
    return 'Passwort muss mindestens 6 Zeichen lang sein.'
  if (msg.includes('too-many-requests'))
    return 'Zu viele Versuche. Bitte später nochmal versuchen.'
  return isSignup ? 'Registrierung fehlgeschlagen. Bitte erneut versuchen.' : 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.'
}

async function submitLogin() {
  if (!emailInput.value.trim() || !passwordInput.value) {
    authError.value = 'Bitte E-Mail und Passwort eingeben.'
    return
  }
  authLoading.value = true
  authError.value = ''
  try {
    await login(emailInput.value.trim(), passwordInput.value)
    emailInput.value = ''
    passwordInput.value = ''
  } catch (e: unknown) {
    authError.value = mapFirebaseError(e instanceof Error ? e.message : String(e), false)
  } finally {
    authLoading.value = false
  }
}

async function submitSignup() {
  if (!emailInput.value.trim() || !passwordInput.value) {
    authError.value = 'Bitte E-Mail und Passwort eingeben.'
    return
  }
  if (passwordInput.value !== confirmPasswordInput.value) {
    authError.value = 'Passwörter stimmen nicht überein.'
    return
  }
  if (passwordInput.value.length < 6) {
    authError.value = 'Passwort muss mindestens 6 Zeichen lang sein.'
    return
  }
  authLoading.value = true
  authError.value = ''
  try {
    await register(emailInput.value.trim(), passwordInput.value)
    emailInput.value = ''
    passwordInput.value = ''
    confirmPasswordInput.value = ''
  } catch (e: unknown) {
    authError.value = mapFirebaseError(e instanceof Error ? e.message : String(e), true)
  } finally {
    authLoading.value = false
  }
}
</script>

<template>
  <div id="app-root">
    <!-- Loading splash -->
    <div v-if="authState.loading" class="role-screen">
      <div class="loading-spinner"></div>
    </div>

    <!-- Login / Signup screen -->
    <div v-else-if="!authState.authenticated" class="role-screen">
      <div class="role-card">
        <div class="brand">
          <span class="brand-diamond">&#9670;</span>
          <span class="brand-name">CDM</span>
        </div>
        <p class="brand-sub">Container- &amp; Mulden-Management</p>
        <p class="brand-by">von Coflnet</p>

        <!-- Tab switcher -->
        <div class="auth-tabs">
          <button
            class="auth-tab"
            :class="{ active: authView === 'login' }"
            @click="switchView('login')"
          >Anmelden</button>
          <button
            class="auth-tab"
            :class="{ active: authView === 'signup' }"
            @click="switchView('signup')"
          >Registrieren</button>
        </div>

        <div v-if="authError" class="alert-inline">{{ authError }}</div>

        <!-- Login form -->
        <template v-if="authView === 'login'">
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
          <button class="btn-primary btn-block mt-4" :disabled="authLoading" @click="submitLogin">
            <span v-if="authLoading" class="btn-spinner"></span>
            <span v-else>Anmelden</span>
          </button>
          <p class="auth-switch-hint">
            Noch kein Konto?
            <button class="link-btn" @click="switchView('signup')">Jetzt registrieren</button>
          </p>
        </template>

        <!-- Signup form -->
        <template v-else>
          <div class="form-group">
            <label>E-Mail</label>
            <input
              v-model="emailInput"
              type="email"
              placeholder="name@firma.de"
              autocomplete="email"
              @keyup.enter="submitSignup"
            />
          </div>
          <div class="form-group">
            <label>Passwort</label>
            <input
              v-model="passwordInput"
              type="password"
              placeholder="Mindestens 6 Zeichen"
              autocomplete="new-password"
              @keyup.enter="submitSignup"
            />
          </div>
          <div class="form-group">
            <label>Passwort bestätigen</label>
            <input
              v-model="confirmPasswordInput"
              type="password"
              placeholder="••••••••"
              autocomplete="new-password"
              @keyup.enter="submitSignup"
            />
          </div>
          <button class="btn-primary btn-block mt-4" :disabled="authLoading" @click="submitSignup">
            <span v-if="authLoading" class="btn-spinner"></span>
            <span v-else>Konto erstellen</span>
          </button>
          <p class="auth-switch-hint">
            Bereits ein Konto?
            <button class="link-btn" @click="switchView('login')">Anmelden</button>
          </p>
        </template>
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

.auth-tabs {
  display: flex;
  border: 1px solid var(--border-card);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 0.25rem;
}
.auth-tab {
  flex: 1;
  padding: 0.55rem 0;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  transition: background 0.15s, color 0.15s;
}
.auth-tab.active {
  background: var(--accent-blue);
  color: #fff;
}
.auth-tab:not(.active):hover {
  background: rgba(58,143,212,0.1);
  color: var(--text-primary);
}

.auth-switch-hint {
  margin-top: 1.1rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}
.link-btn {
  background: none;
  border: none;
  color: var(--accent-blue-light);
  cursor: pointer;
  font-size: inherit;
  font-weight: 600;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

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
