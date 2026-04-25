import { reactive } from 'vue'
import { setToken, clearToken, hasToken } from '../api'

export type UserRole = 'customer' | 'driver'

interface AuthState {
  role: UserRole | null
  authenticated: boolean
}

export const authState = reactive<AuthState>({
  role: null,
  authenticated: hasToken(),
})

export function login(token: string, role: UserRole): void {
  setToken(token)
  authState.authenticated = true
  authState.role = role
}

export function selectRole(role: UserRole): void {
  authState.role = role
}

export function logout(): void {
  clearToken()
  authState.authenticated = false
  authState.role = null
}
