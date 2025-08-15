AGENT quickstart for MCP Awesome Copilot Server (Node + TypeScript)

## Quick Start Commands
```bash
# Build and start server
cd server && npm i && npm run build && npm start

# Check server compatibility  
cd server && npm run build && npm run handshake

# Run tests
node tests/test-*.js
```

## Essential Environment Variables
- `GITHUB_TOKEN` or `GH_TOKEN` - Avoid GitHub API rate limits
- `AWESOME_COPILOT_REPO` - Default: `github/awesome-copilot`
- `AWESOME_COPILOT_BRANCH` - Default: `main`

## Architecture
- **Server**: `server/src/index.ts` - MCP server over stdio
- **Tools**: handshake, search, preview, install, build_index, get_config
- **Protocol**: MCP version 1.0, JSON over stdio
- **API**: GitHub REST API with caching

## Code Style
- TypeScript strict mode, ESM modules
- 2-space indent, camelCase vars, PascalCase interfaces
- ESM imports ending in `.js` when importing TS outputs
