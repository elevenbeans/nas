import assert from "node:assert/strict";
import { test } from "node:test";
import { CAROUSEL_SIZE, pickCarouselPhotos } from "./photo-pick.ts";

function library(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: `p${i}.jpg`,
    capturedAt: new Date(Date.UTC(2020, 0, 1 + i)).toISOString(),
  }));
}

test("carousel shows 16 photos", () => {
  assert.equal(CAROUSEL_SIZE, 16);
});

test("picks exactly CAROUSEL_SIZE distinct photos, newest first", () => {
  const picked = pickCarouselPhotos(library(80));
  assert.equal(picked.length, 16);
  assert.equal(new Set(picked.map((p) => p.name)).size, 16);
  for (let i = 1; i < picked.length; i++) {
    assert.ok(picked[i - 1].capturedAt >= picked[i].capturedAt, "not sorted newest-first");
  }
});

test("keeps the whole library when it is smaller than the carousel", () => {
  const tiny = library(3);
  assert.deepEqual(
    pickCarouselPhotos(tiny).map((p) => p.name),
    ["p2.jpg", "p1.jpg", "p0.jpg"]
  );
});

test("handles an empty library", () => {
  assert.deepEqual(pickCarouselPhotos([]), []);
});
