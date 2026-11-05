import assert from "node:assert/strict";
import { test } from "node:test";
import type { NextRequest } from "next/server";
import { isExternalRequest, isMoviePath, isMovieResolvedPath } from "./network-utils.ts";

function reqWithHost(host: string): NextRequest {
  return {
    headers: { get: (name: string) => (name === "host" ? host : null) },
  } as unknown as NextRequest;
}

test("isExternalRequest treats the home network as internal", () => {
  for (const host of [
    "localhost",
    "localhost:3001",
    "127.0.0.1",
    "192.168.1.50",
    "192.168.1.50:3000",
    "10.0.0.2",
    "172.16.0.5",
    "172.31.255.254",
    "169.254.10.1",
    "elevenbeansdemac-mini.local",
    "elevenbeansdemac-mini.local:3000",
    "[::1]:3000",
  ]) {
    assert.equal(isExternalRequest(reqWithHost(host)), false, host);
  }
});

test("isExternalRequest keeps public hosts external", () => {
  for (const host of [
    "nas.elevenbeans.me",
    "elevenbeans.me",
    "172.15.0.5",
    "172.32.0.1",
    "192.169.1.1",
    "10.example.com",
    "fd.example.com",
    "",
  ]) {
    assert.equal(isExternalRequest(reqWithHost(host)), true, host);
  }
});

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
