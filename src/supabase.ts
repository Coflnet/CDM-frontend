import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'customer' | 'driver'
export type ContainerStatus = 'active' | 'scheduled_pickup' | 'picked_up' | 'ordered'
export type PickupStatus = 'pending' | 'driver_en_route' | 'completed' | 'cancelled'
export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  phone: string | null
  created_at: string
}

export interface Site {
  id: string
  customer_id: string
  name: string
  address: string
  lat: number | null
  lng: number | null
  created_at: string
}

export interface Container {
  id: string
  site_id: string
  container_type: string
  fill_state: number
  status: ContainerStatus
  delivered_at: string | null
  pickup_date: string | null
  driveway_video_url: string | null
  created_at: string
}

export interface Pickup {
  id: string
  container_id: string
  site_id: string
  customer_id: string
  scheduled_at: string
  status: PickupStatus
  driveway_video_url: string | null
  driver_id: string | null
  driver_eta: string | null
  driver_started_at: string | null
  notes: string | null
  created_at: string
}

export interface ContainerPhoto {
  id: string
  container_id: string
  photo_url: string
  fill_state: number
  taken_by: string
  created_at: string
}

export interface ContainerOrder {
  id: string
  customer_id: string
  site_id: string
  container_type: string
  quantity: number
  notes: string | null
  status: OrderStatus
  created_at: string
}
