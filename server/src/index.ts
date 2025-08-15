import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import { z } from "zod";
import { HandshakeResponse } from "./types/protocol.js";
import { ExtensionCacheService } from "./extensionCache.js";

// Lightweight shared types adapted from extension
type ItemType = "instruction" | "prompt" | "chatmode";
interface CatalogItem {
  id: string;
  type: ItemType;
  title: string;
  path: string;
  rawUrl: string;
  lastModified?: string;
  description: string;
  sha: string;
}

// Config via env for pluggability
let CONTENT_REPO = process.env.AWESOME_COPILOT_REPO || "github/awesome-copilot";
let CONTENT_BRANCH = process.env.AWESOME_COPILOT_BRANCH || "main";
let MAX_ITEMS = Math.max(1, Number(process.env.AWESOME_COPILOT_MAX_ITEMS || 15));
let CACHE_TTL_HOURS = Math.max(1, Number(process.env.AWESOME_COPILOT_CACHE_TTL_HOURS || 24));
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "mcp-awesome-copilot-server",
    Accept: "application/vnd.github.v3+json",
  };
  if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

// Minimal fetch wrapper with rate-limit friendliness
async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function checkRateLimit(): Promise<void> {
  try {
    const res = await fetch("https://api.github.com/rate_limit", { headers: ghHeaders() });
    if (!res.ok) return;
    const json = await res.json();
    const remaining = json?.resources?.core?.remaining ?? 60;
    const reset = json?.resources?.core?.reset ?? Math.ceil(Date.now() / 1000);
    if (remaining <= 0) {
      const waitMs = Math.max(0, reset * 1000 - Date.now()) + 1000;
      await delay(waitMs);
    } else if (remaining <= 2) {
      await delay(1000);
    }
  } catch {
    await delay(250);
  }
}

type GitTreeEntry = { path: string; type: "blob" | "tree"; sha: string };

async function fetchFullTree(): Promise<GitTreeEntry[]> {
  await checkRateLimit();
  const branchUrl = `https://api.github.com/repos/${CONTENT_REPO}/branches/${encodeURIComponent(CONTENT_BRANCH)}`;
  const branchResp = await fetch(branchUrl, { headers: ghHeaders() });
  if (!branchResp.ok) throw new Error(`Failed to read branch info: ${branchResp.status}`);
  const branchInfo = await branchResp.json();
  const treeSha: string = branchInfo?.commit?.commit?.tree?.sha;
  const treeUrl = `https://api.github.com/repos/${CONTENT_REPO}/git/trees/${treeSha}?recursive=1`;
  const treeResp = await fetch(treeUrl, { headers: ghHeaders() });
  if (!treeResp.ok) throw new Error(`Failed to read repo tree: ${treeResp.status}`);
  const tree = await treeResp.json();
  await delay(150);
  return (tree.tree || []) as GitTreeEntry[];
}

async function fetchFileContentRaw(url: string): Promise<string> {
  await checkRateLimit();
  const resp = await fetch(url, { headers: ghHeaders() });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  const txt = await resp.text();
  await delay(75);
  return txt;
}

function hasCorrectExtension(filename: string, type: ItemType): boolean {
  if (type === "instruction") return filename.endsWith(".instructions.md");
  if (type === "prompt") return filename.endsWith(".prompt.md");
  if (type === "chatmode") return filename.endsWith(".chatmode.md");
  return false;
}

