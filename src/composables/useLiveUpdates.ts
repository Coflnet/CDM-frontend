import { buildAuthHeaders, apiUrl } from '../api'

export interface LiveUpdateMessage {
  type: string
  data: unknown
  at: string
  customerId?: string | null
  companyId?: string | null
  driverUserId?: string | null
  actorUserId?: string | null
}

export interface LiveUpdatesOptions {
  onMessage: (message: LiveUpdateMessage) => void
  onError?: (error: Error) => void
  onOpen?: () => void
  onClose?: () => void
}

const RETRY_MIN_MS = 1000
const RETRY_MAX_MS = 15000

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, '\n')
}

function parseEventChunk(chunk: string): LiveUpdateMessage | null {
  const lines = chunk.split('\n').map(line => line.trimEnd())
  const dataLines = lines
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice('data:'.length).trim())

  if (dataLines.length === 0) return null

  try {
    return JSON.parse(dataLines.join('\n')) as LiveUpdateMessage
  } catch {
    return null
  }
}

export function useLiveUpdates(options: LiveUpdatesOptions) {
  let stopped = false
  let controller: AbortController | null = null

  async function consumeStream(signal: AbortSignal): Promise<void> {
    try {
      const response = await fetch(apiUrl('/live/stream'), {
        method: 'GET',
        headers: buildAuthHeaders(),
        signal,
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Live stream failed (${response.status})`)
      }

      if (!response.body) return

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      options.onOpen?.()

      while (!signal.aborted) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += normalizeNewlines(decoder.decode(value, { stream: true }))

        let delimiterIndex = buffer.indexOf('\n\n')
        while (delimiterIndex >= 0) {
          const chunk = buffer.slice(0, delimiterIndex)
          buffer = buffer.slice(delimiterIndex + 2)
          const message = parseEventChunk(chunk)
          if (message) options.onMessage(message)
          delimiterIndex = buffer.indexOf('\n\n')
        }
      }
    } finally {
      options.onClose?.()
    }
  }

  async function start(): Promise<void> {
    stopped = false
    let retryDelay = RETRY_MIN_MS

    while (!stopped) {
      controller = new AbortController()
      try {
        await consumeStream(controller.signal)
        retryDelay = RETRY_MIN_MS
      } catch (error) {
        if (stopped || controller.signal.aborted) break
        options.onError?.(error instanceof Error ? error : new Error(String(error)))
      }

      if (stopped) break
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS)
    }
  }

  function stop(): void {
    stopped = true
    controller?.abort()
    controller = null
  }

  return { start, stop }
}
