<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authState, login, register, selectRole, logout, clearSavedRole, testLogin, type UserRole } from './store/auth'
import { meApi, type ApiTokenInfo, type CreatedApiToken } from './api'
import CustomerDashboard from './components/customer/CustomerDashboard.vue'
import DriverDashboard from './components/driver/DriverDashboard.vue'
import AdminDashboard from './components/admin/AdminDashboard.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

type AuthView = 'login' | 'signup'
const authView = ref<AuthView>('login')

const emailInput = ref('')
const passwordInput = ref('')
const confirmPasswordInput = ref('')
const authError = ref('')
const authLoading = ref(false)
const showApiTokens = ref(false)
const apiTokens = ref<ApiTokenInfo[]>([])
const apiTokenName = ref('')
const createdApiToken = ref<CreatedApiToken | null>(null)
const apiTokenError = ref('')
const apiTokenLoading = ref(false)

const availableRoles = computed<UserRole[]>(() => {
  const roles: UserRole[] = []
  if (authState.roles.includes('customer')) roles.push('customer')
  if (authState.roles.includes('driver')) roles.push('driver')
  if (authState.roles.includes('admin') || authState.roles.includes('superadmin')) roles.push('admin')
  return roles
})

const canSwitchRoles = computed(() => availableRoles.value.length > 1)

function roleTitle(role: UserRole): string {
  if (role === 'admin') return t('roles.admin')
  if (role === 'driver') return t('roles.driver')
  return t('roles.customer')
}

onMounted(async () => {
  // ?testLogin=customer|driver|admin|superadmin enables the test bypass when
  // the backend has CDM_TESTING_ENABLED=true. Used by the C# Playwright suite.
  const param = (route.query.testLogin || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('testLogin') : null)) as string | null
  if (param) {
    try {
      await testLogin(param as UserRole)
    } catch (e) {
      // Surface to the inline auth error area so the e2e suite sees something.
      authError.value = e instanceof Error ? e.message : String(e)
    } finally {
      // Strip the param so a refresh doesn't re-mint a token.
      router.replace({ path: route.path, query: { ...route.query, testLogin: undefined } })
    }
  }
})

function switchView(view: AuthView) {
  authView.value = view
  emailInput.value = ''
  passwordInput.value = ''
  confirmPasswordInput.value = ''
  authError.value = ''
}

function mapFirebaseError(e: unknown, isSignup: boolean): string {
  const code = (e as { code?: string })?.code ?? ''
  const msg = e instanceof Error ? e.message : String(e)
  const haystack = `${code} ${msg}`.toLowerCase()

  if (haystack.includes('invalid-credential') || haystack.includes('wrong-password') || haystack.includes('user-not-found'))
    return t('auth.errors.invalidCredential')
  if (haystack.includes('email-already-in-use')) return t('auth.errors.emailInUse')
  if (haystack.includes('invalid-email')) return t('auth.errors.invalidEmail')
  if (haystack.includes('weak-password')) return t('auth.errors.tooShort')
  if (haystack.includes('too-many-requests')) return t('auth.errors.tooManyRequests')
  if (haystack.includes('network-request-failed') || haystack.includes('network')) return t('auth.errors.network')
  if (haystack.includes('operation-not-allowed')) return t('auth.errors.registrationDisabled')
  const detail = code || msg
  const base = isSignup ? t('auth.errors.genericSignup') : t('auth.errors.genericLogin')
  return `${base} (${detail}).`
}

async function submitLogin() {
  if (!emailInput.value.trim() || !passwordInput.value) {
    authError.value = t('auth.errors.empty')
    return
  }
  authLoading.value = true
  authError.value = ''
  try {
    await login(emailInput.value.trim(), passwordInput.value)
    emailInput.value = ''
    passwordInput.value = ''
  } catch (e: unknown) {
    authError.value = mapFirebaseError(e, false)
  } finally {
    authLoading.value = false
  }
}

async function submitSignup() {
  if (!emailInput.value.trim() || !passwordInput.value) {
    authError.value = t('auth.errors.empty')
    return
  }
  if (passwordInput.value !== confirmPasswordInput.value) {
    authError.value = t('auth.errors.mismatch')
    return
  }
  if (passwordInput.value.length < 6) {
    authError.value = t('auth.errors.tooShort')
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
    authError.value = mapFirebaseError(e, true)
  } finally {
    authLoading.value = false
  }
}

