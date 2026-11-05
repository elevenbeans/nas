import assert from "node:assert/strict";
import { test } from "node:test";
import { isMoviePath, isMovieResolvedPath } from "./network-utils.ts";

test("isMoviePath matches the Movies folder itself and anything below it", () => {
  assert.equal(isMoviePath("/Movies"), true);
  assert.equal(isMoviePath("Movies"), true);
  assert.equal(isMoviePath("/movies"), true);
  assert.equal(isMoviePath("/Movies/China/Shanghai/a.mkv"), true);
  assert.equal(isMoviePath("/Movies//China"), true);
});

test("isMoviePath normalizes dot segments before matching", () => {
  assert.equal(isMoviePath("/Photos/../Movies/a.mp4"), true);
  assert.equal(isMoviePath("/Photos/./../Movies/a.mp4"), true);
  assert.equal(isMoviePath("//Movies/a.mp4"), true);
  assert.equal(isMoviePath("/Photos/../../Movies/a.mp4"), true);
  assert.equal(isMoviePath("\\Movies\\a.mp4"), true);
});

test("isMoviePath does not match siblings with a shared prefix", () => {
  assert.equal(isMoviePath("/Movies2/a.mp4"), false);
  assert.equal(isMoviePath("/Photos"), false);
  assert.equal(isMoviePath("/Photos/Movies/a.jpg"), false);
  assert.equal(isMoviePath("/"), false);
  assert.equal(isMoviePath(""), false);
});

test("isMovieResolvedPath judges the path after resolution", () => {
  const base = "/Volumes/NAS-Data";
  assert.equal(isMovieResolvedPath(base, `${base}/Movies/a.mp4`), true);
  assert.equal(isMovieResolvedPath(base, `${base}/Photos/a.jpg`), false);
  assert.equal(isMovieResolvedPath(base, base), false);
  assert.equal(isMovieResolvedPath(base, "/tmp/Movies/a.mp4"), false);
});
