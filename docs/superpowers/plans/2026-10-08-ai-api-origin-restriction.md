# AI API Origin Restriction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict the NAS AI endpoints (`/api/chat`, `/api/profile-chat`) so only `*.elevenbeans.me` pages (plus local dev) can use them, while keeping WeChat in-app browser working via a `Referer` fallback.

**Architecture:** A single pure-logic module `nas-portal/lib/cors.ts` owns the origin/referer allowlist and CORS header construction. Both route handlers gate `POST` through it (reject 403 before rate limit and inference) and answer `OPTIONS` from it. `next.config.ts` stops emitting static CORS headers so the route layer is the single source of truth.

**Tech Stack:** Next.js 15 App Router, TypeScript, Node 22 built-in test runner (`node --test` with `--experimental-strip-types`).

**Spec:** `docs/superpowers/specs/2026-10-08-ai-api-origin-restriction-design.md`

---

## File Structure

- `nas-portal/lib/cors.ts` — modify: allowlist matcher, request decision, CORS headers. Pure functions, no I/O.
- `nas-portal/lib/cors.test.ts` — create: unit tests for the pure helpers.
- `nas-portal/package.json` — modify: add a `test` script.
- `nas-portal/app/api/profile-chat/route.ts` — modify: gate `POST`.
- `nas-portal/app/api/chat/route.ts` — modify: gate `POST`, add `OPTIONS`, attach CORS headers.
- `nas-portal/next.config.ts` — modify: remove the static `/api/profile-chat` header block.
- `CHANGELOG.md` — modify: add a version entry.

Allowlist rule (final):
- `https` + hostname `elevenbeans.me` or `*.elevenbeans.me` → allowed.
- `http` + hostname `localhost` or `127.0.0.1` (any port) → allowed (dev).
- everything else → denied.

---

### Task 1: Allowlist and CORS helpers in `lib/cors.ts`

**Files:**
- Modify: `nas-portal/lib/cors.ts`
- Create: `nas-portal/lib/cors.test.ts`
- Modify: `nas-portal/package.json`

- [ ] **Step 1: Write the failing test**

Create `nas-portal/lib/cors.test.ts`:

```typescript
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
```

- [ ] **Step 2: Add the test script**

Edit `nas-portal/package.json` `scripts` to add:

```json
"test": "node --experimental-strip-types --test lib/cors.test.ts"
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test` (in `nas-portal`)
Expected: FAIL — `isAllowedUrl` is not exported / not a function.

- [ ] **Step 4: Implement `lib/cors.ts`**

Replace the whole file with:

```typescript
import type { NextRequest } from "next/server";

const ALLOWED_HOST = "elevenbeans.me";

function isAllowedHost(hostname: string): boolean {
  return hostname === ALLOWED_HOST || hostname.endsWith(`.${ALLOWED_HOST}`);
}

function isLocalDev(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isAllowedUrl(value: string | null): boolean {
  if (!value) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol === "https:") return isAllowedHost(url.hostname);
  if (url.protocol === "http:") return isLocalDev(url.hostname);
  return false;
}

export function isRequestAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (origin && origin !== "null") return isAllowedUrl(origin);
  return isAllowedUrl(req.headers.get("referer"));
}

export function corsHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (!isRequestAllowed(req)) return headers;

  const origin = req.headers.get("origin");
  headers["Access-Control-Allow-Origin"] =
    origin && origin !== "null" ? origin : "*";
  headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  headers["Access-Control-Allow-Headers"] = "Content-Type";
  headers["Access-Control-Max-Age"] = "86400";
  return headers;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test` (in `nas-portal`)
