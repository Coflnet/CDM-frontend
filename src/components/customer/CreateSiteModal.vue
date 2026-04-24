<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '../../supabase'
import type { Site } from '../../supabase'

const emit = defineEmits<{ (e: 'close'): void; (e: 'created', site: Site): void }>()

const name = ref('')
const address = ref('')
const error = ref('')
const loading = ref(false)

async function save() {
  if (!name.value.trim()) { error.value = 'Site name is required.'; return }
  if (!address.value.trim()) { error.value = 'Address is required.'; return }
  error.value = ''
  loading.value = true
  try {
    const { data, error: insertErr } = await supabase
      .from('sites')
      .insert({
        customer_id: '00000000-0000-0000-0000-000000000000',
        name: name.value.trim(),
        address: address.value.trim(),
      })
      .select()
      .single()
    if (insertErr) throw insertErr
    emit('created', data)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>Add New Site</h2>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <div v-if="error" class="alert alert-error mb-2">{{ error }}</div>

      <div class="form-group">
        <label>Site Name</label>
        <input v-model="name" type="text" placeholder="e.g. 45 Oak Ave Job Site" autofocus />
      </div>
      <div class="form-group">
        <label>Address</label>
        <input v-model="address" type="text" placeholder="123 Main St, City, State" />
      </div>

      <div class="row mt-3" style="gap:0.75rem">
        <button class="btn-ghost btn-block" @click="emit('close')">Cancel</button>
        <button class="btn-primary btn-block" @click="save" :disabled="loading">
          {{ loading ? 'Saving...' : 'Create Site' }}
        </button>
      </div>
    </div>
  </div>
</template>
