import { reactive } from 'vue'
import { supabase, type Profile } from '../supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
}

export const authState = reactive<AuthState>({
  user: null,
  profile: null,
  loading: true,
})

export async function loadProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  authState.profile = data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string, fullName: string, role: 'customer' | 'driver') {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: fullName,
      role,
    })
    if (profileError) throw profileError
  }
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
  authState.user = null
  authState.profile = null
}

supabase.auth.onAuthStateChange((_event, session) => {
  ;(async () => {
    authState.user = session?.user ?? null
    if (session?.user) {
      await loadProfile(session.user.id)
    } else {
      authState.profile = null
    }
    authState.loading = false
  })()
})

supabase.auth.getSession().then(({ data }) => {
  ;(async () => {
    authState.user = data.session?.user ?? null
    if (data.session?.user) {
      await loadProfile(data.session.user.id)
    }
    authState.loading = false
  })()
})
