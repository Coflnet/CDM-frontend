import { reactive } from 'vue'

export type UserRole = 'customer' | 'driver'

interface RoleState {
  role: UserRole | null
}

export const authState = reactive<RoleState>({
  role: null,
})

export function selectRole(role: UserRole) {
  authState.role = role
}

export function clearRole() {
  authState.role = null
}
