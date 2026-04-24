<script setup lang="ts">
import { ref } from 'vue'
import { signIn, signUp } from '../store/auth'

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const password = ref('')
const fullName = ref('')
const role = ref<'customer' | 'driver'>('customer')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await signIn(email.value, password.value)
    } else {
      await signUp(email.value, password.value, fullName.value, role.value)
    }
  } catch (e: any) {
    error.value = e.message || 'Something went wrong'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-logo">
        <span class="logo-icon">&#9670;</span>
        <span>CDM</span>
      </div>
      <p class="auth-sub">Container & Dumpster Management</p>

      <div v-if="error" class="alert alert-error mb-2">{{ error }}</div>

      <form @submit.prevent="submit" class="stack">
        <div v-if="mode === 'register'" class="form-group">
          <label>Full Name</label>
          <input v-model="fullName" type="text" placeholder="John Smith" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="you@example.com" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="••••••••" required minlength="6" />
        </div>
        <div v-if="mode === 'register'" class="form-group">
          <label>Account Type</label>
          <select v-model="role">
            <option value="customer">Customer</option>
            <option value="driver">Driver</option>
          </select>
        </div>
        <button type="submit" class="btn-primary btn-lg btn-block" :disabled="loading">
          {{ loading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account') }}
        </button>
      </form>

      <p class="auth-toggle">
        <template v-if="mode === 'login'">
          No account?
          <a href="#" @click.prevent="mode = 'register'">Sign up</a>
        </template>
        <template v-else>
          Have an account?
          <a href="#" @click.prevent="mode = 'login'">Sign in</a>
        </template>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: var(--bg-base);
}
.auth-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-lg);
  padding: 2rem 1.75rem;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow);
}
.auth-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  margin-bottom: 0.25rem;
}
.logo-icon {
  color: var(--accent-blue);
  font-size: 1.4rem;
}
.auth-sub {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-bottom: 1.75rem;
}
.auth-toggle {
  text-align: center;
  margin-top: 1.25rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}
</style>
