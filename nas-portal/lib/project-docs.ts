import { readFileSync } from "node:fs";
import path from "node:path";

export interface ProjectDocEntry {
  /** File path relative to PROJECT_DOCS_ROOT. */
  file: string;
  /** Public URL for the project. */
  url: string;
}

export const PROJECT_DOCS: Record<string, ProjectDocEntry> = {
  myprofile: { file: "myprofile/README.md", url: "https://elevenbeans.me" },
  nas: { file: "nas/README.md", url: "https://nas.elevenbeans.me" },
  "nas-portal": {
    file: "nas/nas-portal/nas-portal-overview.md",
    url: "https://nas.elevenbeans.me",
  },
  blog: { file: "blog/README.md", url: "https://blog.elevenbeans.me" },
  "game-of-life": { file: "game-of-life/README.md", url: "https://game.elevenbeans.me" },
};

export const PROJECT_DOC_KEYS = Object.keys(PROJECT_DOCS);

const MAX_DOC_CHARS = 20_000;

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

export function getProjectDoc(project: unknown): string {
  const key = typeof project === "string" ? project.trim().toLowerCase() : "";
  const entry = PROJECT_DOCS[key];
  if (!entry) {
    return JSON.stringify({
      error: "unknown project",
      available: PROJECT_DOC_KEYS,
    });
  }
  const root = process.env.PROJECT_DOCS_ROOT || "/Users/elevenbeans/code";
  const fullPath = path.join(root, entry.file);
  try {
    const content = readFileSync(fullPath, "utf8").slice(0, MAX_DOC_CHARS);
    return JSON.stringify({ project: key, source: entry.file, url: entry.url, content });
  } catch {
    return JSON.stringify({ error: "doc not found", project: key, url: entry.url });
  }
}

export function executeProjectTool(name: string, args: unknown): string {
  if (name !== "get_project_doc") {
    return JSON.stringify({ error: `unknown tool: ${name}` });
  }
  const params = (args ?? {}) as { project?: unknown };
  return getProjectDoc(params.project);
}
