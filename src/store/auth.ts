import { reactive } from 'vue'
import { firebaseSignIn, firebaseSignUp, firebaseSignOut, onFirebaseAuthStateChanged, getFirebaseIdToken } from '../firebase'
import { setToken, clearToken } from '../api'

export type UserRole = 'customer' | 'driver' | 'admin'

interface AuthState {
  role: UserRole | null
  authenticated: boolean
  loading: boolean
}

export const authState = reactive<AuthState>({
  role: null,
  authenticated: false,
  loading: true,
})

onFirebaseAuthStateChanged(async (user) => {
  if (user) {
    const token = await user.getIdToken()
    setToken(token)
    authState.authenticated = true
    restoreRole()
  } else {
    clearToken()
    authState.authenticated = false
    authState.role = null
    localStorage.removeItem('cdm_role')
  }
  authState.loading = false
})

export async function login(email: string, password: string): Promise<void> {
  const user = await firebaseSignIn(email, password)
  const token = await getFirebaseIdToken()
  setToken(token)
  authState.authenticated = true

  // keep role if already selected
  if (!authState.role) {
    // role will be chosen after login
  }

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
}

export function selectRole(role: UserRole): void {
  authState.role = role
  localStorage.setItem('cdm_role', role)
}

export function restoreRole(): void {
  const saved = localStorage.getItem('cdm_role') as UserRole | null
  if (saved) authState.role = saved
}

export function clearSavedRole(): void {
  localStorage.removeItem('cdm_role')
  authState.role = null
}

export async function logout(): Promise<void> {
  await firebaseSignOut()
  clearToken()
  localStorage.removeItem('cdm_role')
  authState.authenticated = false
  authState.role = null
}