async function openApiTokens() {
  showApiTokens.value = true
  await loadApiTokens()
}

async function loadApiTokens() {
  apiTokenLoading.value = true
  apiTokenError.value = ''
  try {
    apiTokens.value = await meApi.listApiTokens()
  } catch (e: unknown) {
    apiTokenError.value = e instanceof Error ? e.message : t('apiTokens.loadError')
  } finally {
    apiTokenLoading.value = false
  }
}

async function createApiToken() {
  apiTokenLoading.value = true
  apiTokenError.value = ''
  createdApiToken.value = null
  try {
    createdApiToken.value = await meApi.createApiToken(apiTokenName.value.trim() || undefined)
    apiTokenName.value = ''
    await loadApiTokens()
  } catch (e: unknown) {
    apiTokenError.value = e instanceof Error ? e.message : t('apiTokens.createError')
  } finally {
    apiTokenLoading.value = false
  }
}

async function revokeApiToken(tokenId: string) {
  apiTokenLoading.value = true
  apiTokenError.value = ''
  try {
    await meApi.revokeApiToken(tokenId)
    await loadApiTokens()
  } catch (e: unknown) {
    apiTokenError.value = e instanceof Error ? e.message : t('apiTokens.revokeError')
  } finally {
    apiTokenLoading.value = false
  }
}
</script>