Expected: PASS — 5 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add nas-portal/lib/cors.ts nas-portal/lib/cors.test.ts nas-portal/package.json
git commit -m "feat: restrict AI API CORS to *.elevenbeans.me with referer fallback"
```

---

### Task 2: Gate `/api/profile-chat`

**Files:**
- Modify: `nas-portal/app/api/profile-chat/route.ts`

- [ ] **Step 1: Import the request decision helper**

Change the existing import line:

```typescript
import { corsHeaders } from "@/lib/cors";
```

to:

```typescript
import { corsHeaders, isRequestAllowed } from "@/lib/cors";
```

- [ ] **Step 2: Add the gate before rate limiting in `POST`**

Immediately after `export async function POST(req: NextRequest) {`, before
`if (isRateLimited(req))`, insert:

```typescript
  if (!isRequestAllowed(req)) {
    console.warn(
      "profile-chat: forbidden origin",
      "origin=" + (req.headers.get("origin") ?? "-"),
      "referer=" + (req.headers.get("referer") ?? "-")
    );
    return new Response(JSON.stringify({ error: "forbidden origin" }), {
      status: 403,
      headers: { "Content-Type": "application/json", Vary: "Origin" },
    });
  }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` (in `nas-portal`)
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add nas-portal/app/api/profile-chat/route.ts
git commit -m "feat: reject disallowed origins on profile-chat"
```

---

### Task 3: Gate `/api/chat` and add CORS/OPTIONS

**Files:**
- Modify: `nas-portal/app/api/chat/route.ts`

- [ ] **Step 1: Add the import**

Add after the existing imports:

```typescript
import { corsHeaders, isRequestAllowed } from "@/lib/cors";
```

- [ ] **Step 2: Add the gate before rate limiting in `POST`**

Immediately after `export async function POST(req: NextRequest) {`, before
`if (isRateLimited(req))`, insert:

```typescript
  if (!isRequestAllowed(req)) {
    console.warn(
      "chat: forbidden origin",
      "origin=" + (req.headers.get("origin") ?? "-"),
      "referer=" + (req.headers.get("referer") ?? "-")
    );
    return new Response(JSON.stringify({ error: "forbidden origin" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders(req) },
    });
  }
```

- [ ] **Step 3: Attach CORS headers to every `POST` response**

For each existing `return new Response(...)` in `POST` (the 429, the three 400s,
and the final streaming response), add `...corsHeaders(req)` to the `headers`
object.

- 429: `headers: { "Content-Type": "application/json", ...corsHeaders(req) }`
- invalid JSON 400: same
- invalid body 400: same
- invalid messages 400: same
- empty/too long 400: same
- final stream response: add `...corsHeaders(req)` after `"X-Accel-Buffering": "no",`

- [ ] **Step 4: Add the `OPTIONS` handler**

Append at the end of the file:

```typescript
export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit` (in `nas-portal`)
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add nas-portal/app/api/chat/route.ts
git commit -m "feat: restrict chat API to elevenbeans.me origins"
```

---

### Task 4: Remove redundant static CORS headers

**Files:**
- Modify: `nas-portal/next.config.ts`

- [ ] **Step 1: Drop the `headers()` block**

Replace the whole file with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` (in `nas-portal`)
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add nas-portal/next.config.ts
git commit -m "chore: let API routes own CORS headers"
```

---

### Task 5: Manual curl verification

**Files:** none (no code change)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (in `nas-portal`)
Expected: dev server on `http://localhost:3001`.

- [ ] **Step 2: Allowed origins return 200 and echo ACAO**

```bash
curl -s -o /dev/null -w "%{http_code} %{header_json}\n" -X POST http://localhost:3001/api/profile-chat \
  -H 'Content-Type: application/json' -H 'Origin: https://blog.elevenbeans.me' \
  --data '{"messages":[{"role":"user","content":"hi"}]}'
```

Expected: `200`, and `access-control-allow-origin: ["https://blog.elevenbeans.me"]`.

- [ ] **Step 3: Disallowed origin returns 403 with no ACAO**

```bash
curl -s -D - -o /dev/null -X POST http://localhost:3001/api/profile-chat \
  -H 'Content-Type: application/json' -H 'Origin: https://evil.example' \
  --data '{"messages":[{"role":"user","content":"hi"}]}'
```

Expected: `403`, body `{"error":"forbidden origin"}`, no `Access-Control-Allow-Origin`.

- [ ] **Step 4: Null Origin + allowed Referer returns 200**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3001/api/profile-chat \
  -H 'Content-Type: application/json' -H 'Origin: null' -H 'Referer: https://elevenbeans.me/' \
  --data '{"messages":[{"role":"user","content":"hi"}]}'
```

Expected: `200`.

- [ ] **Step 5: Preflight for disallowed origin has no ACAO**

```bash
curl -s -D - -o /dev/null -X OPTIONS http://localhost:3001/api/chat -H 'Origin: https://evil.example'
```

Expected: `204` with no `Access-Control-Allow-Origin`.

- [ ] **Step 6: Same-origin portal request still works**

Open `http://localhost:3001/chat` and send a message.
Expected: streams a reply as before.

- [ ] **Step 7: Stop the dev server**

No commit (verification only).

---

### Task 6: Changelog

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add a new version section at the top of the version list**

After the `# Changelog` heading and before the `## v1.0` entry, insert:

```markdown
## v3.7.5 (2026-10-08)

- **AI API origin restriction** — `/api/chat` and `/api/profile-chat` now accept requests only from `*.elevenbeans.me` pages (apex included) and local dev origins (`http://localhost:*`, `http://127.0.0.1:*`). Disallowed callers get a `403` before rate-limit accounting and before any Ollama inference; `Access-Control-Allow-Origin` is echoed only for allowed origins. WeChat's in-app browser (opaque/absent `Origin`) is supported via a `Referer` fallback, so the v3.7.2 fix is preserved. Denied requests log their `origin`/`referer` for troubleshooting.
```

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: changelog v3.7.5 — AI API origin restriction"
```

---

## Self-Review Notes

- Spec coverage: allowlist (Task 1), request decision incl. referer fallback (Task 1), 403-before-inference (Tasks 2–3), CORS echo/omit (Tasks 1–3), next.config cleanup (Task 4), verification matrix (Task 5), changelog (Task 6). Frontend untouched.
- The spec's dev-origin wording is approximated by "any http port on localhost/127.0.0.1"; this is a superset of the listed `:8080`/`:3001` and is dev-only.
- The route handlers cannot be unit-tested without a running Next server, so they are covered by the Task 5 curl matrix.
- WeChat `Referer`-on-preflight remains an assumption; Task 2/3 denial logs let the user confirm after `npm run sync`.
