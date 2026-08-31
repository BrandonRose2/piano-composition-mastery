export const MIN_SCORE_ZOOM = 0.6;
export const MAX_PDF_SCORE_ZOOM = 3;
export const MAX_IMAGE_SCORE_ZOOM = 4;
export const SCORE_ZOOM_STEP = 0.2;

export function clampScoreZoom(value: number, maximum: number): number {
  return Math.min(maximum, Math.max(MIN_SCORE_ZOOM, Number(value.toFixed(2))));
}

export function adjustScoreZoom(current: number, amount: number, maximum: number): number {
  return clampScoreZoom(current + amount, maximum);
}

/** Width scales independently of the PDF render buffer, allowing overflow-and-pan zoom. */
export function scoreZoomWidthPercent(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}