<template>
  <div id="app-root">
    <!-- Loading splash -->
    <div v-if="authState.loading" class="role-screen">
      <div class="loading-spinner"></div>
    </div>

    <!-- Landing + Login / Signup screen -->
    <div v-else-if="!authState.authenticated" class="landing-screen">
      <section class="landing-copy">
        <div class="brand landing-brand">
          <span class="brand-diamond">&#9670;</span>
          <span class="brand-name">{{ t('brand.name') }}</span>
        </div>
        <h1>{{ t('landing.headline') }}</h1>
        <p class="landing-text">{{ t('landing.intro') }}</p>
        <ul class="landing-bullets">
          <li>
            <strong>{{ t('landing.bullets.order.title') }}</strong>
            <span>{{ t('landing.bullets.order.text') }}</span>
          </li>
          <li>
            <strong>{{ t('landing.bullets.pickup.title') }}</strong>
            <span>{{ t('landing.bullets.pickup.text') }}</span>
          </li>
          <li>
            <strong>{{ t('landing.bullets.sustain.title') }}</strong>
            <span>{{ t('landing.bullets.sustain.text') }}</span>
          </li>
        </ul>
        <p class="landing-links">
          <RouterLink to="/info" class="link-btn">{{ t('landing.cta.learnMore') }} &rarr;</RouterLink>
          <span class="separator">·</span>
          <RouterLink to="/info" class="link-btn">{{ t('landing.cta.forCompanies') }}</RouterLink>
        </p>
      </section>

      <div class="role-card auth-card">
        <div class="auth-card-top">
          <div class="brand compact-brand">
            <span class="brand-diamond">&#9670;</span>
            <span class="brand-name">{{ t('brand.short') }}</span>
          </div>
          <LanguageSwitcher />
        </div>
        <p class="brand-sub">{{ t('brand.sub') }}</p>
        <p class="brand-by">{{ t('brand.by') }}</p>

        <!-- Tab switcher -->
        <div class="auth-tabs">
          <button
            class="auth-tab"
            :class="{ active: authView === 'login' }"
            @click="switchView('login')"
          >{{ t('auth.loginTab') }}</button>
          <button
            class="auth-tab"
            :class="{ active: authView === 'signup' }"
            @click="switchView('signup')"
          >{{ t('auth.signupTab') }}</button>
        </div>

        <div v-if="authError" class="alert-inline">{{ authError }}</div>

        <!-- Login form -->
        <template v-if="authView === 'login'">
          <div class="form-group">
            <label>{{ t('auth.email') }}</label>
            <input
              v-model="emailInput"
              type="email"
              :placeholder="t('auth.emailPh')"
              autocomplete="email"
              @keyup.enter="submitLogin"
            />
          </div>
          <div class="form-group">
            <label>{{ t('auth.password') }}</label>
            <input
              v-model="passwordInput"
              type="password"
              :placeholder="t('auth.passwordPh')"
              autocomplete="current-password"
              @keyup.enter="submitLogin"
            />
          </div>
          <button class="btn-primary btn-block mt-4" :disabled="authLoading" @click="submitLogin">
            <span v-if="authLoading" class="btn-spinner"></span>
            <span v-else>{{ t('auth.submitLogin') }}</span>
          </button>
          <p class="auth-switch-hint">
            {{ t('auth.noAccount') }}
            <button class="link-btn" @click="switchView('signup')">{{ t('auth.switchToSignup') }}</button>
          </p>
        </template>

        <!-- Signup form -->
        <template v-else>
          <div class="form-group">
            <label>{{ t('auth.email') }}</label>
            <input
              v-model="emailInput"
              type="email"
              :placeholder="t('auth.emailPh')"
              autocomplete="email"
              @keyup.enter="submitSignup"
            />
          </div>
          <div class="form-group">
            <label>{{ t('auth.password') }}</label>
            <input
              v-model="passwordInput"
              type="password"
              :placeholder="t('auth.passwordSignupPh')"
              autocomplete="new-password"
              @keyup.enter="submitSignup"
            />
          </div>
          <div class="form-group">
            <label>{{ t('auth.confirmPassword') }}</label>
            <input
              v-model="confirmPasswordInput"
              type="password"
              :placeholder="t('auth.passwordPh')"
              autocomplete="new-password"
              @keyup.enter="submitSignup"
            />
          </div>
          <button class="btn-primary btn-block mt-4" :disabled="authLoading" @click="submitSignup">
            <span v-if="authLoading" class="btn-spinner"></span>
            <span v-else>{{ t('auth.submitSignup') }}</span>
          </button>
          <p class="auth-switch-hint">
            {{ t('auth.haveAccount') }}
            <button class="link-btn" @click="switchView('login')">{{ t('auth.switchToLogin') }}</button>
          </p>
        </template>
      </div>
    </div>

    <!-- Role selector -->
    <div v-else-if="!authState.role" class="role-screen">
      <div class="role-card">
        <div class="brand">
          <span class="brand-diamond">&#9670;</span>
          <span class="brand-name">{{ t('brand.short') }}</span>
        </div>
        <p class="brand-sub">{{ t('brand.sub') }}</p>
        <p class="brand-by">{{ t('brand.by') }}</p>

        <p class="choose-label">{{ t('roles.noneYet') }}</p>

        <div class="role-options">
          <button v-for="role in availableRoles" :key="role" class="role-btn" @click="selectRole(role)">
            <span class="role-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </span>
            <span class="role-title">{{ roleTitle(role) }}</span>
            <span class="role-desc">{{ t('roles.pickHint') }}</span>
          </button>
        </div>

        <p v-if="availableRoles.length === 0" class="text-sm text-muted mt-4">
          {{ t('roles.inactiveHint') }}
        </p>

        <button class="btn-ghost btn-block mt-4" style="font-size:0.82rem" @click="logout">{{ t('nav.logout') }}</button>
      </div>
    </div>

    <!-- Dashboards -->
    <template v-else>
      <header class="app-header">
        <div class="app-header-title">
          <span class="logo-accent"></span>
          {{ t('brand.short') }} &mdash; {{ authState.role === 'driver' ? t('roles.driver') : authState.role === 'admin' ? t('roles.admin') : t('roles.customer') }}
        </div>
        <div class="header-actions">
          <LanguageSwitcher />
          <button class="btn-ghost btn-sm" @click="openApiTokens">{{ t('nav.apiTokens') }}</button>
          <button v-if="canSwitchRoles" class="btn-ghost btn-sm" @click="clearSavedRole()">{{ t('nav.role') }}</button>
          <button class="btn-ghost btn-sm" @click="logout">{{ t('nav.logout') }}</button>
        </div>
      </header>
      <CustomerDashboard v-if="authState.role === 'customer'" />
      <DriverDashboard v-else-if="authState.role === 'driver'" />
      <AdminDashboard v-else-if="authState.role === 'admin'" />

      <Transition name="fade">
        <div v-if="showApiTokens" class="modal-overlay" @click.self="showApiTokens = false">
          <div class="modal api-token-modal">
            <div class="modal-header">
              <h2>{{ t('apiTokens.title') }}</h2>
              <button class="modal-close" @click="showApiTokens = false">&times;</button>
            </div>

            <div v-if="apiTokenError" class="alert alert-error mb-2">{{ apiTokenError }}</div>
            <div v-if="createdApiToken" class="alert alert-success mb-2 token-output">
              <span>{{ createdApiToken.token }}</span>
            </div>

            <div class="form-group">
              <label>{{ t('apiTokens.name') }}</label>
              <input v-model="apiTokenName" type="text" :placeholder="t('apiTokens.namePh')" />
            </div>
            <button class="btn-primary btn-block" :disabled="apiTokenLoading" @click="createApiToken">
              {{ apiTokenLoading ? t('common.loading') : t('apiTokens.create') }}
            </button>

            <div class="token-list">
              <div v-for="token in apiTokens" :key="token.tokenId" class="token-row">
                <div>
                  <strong>{{ token.name }}</strong>
                  <p class="text-sm text-muted">{{ t('apiTokens.validUntil', { date: new Date(token.expiresAt).toLocaleDateString() }) }}</p>
                </div>
                <button v-if="!token.revokedAt" class="btn-ghost btn-sm" @click="revokeApiToken(token.tokenId)">{{ t('apiTokens.revoke') }}</button>
                <span v-else class="badge badge-gray">{{ t('apiTokens.revoked') }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
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
  padding: 1rem 0.875rem;
  background: var(--bg-base);
}

