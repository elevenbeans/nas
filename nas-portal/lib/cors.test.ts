import assert from "node:assert/strict";
import { test } from "node:test";
import type { NextRequest } from "next/server";
import { isAllowedUrl, isRequestAllowed, corsHeaders } from "./cors.ts";

function req(headers: Record<string, string>): NextRequest {
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  } as unknown as NextRequest;
}

test("isAllowedUrl allows apex and subdomains over https", () => {
  assert.equal(isAllowedUrl("https://elevenbeans.me"), true);
  assert.equal(isAllowedUrl("https://www.elevenbeans.me"), true);
  assert.equal(isAllowedUrl("https://blog.elevenbeans.me"), true);
  assert.equal(isAllowedUrl("https://nas.elevenbeans.me/chat"), true);
});

test("isAllowedUrl rejects lookalikes and other schemes", () => {
  assert.equal(isAllowedUrl("https://evil.example"), false);
  assert.equal(isAllowedUrl("https://evil-elevenbeans.me"), false);
  assert.equal(isAllowedUrl("https://elevenbeans.me.evil.com"), false);
  assert.equal(isAllowedUrl("http://elevenbeans.me"), false);
  assert.equal(isAllowedUrl(null), false);
  assert.equal(isAllowedUrl("not a url"), false);
});

test("isAllowedUrl allows local dev origins", () => {
  assert.equal(isAllowedUrl("http://localhost:8080"), true);
  assert.equal(isAllowedUrl("http://localhost:3001"), true);
  assert.equal(isAllowedUrl("http://127.0.0.1:11434"), true);
});

test("isRequestAllowed prefers Origin, falls back to Referer when opaque", () => {
  assert.equal(isRequestAllowed(req({ origin: "https://elevenbeans.me" })), true);
  assert.equal(isRequestAllowed(req({ origin: "https://evil.example" })), false);
  assert.equal(
    isRequestAllowed(req({ origin: "null", referer: "https://elevenbeans.me/" })),
    true
  );
  assert.equal(
    isRequestAllowed(req({ referer: "https://blog.elevenbeans.me/post" })),
    true
  );
  assert.equal(isRequestAllowed(req({ origin: "null" })), false);
  assert.equal(isRequestAllowed(req({})), false);
  assert.equal(
    isRequestAllowed(req({ origin: "https://evil.example", referer: "https://elevenbeans.me/" })),
    false
  );
});

test("corsHeaders echoes allowed Origin and omits ACAO when denied", () => {
  const allowed = corsHeaders(req({ origin: "https://blog.elevenbeans.me" }));
  assert.equal(allowed["Access-Control-Allow-Origin"], "https://blog.elevenbeans.me");
  assert.equal(allowed["Access-Control-Allow-Methods"], "POST, OPTIONS");
  assert.equal(allowed["Vary"], "Origin");

  const nullOrigin = corsHeaders(req({ origin: "null", referer: "https://elevenbeans.me/" }));
  assert.equal(nullOrigin["Access-Control-Allow-Origin"], "*");

  const denied = corsHeaders(req({ origin: "https://evil.example" }));
  assert.equal(denied["Access-Control-Allow-Origin"], undefined);
  assert.equal(denied["Vary"], "Origin");
});