function extractTitle(filename: string, type: ItemType): string {
  let title = filename;
  if (type === "instruction") title = title.replace(".instructions.md", "");
  if (type === "prompt") title = title.replace(".prompt.md", "");
  if (type === "chatmode") title = title.replace(".chatmode.md", "");
  return title.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function generateId(filename: string, type: ItemType): string {
  const base = filename.replace(/\.(instructions|prompt|chatmode)\.md$/, "");
  return `${type}-${base.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
}

function buildRawUrl(path: string): string {
  return `https://raw.githubusercontent.com/${CONTENT_REPO}/${CONTENT_BRANCH}/${path}`;
}

// Simple in-memory cache
let cachedItems: CatalogItem[] | null = null;
let cachedAt: number | null = null;

// Extension cache service
const extensionCache = new ExtensionCacheService();

function isCacheValid(): boolean {
  if (!cachedAt) return false;
  const diffHours = (Date.now() - cachedAt) / (1000 * 60 * 60);
  return diffHours < CACHE_TTL_HOURS;
}

async function buildIndex(forceRefresh = false): Promise<CatalogItem[]> {
  if (!forceRefresh && cachedItems && isCacheValid()) return cachedItems;

  // Try extension cache first
  if (!forceRefresh) {
    const extensionCachedItems = await extensionCache.getCachedCatalog(CACHE_TTL_HOURS);
    if (extensionCachedItems) {
      console.log('Using extension cache for index');
      cachedItems = extensionCachedItems;
      cachedAt = Date.now();
      return extensionCachedItems;
    }
  }

  console.log('Fetching from GitHub API');
  const tree = await fetchFullTree();
  const candidates: Array<{ path: string; type: ItemType }> = [];
  for (const entry of tree) {
    if (entry.type !== "blob") continue;
    const filename = entry.path.split("/").pop() || entry.path;
    if (entry.path.startsWith("instructions/") && hasCorrectExtension(filename, "instruction")) {
      candidates.push({ path: entry.path, type: "instruction" });
    } else if (entry.path.startsWith("prompts/") && hasCorrectExtension(filename, "prompt")) {
      candidates.push({ path: entry.path, type: "prompt" });
    } else if (entry.path.startsWith("chatmodes/") && hasCorrectExtension(filename, "chatmode")) {
      candidates.push({ path: entry.path, type: "chatmode" });
    }
  }

  const limited = candidates.slice(0, Math.max(1, MAX_ITEMS));
  const items: CatalogItem[] = limited.map(({ path, type }) => {
    const filename = path.split("/").pop() || path;
    return {
      id: generateId(filename, type),
      type,
      title: extractTitle(filename, type),
      path,
      rawUrl: buildRawUrl(path),
      lastModified: "",
      description: "",
      sha: "",
    };
  });
  cachedItems = items;
  cachedAt = Date.now();
  return items;
}

function keywordSearch(items: CatalogItem[], query: string): CatalogItem[] {
  const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (keywords.length === 0) return [];
  return items.filter(item => {
    const searchable = [item.title.toLowerCase(), item.type.toLowerCase(), ...item.path.toLowerCase().split(/[\\/]/)].join(" ");
    return keywords.every(k => searchable.includes(k));
  });
}

async function expandIndexByKeywords(query: string): Promise<CatalogItem[]> {
  let existing = cachedItems ?? [];
  
  // Try extension cache if we don't have local cache
  if (existing.length === 0) {
    const extensionCachedItems = await extensionCache.getCachedCatalog(CACHE_TTL_HOURS);
    if (extensionCachedItems) {
      existing = extensionCachedItems;
      cachedItems = extensionCachedItems;
      cachedAt = Date.now();
    }
  }
  
  const tree = await fetchFullTree();
  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
  const candidates: Array<{ path: string; type: ItemType }> = [];
  for (const entry of tree) {
    if (entry.type !== "blob") continue;
    const lowerPath = entry.path.toLowerCase();
    const filename = entry.path.split("/").pop() || entry.path;
    let type: ItemType | undefined;
    if (lowerPath.startsWith("instructions/") && hasCorrectExtension(filename, "instruction")) type = "instruction";
    else if (lowerPath.startsWith("prompts/") && hasCorrectExtension(filename, "prompt")) type = "prompt";
    else if (lowerPath.startsWith("chatmodes/") && hasCorrectExtension(filename, "chatmode")) type = "chatmode";
    if (!type) continue;
    const haystack = [type, ...entry.path.toLowerCase().split(/[\\/]/)].join(" ");
    if (keywords.every(k => haystack.includes(k))) candidates.push({ path: entry.path, type });
  }
  const limited = candidates.slice(0, Math.max(1, Math.min(MAX_ITEMS, 50)));
  const repo = CONTENT_REPO, branch = CONTENT_BRANCH;
  const newItems: CatalogItem[] = limited.map(({ path, type }) => {
    const filename = path.split("/").pop() || path;
    return {
      id: generateId(filename, type),
      type,
      title: extractTitle(filename, type),
      path,
      rawUrl: `https://raw.githubusercontent.com/${repo}/${branch}/${path}`,
      lastModified: "",
      description: "",
      sha: "",
    };
  });
  const byPath = new Map<string, CatalogItem>();
  for (const item of [...existing, ...newItems]) byPath.set(item.path, item);
  const merged = Array.from(byPath.values());
  cachedItems = merged;
  cachedAt = Date.now();
  return merged;
}

// MCP server setup using the TypeScript SDK recommended APIs
const transport = new StdioServerTransport();
const packageVersion = "0.1.0"; // keep in sync with package.json
const mcp = new McpServer({ name: "mcp-awesome-copilot-server", version: packageVersion });

// Optional: Titles improve UI display in clients

// Handshake capability discovery (kept as a tool for backwards compatibility)
mcp.registerTool(
  "handshake",
  {
    title: "Handshake",
    description: "Return server and protocol compatibility info",
  },
  async (): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
    const resp: HandshakeResponse = {
      serverVersion: packageVersion,
      protocolVersions: ["1.0"],
      capabilities: ["listItems", "search", "install", "rateLimit", "setRepo"],
    };
    return { content: [{ type: "text", text: JSON.stringify(resp) }] };
  }
);