.landing-screen {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem 0.875rem;
  background:
    linear-gradient(rgba(17,17,17,0.78), rgba(17,17,17,0.9)),
    url('/container-yard.svg') center/cover no-repeat,
    var(--bg-base);
}

.landing-copy {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

.landing-brand {
  justify-content: flex-start;
  margin-bottom: 1rem;
}

.compact-brand {
  font-size: 1.65rem;
}

.landing-copy h1 {
  max-width: 680px;
  font-size: 2.25rem;
  line-height: 1.05;
  margin-bottom: 1rem;
}

.landing-text {
  max-width: 620px;
  color: var(--text-secondary);
  font-size: 1rem;
}

.landing-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
  max-width: 620px;
  margin-top: 1.25rem;
}

.landing-stats div {
  border: 1px solid var(--border-card-light);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  background: rgba(24,24,24,0.78);
}

.landing-stats strong,
.landing-stats span {
  display: block;
}

.landing-stats strong {
  color: var(--text-primary);
  font-size: 0.95rem;
}

.landing-stats span {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.landing-bullets {
  list-style: none;
  padding: 0;
  margin: 1.25rem 0 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.55rem;
  max-width: 620px;
}

.landing-bullets li {
  border: 1px solid var(--border-card-light);
  border-radius: var(--radius-sm);
  padding: 0.7rem 0.8rem;
  background: rgba(24,24,24,0.78);
}

.landing-bullets strong {
  display: block;
  color: var(--text-primary);
  font-size: 0.95rem;
  margin-bottom: 0.15rem;
}

.landing-bullets span {
  display: block;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.4;
}

.landing-links {
  margin-top: 1rem;
  font-size: 0.9rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.landing-links .separator {
  color: var(--text-secondary);
  opacity: 0.5;
}

.auth-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.auth-card {
  margin: 0 auto;
}

@media (min-width: 920px) {
  .landing-screen {
    grid-template-columns: minmax(0, 1fr) 420px;
    padding: 2rem clamp(2rem, 5vw, 5rem);
  }

  .landing-copy h1 {
    font-size: 3.2rem;
  }
}

.role-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-lg);
  padding: 2rem 1.25rem;
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

.header-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.api-token-modal {
  text-align: left;
}

.token-output {
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.token-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 1rem;
}

.token-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  background: #181818;
}
</style>
