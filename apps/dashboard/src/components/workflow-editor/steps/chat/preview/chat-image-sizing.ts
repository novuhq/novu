/**
 * Slack-measured image display bounds for Rich Chat editor + preview parity.
 * Images fit within max bounds while preserving aspect ratio and never
 * upscaling beyond natural size. Small images (e.g. 16×16) render at native size.
 */
export const CHAT_IMAGE_BOUNDS = {
  maxWidth: 600,
  maxHeight: 400,
} as const;

/**
 * Fit natural image dimensions into the chat max bounds, preserving aspect ratio
 * and never upscaling beyond the source size.
 */
export function fitChatImage(naturalWidth: number, naturalHeight: number): { width: number; height: number } {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: 0, height: 0 };
  }

  const scale = Math.min(1, CHAT_IMAGE_BOUNDS.maxWidth / naturalWidth, CHAT_IMAGE_BOUNDS.maxHeight / naturalHeight);

  return {
    width: Math.round(naturalWidth * scale),
    height: Math.round(naturalHeight * scale),
  };
}
