## Awesome Copilot MCP Server

Exposes the GitHub `awesome-copilot` content as Model Context Protocol (MCP) tools, mirroring the VS Code extension features: index, search, preview, install suggestion, and rate limit info.

### Features
- Build and cache an index of items (instructions, prompts, chat modes)
- Keyword search with automatic index expansion
- Fetch raw markdown content for preview
- Provide install suggestions (relative directory and filename)
- Report GitHub API rate limit

### Configuration (env vars)
- `AWESOME_COPILOT_REPO` (default: `github/awesome-copilot`)
- `AWESOME_COPILOT_BRANCH` (default: `main`)
- `AWESOME_COPILOT_MAX_ITEMS` (default: `15`)
- `AWESOME_COPILOT_CACHE_TTL_HOURS` (default: `24`)

### Tools
- `build_index({ forceRefresh?: boolean })` → Catalog items
- `search({ query: string })` → Catalog items
- `preview({ path: string })` → `{ title, content, rawUrl }`
- `install({ path: string })` → `{ relativeDir, filename, content }`
- `rate_limit()` → `{ remaining, limit, resetTime, resetInSeconds }`
- `set_repo({ repo: string, branch?: string, maxItems?: number, cacheTtlHours?: number })` → current config
- `get_config()` → current config

### Install & Run
```bash
cd mcp-server
npm install
npm run build
npm start
```

The server communicates over stdio as per MCP. Point your MCP-enabled client at the process.

To avoid GitHub anonymous rate limits, set `GITHUB_TOKEN` (or `GH_TOKEN`) in your environment.


