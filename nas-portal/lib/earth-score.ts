import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { NextRequest } from "next/server";

/**
 * Shared "Earth Online" city scores.
 *
 * Storage is a single JSON file (atomic writes) so the endpoint needs no
 * database. Sessions and rate-limit buckets are intentionally in-memory:
 * a restart invalidates session tokens, and the client simply requests a new
 * one. City scores are persistent.
 */

export const CITY_IDS = [
  "beijing",
  "shanghai",
  "chengdu",
  "hongkong",
  "tokyo",
  "seoul",
  "singapore",
  "mumbai",
  "dubai",
  "moscow",
  "cairo",
  "capetown",
  "london",
  "paris",
  "newyork",
  "sanfrancisco",
  "saopaulo",
  "sydney",
  "xian",
  "chongqing",
  "shenzhen",
  "guangzhou",
  "lhasa",
  "taipei",
  "amsterdam",
  "berlin",
  "pyongyang",
  "istanbul",
  "hochiminh",
  "bangkok",
  "toronto",
  "madrid",
  "rome",
  "melbourne",
  "lasvegas",
  "urumqi",
  "kualalumpur",
  "chicago",
  "barcelona",
  "santiago",
  "casablanca",
  "osaka",
  "jakarta",
  "nanjing",
  "marrakech",
  "vancouver",
] as const;

export type CityId = (typeof CITY_IDS)[number];
export type ScoreAction = "focus" | "detail";

export const POINTS: Record<ScoreAction, number> = {
  focus: 5,
  detail: 10,
};

const SCORE_FILE =
  process.env.EARTH_SCORE_FILE ||
  path.join(process.cwd(), ".data", "earth-online-scores.json");

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const RECENT_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS: Record<ScoreAction, number> = {
  focus: 800,
  detail: 1500,
};

interface StoredScores {
  scores: Record<string, number>;
  updatedAt: number;
}

export interface ScoreSnapshot {
  scores: Record<string, number>;
  total: number;
  updatedAt: number;
}

export interface AddEventInput {
  token: string;
  cityId: CityId;
  action: ScoreAction;
  eventId: string;
}

export interface AddEventResult extends ScoreSnapshot {
  awarded: number;
  duplicate?: boolean;
  rateLimited?: boolean;
  retryAfter?: number;
}

const sessions = new Map<string, number>();
const cooldowns = new Map<string, number>();
const recentEvents = new Map<string, { expiresAt: number; awarded: number }>();
const ipBuckets = new Map<string, number[]>();

let data: StoredScores | null = null;
let loadPromise: Promise<StoredScores> | null = null;
let writeChain: Promise<void> = Promise.resolve();
let lock: Promise<unknown> = Promise.resolve();

function emptyScores(): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const id of CITY_IDS) scores[id] = 0;
  return scores;
}

function normalizeScores(input: unknown): Record<string, number> {
  const scores = emptyScores();
  if (!input || typeof input !== "object") return scores;
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!(CITY_IDS as readonly string[]).includes(key)) continue;
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    scores[key] = Math.max(0, Math.min(1_000_000_000, Math.round(raw)));
  }
  return scores;
}

function snapshot(source: StoredScores): ScoreSnapshot {
  const scores: Record<string, number> = {};
  let total = 0;
  for (const id of CITY_IDS) {
    const value = source.scores[id] ?? 0;
    scores[id] = value;
    total += value;
  }
  return { scores, total, updatedAt: source.updatedAt };
}

async function ensureLoaded(): Promise<StoredScores> {
  if (data) return data;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await fs.readFile(SCORE_FILE, "utf8");
        const parsed = JSON.parse(raw) as Partial<StoredScores>;
        data = {
          scores: normalizeScores(parsed.scores),
          updatedAt:
            typeof parsed.updatedAt === "number" && parsed.updatedAt > 0
              ? parsed.updatedAt
              : 0,
        };
      } catch (err) {
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code !== "ENOENT") {
          console.error("[earth-score] failed to read scores:", err);
        }
        data = { scores: emptyScores(), updatedAt: 0 };
      }
      return data;
    })();
  }
  return loadPromise;
}