mcp.registerTool(
  "build_index",
  {
    title: "Build Index",
    description: "Build or refresh the catalog index from the configured GitHub repo.",
    inputSchema: { forceRefresh: z.boolean().optional() },
  },
  async ({ forceRefresh }) => {
    const items = await buildIndex(Boolean(forceRefresh));
    return { content: [{ type: "text", text: JSON.stringify(items) }] };
  }
);

mcp.registerTool(
  "search",
  {
    title: "Search Items",
    description: "Search items by keywords; expands index if nothing is found.",
    inputSchema: { query: z.string() },
  },
  async ({ query }) => {
    const base = await buildIndex(false);
    let results = keywordSearch(base, String(query || ""));
    if (results.length === 0) results = keywordSearch(await expandIndexByKeywords(String(query || "")), String(query || ""));
    return { content: [{ type: "text", text: JSON.stringify(results) }] };
  }
);

mcp.registerTool(
  "preview",
  {
    title: "Preview Item",
    description: "Fetch raw content for a given item path and return as markdown text.",
    inputSchema: { path: z.string() },
  },
  async ({ path }) => {
    const items = await buildIndex(false);
    const item = items.find(i => i.path === path);
    if (!item) throw new Error("Item not found in index; run build_index first");
    const content = await fetchFileContentRaw(item.rawUrl);
    return { content: [{ type: "text", text: JSON.stringify({ title: item.title, content, rawUrl: item.rawUrl }) }] };
  }
);

mcp.registerTool(
  "install",
  {
    title: "Install Suggested File",
    description: "Return a suggested filename and content for installing into a workspace.",
    inputSchema: { path: z.string() },
  },
  async ({ path }) => {
    const items = await buildIndex(false);
    const item = items.find(i => i.path === path);
    if (!item) throw new Error("Item not found in index; run build_index first");
    const content = await fetchFileContentRaw(item.rawUrl);
    const subfolder = item.type === "instruction" ? "copilot-instructions" : item.type === "prompt" ? "copilot-prompts" : "copilot-chatmodes";
    const relativeDir = `.github/${subfolder}`;
    const filename = item.path.split("/").pop() || `${item.id}.md`;
    return { content: [{ type: "text", text: JSON.stringify({ relativeDir, filename, content }) }] };
  }
);

