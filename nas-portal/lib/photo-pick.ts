export type TimelinePhoto = { name: string; capturedAt: string };

/** How many photos the dashboard carousel shows per session. */
export const CAROUSEL_SIZE = 16;

/**
 * Pick a random subset for the dashboard carousel and return it newest-first,
 * so the slider reads like a mini timeline.
 */
export function pickCarouselPhotos<T extends TimelinePhoto>(photos: readonly T[]): T[] {
  return photos
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, CAROUSEL_SIZE)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}
