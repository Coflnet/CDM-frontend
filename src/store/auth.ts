import { reactive } from 'vue'
import { firebaseSignIn, firebaseSignOut, onFirebaseAuthStateChanged, getFirebaseIdToken } from '../firebase'
import { setToken, clearToken } from '../api'

export type UserRole = 'customer' | 'driver'

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
  } else {
    clearToken()
    authState.authenticated = false
    authState.role = null
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

export function selectRole(role: UserRole): void {
  authState.role = role
}

export async function logout(): Promise<void> {
  await firebaseSignOut()
  clearToken()
  authState.authenticated = false
  authState.role = null
}