function persist(source: StoredScores): Promise<void> {
  const payload = JSON.stringify(source);
  writeChain = writeChain
    .then(async () => {
      await fs.mkdir(path.dirname(SCORE_FILE), { recursive: true });
      const tmp = `${SCORE_FILE}.tmp`;
      await fs.writeFile(tmp, payload, "utf8");
      await fs.rename(tmp, SCORE_FILE);
    })
    .catch((err) => {
      console.error("[earth-score] failed to persist scores:", err);
    });
  return writeChain;
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function pruneSessions(now: number): void {
  if (sessions.size < 2000) return;
  for (const [token, createdAt] of sessions) {
    if (now - createdAt > SESSION_TTL_MS) sessions.delete(token);
  }
}

function pruneRecent(now: number): void {
  if (recentEvents.size < 2000) return;
  for (const [key, value] of recentEvents) {
    if (value.expiresAt <= now) recentEvents.delete(key);
  }
}

function pruneCooldowns(now: number): void {
  if (cooldowns.size < 5000) return;
  for (const [key, at] of cooldowns) {
    if (now - at > 10 * 60 * 1000) cooldowns.delete(key);
  }
}

export function isCityId(value: unknown): value is CityId {
  return (
    typeof value === "string" &&
    (CITY_IDS as readonly string[]).includes(value)
  );
}

export function isScoreAction(value: unknown): value is ScoreAction {
  return value === "focus" || value === "detail";
}

export function isValidEventId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,100}$/.test(value);
}

export function issueSession(): { token: string; expiresIn: number } {
  const now = Date.now();
  pruneSessions(now);
  const token = randomBytes(24).toString("hex");
  sessions.set(token, now);
  return { token, expiresIn: Math.floor(SESSION_TTL_MS / 1000) };
}

export function isValidSession(token: string): boolean {
  const createdAt = sessions.get(token);
  if (!createdAt) return false;
  if (Date.now() - createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function getClientIp(req: NextRequest): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "local";
}

/** Sliding-window limiter. Returns true when the caller is over the limit. */
export function isIpRateLimited(
  ip: string,
  scope: string,
  max: number,
  windowMs: number
): boolean {
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const cutoff = now - windowMs;
  if (ipBuckets.size > 2000) {
    for (const [bucketKey, times] of ipBuckets) {
      const fresh = times.filter((t) => t > cutoff);
      if (fresh.length === 0) ipBuckets.delete(bucketKey);
      else ipBuckets.set(bucketKey, fresh);
    }
  }
  const times = (ipBuckets.get(key) ?? []).filter((t) => t > cutoff);
  if (times.length >= max) {
    ipBuckets.set(key, times);
    return true;
  }
  times.push(now);
  ipBuckets.set(key, times);
  return false;
}

export async function getScores(): Promise<ScoreSnapshot> {
  const stored = await ensureLoaded();
  return snapshot(stored);
}

export async function addEvent(input: AddEventInput): Promise<AddEventResult> {
  return withLock(async () => {
    const stored = await ensureLoaded();
    const now = Date.now();
    const eventKey = `${input.token}:${input.eventId}`;
    const seen = recentEvents.get(eventKey);
    if (seen && seen.expiresAt > now) {
      return {
        ...snapshot(stored),
        awarded: seen.awarded,
        duplicate: true,
      };
    }

    const cooldownKey = `${input.token}:${input.cityId}:${input.action}`;
    const last = cooldowns.get(cooldownKey) ?? 0;
    const remaining = COOLDOWN_MS[input.action] - (now - last);
    if (remaining > 0) {
      return {
        ...snapshot(stored),
        awarded: 0,
        rateLimited: true,
        retryAfter: Math.ceil(remaining / 1000),
      };
    }

    const points = POINTS[input.action];
    stored.scores[input.cityId] = Math.max(
      0,
      Math.min(1_000_000_000, (stored.scores[input.cityId] ?? 0) + points)
    );
    stored.updatedAt = now;

    cooldowns.set(cooldownKey, now);
    recentEvents.set(eventKey, {
      expiresAt: now + RECENT_TTL_MS,
      awarded: points,
    });
    pruneRecent(now);
    pruneCooldowns(now);
    pruneSessions(now);

    await persist(stored);
    return { ...snapshot(stored), awarded: points };
  });
}
