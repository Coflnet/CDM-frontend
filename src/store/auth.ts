import { reactive } from 'vue'
import { firebaseSignIn, firebaseSignUp, firebaseSignOut, onFirebaseAuthStateChanged, getFirebaseIdToken } from '../firebase'
import { setToken, clearToken, meApi, testAuthApi, type CompanyRole, type CustomerProfile } from '../api'

export type UserRole = 'customer' | 'driver' | 'admin'

interface AuthState {
  role: UserRole | null
  roles: string[]
  companyRoles: CompanyRole[]
  userId: string | null
  email: string | null
  profile: CustomerProfile | null
  authenticated: boolean
  loading: boolean
}

export const authState = reactive<AuthState>({
  role: null,
  roles: [],
  companyRoles: [],
  userId: null,
  email: null,
  profile: null,
  authenticated: false,
  loading: true,
})

/**
 * When set, the user is authenticated via the test-login bypass and Firebase
 * sign-out events must not clear the API token.
 */
let testMode = false

onFirebaseAuthStateChanged(async (user) => {
  if (testMode) {
    // Firebase listener fires with null on init when the user is signed in via
    // the test bypass. Don't clobber that session.
    authState.loading = false
    return
  }
  try {
    if (user) {
      const token = await user.getIdToken()
      setToken(token)
      authState.authenticated = true
      authState.email = user.email
      await syncBackendUser(user.email ?? undefined)
    } else {
      clearToken()
      authState.authenticated = false
      authState.role = null
      authState.roles = []
      authState.companyRoles = []
      authState.userId = null
      authState.email = null
      authState.profile = null
    }
  } catch {
    clearToken()
    authState.authenticated = false
    authState.role = null
    authState.roles = []
    authState.companyRoles = []
    authState.userId = null
    authState.email = null
    authState.profile = null
  } finally {
    authState.loading = false
  }
})

function bestRole(roles: string[]): UserRole | null {
  if (roles.includes('superadmin') || roles.includes('admin')) return 'admin'
  if (roles.includes('driver')) return 'driver'
  if (roles.includes('customer')) return 'customer'
  return null
}

async function syncBackendUser(email?: string): Promise<void> {
  const me = email ? await meApi.register(email) : await meApi.get()
  authState.userId = me.userId
  authState.roles = me.roles
  authState.companyRoles = me.companyRoles
  authState.profile = me.profile
  authState.role = bestRole(me.roles)
}

export async function login(email: string, password: string): Promise<void> {
  const user = await firebaseSignIn(email, password)
  const token = await getFirebaseIdToken()
  setToken(token)
  authState.authenticated = true
  authState.email = user.email
  await syncBackendUser(user.email ?? undefined)

  // refresh token before expiry (Firebase tokens last 1h)
  setInterval(async () => {
    const fresh = await user.getIdToken(true)
    setToken(fresh)
  }, 55 * 60 * 1000)
}

export async function register(email: string, password: string): Promise<void> {
  const user = await firebaseSignUp(email, password)
  const token = await user.getIdToken()
  setToken(token)
  authState.authenticated = true
  authState.email = user.email
  await syncBackendUser(email)
}

export function selectRole(role: UserRole): void {
  if (!authState.roles.includes(role) && !(role === 'admin' && authState.roles.includes('superadmin'))) return
  authState.role = role
}

export function restoreRole(): void {
  authState.role = bestRole(authState.roles)
}

export function clearSavedRole(): void {
  restoreRole()
}

export async function logout(): Promise<void> {
  await firebaseSignOut()
  clearToken()
  authState.authenticated = false
  authState.role = null
  authState.roles = []
  authState.companyRoles = []
  authState.userId = null
  authState.email = null
  authState.profile = null
}

/**
 * Test-only login that obtains an API token for a synthetic user via the backend's
 * /api/test/login endpoint. Only works when the backend has CDM_TESTING_ENABLED=true.
 * Skips Firebase entirely.
 */
export async function testLogin(role: UserRole | 'superadmin'): Promise<void> {
  testMode = true
  const response = await testAuthApi.login(role as UserRole)
  setToken(response.token)
  authState.authenticated = true
  authState.email = response.email
  await syncBackendUser(response.email)
  authState.loading = false
}
