import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
}

let authInitError: unknown = null

function hasFirebaseConfig(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId)
}

function createAuth(): Auth | null {
  if (!hasFirebaseConfig()) return null
  try {
    return getAuth(initializeApp(firebaseConfig))
  } catch (error) {
    authInitError = error
    return null
  }
}

export const auth = createAuth()

function requireAuth(): Auth {
  if (auth) return auth
  if (authInitError instanceof Error) throw authInitError
  throw new Error('Firebase authentication is not configured. Set the VITE_FIREBASE_* environment variables.')
}

export async function firebaseSignIn(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(requireAuth(), email, password)
  return cred.user
}

export async function firebaseSignUp(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(requireAuth(), email, password)
  return cred.user
}

export async function firebaseSignOut(): Promise<void> {
  if (auth) await signOut(auth)
}

export function onFirebaseAuthStateChanged(cb: (user: User | null) => void): () => void {
  if (!auth) {
    queueMicrotask(() => cb(null))
    return () => {}
  }
  return onAuthStateChanged(auth, cb)
}

export async function getFirebaseIdToken(): Promise<string> {
  const user = auth?.currentUser
  if (!user) return ''
  return user.getIdToken()
}
