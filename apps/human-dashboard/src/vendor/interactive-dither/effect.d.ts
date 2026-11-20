/** Types for the Interactive Dither developer export (effect.js, format version 1). */

export type DitherEffectSettings = {
  format: "interactive-dither"
  version: 1
  image: string
  renderScale: number
  [key: string]: unknown
}

export type DitherEffect = {
  readonly canvas: HTMLCanvasElement
  readonly currentTime: number
  readonly isPlaying: boolean
  readonly error: Error | null
  play(): void
  pause(): void
  seek(seconds: number): void
  resize(): void
  destroy(): void
}

export function createDitherEffect(options: {
  container: HTMLElement
  imageUrl?: string
  settings: DitherEffectSettings
  autoplay?: boolean
  signal?: AbortSignal
}): Promise<DitherEffect>
