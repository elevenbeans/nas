import { readdirSync, statSync } from "fs";
import { lookup } from "dns/promises";
import path from "path";
import { resolveSafePath } from "@/lib/api-utils";
import { getSystemStatus } from "@/lib/system-status";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description?: string }>;
      required: string[];
    };
  };
}

export const NAS_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_system_status",
      description:
        "Get the current NAS system status: storage usage (used/total/percent), whether the SMB service is running, and the LAN IP address.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description:
        "List the contents of a directory on the NAS. path is relative to the NAS data root (e.g. \"/\" or \"/Photos\"). Returns file names, whether each is a directory, and sizes. Restricted folders like Movies show only name and size over the external network.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Directory path relative to the NAS data root, e.g. / or /Photos",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description:
        "Fetch and summarize the text content of a public HTTPS web page. Only https:// URLs are allowed; localhost and private network addresses are blocked.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The https:// URL to fetch" },
        },
        required: ["url"],
      },
    },
  },
];

const MAX_FETCH_BYTES = 200_000;
const MAX_FETCH_TEXT = 20_000;
const FETCH_TIMEOUT_MS = 10_000;

function isPrivateIp(ip: string): boolean {
  if (ip === "0.0.0.0" || ip === "::" || ip === "::1") return true;
  if (ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip.startsWith("172.")) {
    const second = parseInt(ip.split(".")[1] ?? "", 10);
    if (!Number.isNaN(second) && second >= 16 && second <= 31) return true;
  }
  return false;
}

async function validatePublicUrl(rawUrl: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("invalid url");
  }
  if (parsed.protocol !== "https:") throw new Error("only https urls are allowed");
  const hostname = parsed.hostname;
  if (!hostname) throw new Error("invalid url");
  try {
    const addresses = await lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateIp(addr.address)) throw new Error("private network addresses are blocked");
    }
  } catch (err) {
    if (err instanceof Error && err.message === "private network addresses are blocked") throw err;
    throw new Error("dns resolution failed");
  }
  return parsed.toString();
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function listFiles(args: unknown): Promise<object> {
  const params = (args ?? {}) as { path?: unknown };
  const dir = typeof params.path === "string" && params.path ? params.path : "/";
  const fullPath = resolveSafePath(dir);
  if (!fullPath) return { error: "access denied" };
  try {
    const entries = readdirSync(fullPath);
    const items = entries
      .map((name) => {
        try {
          const p = path.join(fullPath, name);
          const s = statSync(p);
          return {
            name,
            isDirectory: s.isDirectory(),
            size: s.isDirectory() ? null : s.size,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((item: any) => !item.name.startsWith(".") && item.name !== "Docker");
    return { path: dir, items };
  } catch {
    return { error: "directory not found" };
  }
}

async function fetchUrl(args: unknown): Promise<string> {
  const params = (args ?? {}) as { url?: unknown };
  if (typeof params.url !== "string" || !params.url) return JSON.stringify({ error: "url required" });
  try {
    const url = await validatePublicUrl(params.url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) NAS-Channel/1.0" },
        redirect: "follow",
      });
      if (!res.ok) return JSON.stringify({ error: `http ${res.status}` });
      const buf = await res.arrayBuffer();
      const text = new TextDecoder("utf-8").decode(buf.slice(0, MAX_FETCH_BYTES));
      const plain = stripHtml(text).slice(0, MAX_FETCH_TEXT);
      return plain.length > 0 ? plain : JSON.stringify({ error: "no readable text content" });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : "fetch failed" });
  }
}

export async function executeNasTool(name: string, args: unknown): Promise<string> {
  switch (name) {
    case "get_system_status":
      try {
        return JSON.stringify(getSystemStatus());
      } catch {
        return JSON.stringify({ error: "failed to get system status" });
      }
    case "list_files":
      return JSON.stringify(await listFiles(args));
    case "fetch_url":
      return await fetchUrl(args);
    default:
      return JSON.stringify({ error: `unknown tool: ${name}` });
  }
}
