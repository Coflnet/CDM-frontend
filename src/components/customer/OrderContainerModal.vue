<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../../supabase'
import { authState } from '../../store/auth'
import type { Site, ContainerOrder } from '../../supabase'

const props = defineProps<{ sites: Site[] }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'ordered'): void }>()

const siteId = ref(props.sites[0]?.id ?? '')
const containerType = ref('10yd')
const quantity = ref(1)
const notes = ref('')
const error = ref('')
const loading = ref(false)
const pastOrders = ref<ContainerOrder[]>([])

const containerTypes = ['10yd', '15yd', '20yd', '30yd', '40yd']

onMounted(async () => {
  const { data } = await supabase
    .from('container_orders')
    .select('*')
    .eq('customer_id', authState.user!.id)
    .order('created_at', { ascending: false })
    .limit(3)
  pastOrders.value = data ?? []
})

function reorder(order: ContainerOrder) {
  siteId.value = order.site_id
  containerType.value = order.container_type
  quantity.value = order.quantity
  notes.value = order.notes
}

async function save() {
  if (!siteId.value) { error.value = 'Please select a site.'; return }
  error.value = ''
  loading.value = true
  try {
    const { error: insertErr } = await supabase.from('container_orders').insert({
      customer_id: authState.user!.id,
      site_id: siteId.value,
      container_type: containerType.value,
      quantity: quantity.value,
      notes: notes.value,
      status: 'pending',
    })
    if (insertErr) throw insertErr
    emit('ordered')
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
        <h2>Order New Container</h2>
        <button class="modal-close" @click="emit('close')">&times;</button>
      </div>

      <div v-if="error" class="alert alert-error mb-2">{{ error }}</div>

      <div v-if="pastOrders.length" class="past-orders mb-2">
        <p class="section-title">Re-order Previous</p>
        <div class="stack">
          <div v-for="o in pastOrders" :key="o.id" class="past-order-row row-between card" style="padding:0.75rem">
            <div>
              <span class="text-sm font-bold">{{ o.quantity }}x {{ o.container_type }}</span>
              <p class="text-sm text-muted">{{ sites.find(s => s.id === o.site_id)?.name ?? 'Unknown site' }}</p>
            </div>
            <button class="btn-ghost btn-sm" @click="reorder(o)">Reorder</button>
          </div>
        </div>
        <hr class="divider" />
      </div>

      <div class="form-group">
        <label>Site</label>
        <select v-model="siteId">
          <option v-for="s in sites" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>Container Size</label>
        <select v-model="containerType">
          <option v-for="t in containerTypes" :key="t" :value="t">{{ t }} Dumpster</option>
        </select>
      </div>
      <div class="form-group">
        <label>Quantity</label>
        <input type="number" v-model.number="quantity" min="1" max="10" />
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea v-model="notes" rows="2" placeholder="Any special instructions..."></textarea>
      </div>

      <div class="row mt-3" style="gap:0.75rem">
        <button class="btn-ghost btn-block" @click="emit('close')">Cancel</button>
        <button class="btn-primary btn-block" @click="save" :disabled="loading">
          {{ loading ? 'Ordering...' : 'Place Order' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-bold { font-weight: 700; }
</style>