mcp.registerTool(
  "rate_limit",
  {
    title: "GitHub Rate Limit",
    description: "Get current GitHub API rate limit info",
  },
  async () => {
    const res = await fetch("https://api.github.com/rate_limit", { headers: ghHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const core = json?.resources?.core || {};
    const resetTime = new Date((core.reset ?? Math.ceil(Date.now()/1000)) * 1000);
    const resetInSeconds = Math.max(0, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
    return { content: [{ type: "text", text: JSON.stringify({ remaining: core.remaining, limit: core.limit, resetTime: resetTime.toISOString(), resetInSeconds }) }] };
  }
);

mcp.registerTool(
  "set_repo",
  {
    title: "Set Repo/Branch",
    description: "Set the GitHub repo/branch and optional limits; clears cache.",
    inputSchema: {
      repo: z.string().optional(),
      branch: z.string().optional(),
      maxItems: z.number().int().min(1).optional(),
      cacheTtlHours: z.number().int().min(1).optional(),
    },
  },
  async ({ repo, branch, maxItems, cacheTtlHours }) => {
    CONTENT_REPO = (repo as string) || CONTENT_REPO;
    if (branch) CONTENT_BRANCH = String(branch);
    if (typeof maxItems === "number" && maxItems >= 1) MAX_ITEMS = Math.max(1, Math.floor(maxItems));
    if (typeof cacheTtlHours === "number" && cacheTtlHours >= 1) CACHE_TTL_HOURS = Math.max(1, Math.floor(cacheTtlHours));
    cachedItems = null; cachedAt = null;
    return { content: [{ type: "text", text: JSON.stringify({ repo: CONTENT_REPO, branch: CONTENT_BRANCH, maxItems: MAX_ITEMS, cacheTtlHours: CACHE_TTL_HOURS }) }] };
  }
);

mcp.registerTool(
  "get_config",
  {
    title: "Get Server Config",
    description: "Return current server configuration",
  },
  async () => {
    const extensionCacheInfo = await extensionCache.getCacheInfo();
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          repo: CONTENT_REPO, 
          branch: CONTENT_BRANCH, 
          maxItems: MAX_ITEMS, 
          cacheTtlHours: CACHE_TTL_HOURS, 
          tokenConfigured: Boolean(GITHUB_TOKEN),
          extensionCache: extensionCacheInfo
        }) 
      }] 
    };
  }
);

// Resources
mcp.registerResource(
  "catalog-list",
  "catalog://items",
  {
    title: "Catalog Items",
    description: "List of catalog items from the configured GitHub repo",
    mimeType: "application/json",
  },
  async (uri) => {
    const items = await buildIndex(false);
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(items),
        },
      ],
    };
  }
);

mcp.registerResource(
  "catalog-item",
  new ResourceTemplate("catalog://item/{path}", {
    list: undefined,
    complete: {
      path: async (value: string) => {
        const items = await buildIndex(false);
        const v = (value ?? "").toLowerCase();
        return items
          .map(i => i.path)
          .filter(p => p.toLowerCase().startsWith(v))
          .slice(0, 50);
      },
    },
  }),
  {
    title: "Catalog Item",
    description: "Fetch the content of a specific catalog item by its path",
    mimeType: "application/json",
  },
  async (uri, { path }) => {
    const items = await buildIndex(false);
    const decodedPath = decodeURIComponent(String(path));
    const item = items.find((i) => i.path === decodedPath);
    if (!item) {
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({ error: "Item not found. Run build_index and verify path." }),
          },
        ],
      };
    }
    const content = await fetchFileContentRaw(item.rawUrl);
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({ title: item.title, path: item.path, rawUrl: item.rawUrl, content }),
        },
      ],
    };
  }
);

// Prompt
mcp.registerPrompt(
  "preview-item",
  {
    title: "Preview Catalog Item",
    description: "Prepare a message with the content of a catalog item given its path",
    argsSchema: {
      path: completable(z.string(), async (value: string) => {
        const items = await buildIndex(false);
        const v = (value ?? "").toLowerCase();
        return items
          .map(i => i.path)
          .filter(p => p.toLowerCase().startsWith(v))
          .slice(0, 50);
      }),
    },
  },
  ({ path }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please preview and summarize the item at path: ${path}. If it's markdown, summarize key sections and suggest how to use it.`,
        },
      },
    ],
  })
);

async function runServer(): Promise<void> {
  await mcp.connect(transport);
}

// If HANDSHAKE=1, print handshake JSON to stdout and exit (for simple compatibility checks)
async function maybePrintHandshakeAndExit(): Promise<boolean> {
  if (process.env.HANDSHAKE === "1") {
    const resp: HandshakeResponse = {
      serverVersion: packageVersion,
      protocolVersions: ["1.0"],
      capabilities: ["listItems", "search", "install", "rateLimit", "setRepo"],
    };
    console.log(JSON.stringify(resp));
    return true;
  }
  return false;
}

async function main(): Promise<void> {
  const didPrint = await maybePrintHandshakeAndExit();
  if (!didPrint) {
    await runServer();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
