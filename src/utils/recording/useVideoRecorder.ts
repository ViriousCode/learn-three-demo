import { shallowRef, type Ref } from 'vue'
import { Muxer, ArrayBufferTarget } from 'webm-muxer'

interface RecorderOptions {
  width: number
  height: number
  fps?: number
  bitrate?: number
  filename?: string
}

export function useVideoRecorder() {
  const isRecording = shallowRef(false)
  const recordingProgress = shallowRef(0)
  
  let muxer: Muxer<ArrayBufferTarget> | null = null
  let videoEncoder: VideoEncoder | null = null
  let frameCount = 0
  let totalFrames = 0
  let options: Required<RecorderOptions>

  const startRecording = async (config: RecorderOptions, durationInSeconds: number) => {
    options = {
      fps: 60,
      bitrate: 10_000_000,
      filename: `shader-render-${Date.now()}.webm`,
      ...config
    }

    frameCount = 0
    totalFrames = durationInSeconds * options.fps
    isRecording.value = true

    // 1. 初始化 Muxer
    muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'V_VP9',
        width: options.width,
        height: options.height,
      },
      firstTimestampBehavior: 'offset'
    })

    // 2. 初始化 VideoEncoder
    videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer!.addVideoChunk(chunk, meta),
      error: (e) => console.error('VideoEncoder Error:', e),
    })

    videoEncoder.configure({
      codec: 'vp09.00.10.08',
      width: options.width,
      height: options.height,
      bitrate: options.bitrate,
    })

    console.log('Recording started...')
  }

  const captureFrame = async (canvas: HTMLCanvasElement) => {
    if (!videoEncoder || !isRecording.value) return

    const frame = new VideoFrame(canvas, {
      timestamp: (frameCount * 1_000_000) / options.fps,
    })

    videoEncoder.encode(frame, { keyFrame: frameCount % options.fps === 0 })
    frame.close()
    
    frameCount++
    recordingProgress.value = Math.round((frameCount / totalFrames) * 100)

    if (frameCount > totalFrames) {
      await stopRecording()
    }
  }

  const stopRecording = async () => {
    if (!videoEncoder || !muxer) return
    
    isRecording.value = false
    
    await videoEncoder.flush()
    muxer.finalize()

    const { buffer } = muxer.target
    const blob = new Blob([buffer], { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = options.filename
    a.click()

    // 清理资源
    videoEncoder = null
    muxer = null
    recordingProgress.value = 0
    console.log('Recording finished and downloaded')
  }

  return {
    isRecording,
    recordingProgress,
    startRecording,
    captureFrame,
    stopRecording
  }
}