# mcp-awesome-copilot

A standalone MCP server (and optional thin client) that exposes curated GitHub content from `github/awesome-copilot` as tools.

## Packages
- `server/` — MCP server over stdio
- `client/` — sample Node client SDK (optional)
- `protocol/` — JSON Schemas and version contract

## Protocol
- Version: `1.0` (see `protocol/VERSION`)
- Handshake: MCP tool `handshake` or CLI `npm run handshake` prints JSON:

```json
{
  "serverVersion": "0.1.0",
  "protocolVersions": ["1.0"],
  "capabilities": ["listItems","search","install","rateLimit","setRepo"]
}
```

## How to use

### 1) Local development
- Install deps and build the server:
  ```bash
  cd server
  npm i
  npm run build
  npm start
  ```
  This starts the MCP server over stdio.

- Check compatibility (prints handshake JSON and exits):
  ```bash
  npm run build && npm run handshake
  ```

- Environment variables (optional):
  - `AWESOME_COPILOT_REPO` (default `github/awesome-copilot`)
  - `AWESOME_COPILOT_BRANCH` (default `main`)
  - `AWESOME_COPILOT_MAX_ITEMS` (default `15`)
  - `AWESOME_COPILOT_CACHE_TTL_HOURS` (default `24`)
  - `GITHUB_TOKEN` or `GH_TOKEN` to raise GitHub API limits

### 2) From another tool/agent
- If the tool supports MCP stdio servers, point it at the `mcp-awesome-copilot-server` executable (after `npm run build` the binary is `dist/index.js`, and if published to npm it will be available as `mcp-awesome-copilot-server`).
- First call a `handshake` tool or run with `HANDSHAKE=1` to validate `protocolVersions` includes `1.0` and discover `capabilities`.

### 3) From the VS Code extension
- In the Awesome Copilot Toolkit extension, run:
  - "Awesome Copilot: Install/Start MCP Server"
  - "Awesome Copilot: Check MCP Compatibility"
- You can change the start command via the `awesomeCopilotToolkit.mcp.serverCommand` setting.

## Repository

This folder is intended to be a separate Git repository.

- Initialize: `git init && git add . && git commit -m "chore: initial import"`
- Add remote and push as desired.

## License

MIT. See [LICENSE](LICENSE).
