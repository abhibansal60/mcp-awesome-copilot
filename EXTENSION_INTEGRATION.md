# Extension Cache Integration

The MCP server now intelligently checks for cached data from your installed awesome-copilot-toolkit VS Code extension before making GitHub API calls.

## How It Works

1. **Primary Cache Check**: MCP server first checks its own in-memory cache
2. **Extension Cache Fallback**: If no local cache, it reads from the extension's VS Code global storage 
3. **GitHub API**: Only makes API calls if no valid cache is found

## Benefits

- **Reduced API Calls**: Leverages existing extension cache to minimize GitHub API usage
- **Faster Response**: Instant results when extension cache is available
- **Shared State**: Both extension and MCP server use the same underlying data

## Extension Cache Locations

The MCP server looks for extension cache in VS Code's global storage:

- **Windows**: `%APPDATA%\Code\User\globalStorage\awesome-copilot-toolkit\storage.json`
- **macOS**: `~/Library/Application Support/Code/User/globalStorage/awesome-copilot-toolkit/storage.json`  
- **Linux**: `~/.config/Code/User/globalStorage/awesome-copilot-toolkit/storage.json`

## Cache Validation

The extension cache is considered valid if:
- The `catalog:data` and `catalog:updatedAt` keys exist in storage
- Cache age is within the configured TTL (default 24 hours)

## Configuration

Use the `get_config` tool to see cache status:

```json
{
  "repo": "github/awesome-copilot",
  "branch": "main", 
  "maxItems": 15,
  "cacheTtlHours": 24,
  "tokenConfigured": true,
  "extensionCache": {
    "installed": true,
    "cacheAge": 2.3,
    "itemCount": 47
  }
}
```

## Behavior

- **Force Refresh**: `build_index(forceRefresh=true)` bypasses all caches
- **Search Expansion**: Uses extension cache as base when expanding search results
- **Fallback**: If extension cache is invalid/missing, falls back to GitHub API

This integration provides a seamless experience where your MCP server can benefit from the extension's existing cache without requiring separate API calls.
