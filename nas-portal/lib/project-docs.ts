import { readFileSync } from "node:fs";
import path from "node:path";

export interface ProjectDocEntry {
  /** File paths relative to PROJECT_DOCS_ROOT. */
  files: string[];
  /** Public URL for the project. */
  url: string;
}

export const PROJECT_DOCS: Record<string, ProjectDocEntry> = {
  myprofile: { files: ["myprofile/README.md"], url: "https://elevenbeans.me" },
  nas: {
    files: ["nas/README.md", "nas/nas-portal/nas-portal-overview.md"],
    url: "https://nas.elevenbeans.me",
  },
  blog: { files: ["blog/README.md"], url: "https://blog.elevenbeans.me" },
  "game-of-life": { files: ["game-of-life/README.md"], url: "https://game.elevenbeans.me" },
};

export const PROJECT_DOC_KEYS = Object.keys(PROJECT_DOCS);

/**
 * Keyword → project mapping used for deterministic doc pre-fetch. Keys are the
 * canonical entries in PROJECT_DOCS; `nas` also covers `nas-portal`.
 */
export const PROJECT_KEYWORDS: Record<string, RegExp> = {
  nas: /\bnas\b|nas[- ]?portal|portal|\bsmb\b|tailscale|cloudflare|tunnel|存储|文件|照片|媒体|远程|内网|外网|服务状态/i,
  myprofile: /myprofile|profile|简历|个人主页|elevenbeans\.me/i,
  blog: /\bblog\b|博客/i,
  "game-of-life": /game of life|game-of-life|生命游戏|康威|conway/i,
};

const MAX_DOC_CHARS = 12_000;
const MAX_INJECT_CHARS = 6_000;

function docsRoot(): string {
  return process.env.PROJECT_DOCS_ROOT || "/Users/elevenbeans/code";
}

export const PROJECT_DOC_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_project_doc",
      description:
        "Read the documentation (README / overview) for one of elevenbeans' projects. Use this BEFORE answering any question about a specific project, and answer only from the returned content.",
      parameters: {
        type: "object",
        properties: {
          project: {
            type: "string",
            description: `Project key, one of: ${PROJECT_DOC_KEYS.join(", ")}`,
          },
        },
        required: ["project"],
      },
    },
  },
];

const BOX_DRAWING_RE = /[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬▶▼◀▲]/;

/** Drop ASCII-art / diagram lines that waste context and confuse the model. */
function cleanDoc(text: string): string {
  const kept = text
    .split("\n")
    .filter((line) => {
      const boxCount = (line.match(new RegExp(BOX_DRAWING_RE.source, "g")) || []).length;
      return boxCount <= 2;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  return kept.trim();
}

function readProjectContent(key: string, maxChars = MAX_DOC_CHARS): string | null {
  const entry = PROJECT_DOCS[key];
  if (!entry) return null;
  const root = docsRoot();
  const parts: string[] = [];
  for (const file of entry.files) {
    try {
      const text = cleanDoc(readFileSync(path.join(root, file), "utf8"));
      parts.push(`### ${file}\n${text}`);
    } catch {
      // skip missing file
    }
  }
  if (parts.length === 0) return null;
  return parts.join("\n\n").slice(0, maxChars);
}

export function getProjectDoc(project: unknown): string {
  const key = typeof project === "string" ? project.trim().toLowerCase() : "";
  const entry = PROJECT_DOCS[key];
  if (!entry) {
    return JSON.stringify({ error: "unknown project", available: PROJECT_DOC_KEYS });
  }
  const content = readProjectContent(key);
  if (!content) {
    return JSON.stringify({ error: "doc not found", project: key, url: entry.url });
  }
  return JSON.stringify({
    project: key,
    sources: entry.files,
    url: entry.url,
    content,
  });
}

export function executeProjectTool(name: string, args: unknown): string {
  if (name !== "get_project_doc") {
    return JSON.stringify({ error: `unknown tool: ${name}` });
  }
  const params = (args ?? {}) as { project?: unknown };
  return getProjectDoc(params.project);
}

/** Return canonical project keys whose keywords match any of the given texts. */
export function matchProjectDocs(...texts: Array<string | undefined>): string[] {
  const joined = texts.filter((t): t is string => typeof t === "string" && t.length > 0).join("\n");
  if (!joined) return [];
  const keys: string[] = [];
  for (const [key, re] of Object.entries(PROJECT_KEYWORDS)) {
    // Fresh regex per test to avoid lastIndex statefulness.
    if (new RegExp(re.source, re.flags).test(joined)) keys.push(key);
  }
  return keys;
}

/** Build an injectable documentation block for the given project keys. */
export function getProjectDocContext(keys: string[]): string {
  const blocks: string[] = [];
  for (const key of keys) {
    const content = readProjectContent(key, MAX_INJECT_CHARS);
    if (content) {
      blocks.push(`### Project: ${key} (${PROJECT_DOCS[key].url})\n${content}`);
    }
  }
  return blocks.join("\n\n").slice(0, MAX_INJECT_CHARS);
}
