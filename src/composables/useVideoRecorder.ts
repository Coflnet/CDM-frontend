import { ref, nextTick } from 'vue'

export function useVideoRecorder() {
  const step = ref<'form' | 'video'>('form')
  const recording = ref(false)
  const videoBlob = ref<Blob | null>(null)
  const videoPreviewUrl = ref('')
  const videoEl = ref<HTMLVideoElement | null>(null)
  const stream = ref<MediaStream | null>(null)
  const cameraError = ref('')

  const chunks: BlobPart[] = []
  let mediaRecorder: MediaRecorder | null = null

  async function openCamera(): Promise<void> {
    step.value = 'video'
    await nextTick()
    try {
      stream.value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      await nextTick()
      if (videoEl.value) {
        videoEl.value.srcObject = stream.value
        videoEl.value.play()
      }
    } catch (e: unknown) {
      cameraError.value = 'Kamerazugriff verweigert: ' + (e instanceof Error ? e.message : String(e))
      step.value = 'form'
    }
  }

  function startRecording(): void {
    if (!stream.value) return
    chunks.length = 0
    const mr = new MediaRecorder(stream.value, { mimeType: 'video/webm' })
    mediaRecorder = mr
    mr.ondataavailable = (e) => chunks.push(e.data)
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      videoBlob.value = blob
      videoPreviewUrl.value = URL.createObjectURL(blob)
      stream.value?.getTracks().forEach(t => t.stop())
      stream.value = null
    }
    mr.start()
    recording.value = true
  }

  function stopRecording(): void {
    mediaRecorder?.stop()
    recording.value = false
  }

  function stopCamera(): void {
    stream.value?.getTracks().forEach(t => t.stop())
    stream.value = null
  }

  async function rerecord(): Promise<void> {
    videoPreviewUrl.value = ''
    videoBlob.value = null
    await openCamera()
  }

  return {
    step,
    recording,
    videoBlob,
    videoPreviewUrl,
    videoEl,
    stream,
    cameraError,
    openCamera,
    startRecording,
    stopRecording,
    stopCamera,
    rerecord,
  }
}
