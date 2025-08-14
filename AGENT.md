AGENT quickstart for this repo (Node + TypeScript, MCP stdio)

Build/run commands
- Server: cd server && npm i && npm run build && npm start
- Dev (server): cd server && npm run dev (ts-node-esm)
- Handshake check: cd server && npm run build && npm run handshake (prints JSON)
- Sample client: cd client/sample-client && npm i && npm run build && npm start
- Tests: none configured (no jest/vitest). Single-test running is N/A until a test runner is added.

Architecture and structure
- Packages: server/ (MCP server over stdio), client/sample-client/ (SDK example), protocol/ (JSON Schemas + version)
- Server entry: server/src/index.ts exposes MCP tools: handshake, build_index, search, preview, install, rate_limit, set_repo, get_config
- Client entry: client/sample-client/src/index.ts spawns the built server (dist/index.js) via stdio and calls the tools
- Protocol: version file protocol/VERSION and JSON schema protocol/schemas/handshake.schema.json; server types in server/src/types/protocol.ts
- External API: GitHub REST API (repo tree + raw content); optional auth via GITHUB_TOKEN/GH_TOKEN; basic in-memory caching

Code style and conventions
- TypeScript: strict true, ES2021 target, ES2020 modules, ESM throughout ("type":"module") — see server/tsconfig.json and client/sample-client/tsconfig.json
- Imports: ESM paths ending in .js when importing TS outputs (e.g., "./types/protocol.js"); Node stdlib via node: specifier
- Formatting/linting: no ESLint/Prettier configs present; follow idiomatic TS, 2-space indent; add lint later if needed
- Types/naming: camelCase for vars/functions; PascalCase for interfaces; narrow types (e.g., union ItemType); prefer explicit return types
- Error handling: throw Error in tool handlers; top-level main() catches/logs and exits(1) on failure

Operational notes
- Env vars: AWESOME_COPILOT_REPO, AWESOME_COPILOT_BRANCH, AWESOME_COPILOT_MAX_ITEMS, AWESOME_COPILOT_CACHE_TTL_HOURS, GITHUB_TOKEN/GH_TOKEN
- Rate limits handled with lightweight backoff; set token to raise limits; cache TTL configurable via set_repo tool
