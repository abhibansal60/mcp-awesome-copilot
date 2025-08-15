# Test Scripts

This directory contains test scripts for the MCP server functionality.

## Available Tests

- `test-telemetry.js` - Tests telemetry functionality and statistics collection
- `test-intelligent-search.js` - Tests the intelligent search routing functionality  
- `test-multi-tech.js` - Tests multi-technology support and search capabilities

## Running Tests

To run any test script:

```bash
# From the project root directory
node tests/test-telemetry.js
node tests/test-intelligent-search.js
node tests/test-multi-tech.js
```

## Prerequisites

Before running tests, ensure:

1. The server is built:
   ```bash
   cd server && npm run build
   ```

2. Required environment variables are set (optional but recommended):
   - `GITHUB_TOKEN` or `GH_TOKEN` for higher rate limits
   - `AWESOME_COPILOT_REPO` if testing with a different repository
   - `AWESOME_COPILOT_BRANCH` if testing with a different branch

## Test Structure

All test scripts follow a similar pattern:
- Spawn the MCP server as a child process
- Send JSON-RPC requests via stdio
- Parse and display results
- Handle timeouts and errors gracefully

The tests are designed to work with the built server (`server/dist/index.js`) and communicate over stdio using the MCP protocol.
