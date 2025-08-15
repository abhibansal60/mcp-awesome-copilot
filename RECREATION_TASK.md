# MCP Awesome Copilot Server Recreation Task

## Overview
Create a comprehensive Model Context Protocol (MCP) server that exposes curated GitHub content from the `github/awesome-copilot` repository as searchable tools and resources. This server implements intelligent search routing, telemetry, extension caching, and provides multiple ways to discover and consume copilot instructions, prompts, and chat modes.

## Core Functionality Requirements

### 1. MCP Server Foundation
- **Protocol**: MCP version 1.0 over stdio transport
- **Language**: TypeScript with strict mode and ESM modules
- **Dependencies**: `@modelcontextprotocol/sdk` v1.17.2+, `zod` for validation
- **Package Structure**: Server in `server/` directory with `src/`, `dist/`, `node_modules/`

### 2. GitHub Repository Integration
- **Target Repository**: `github/awesome-copilot` (configurable via `AWESOME_COPILOT_REPO`)
- **Content Types**: 
  - Instructions (`.instructions.md` files in `instructions/` folder)
  - Prompts (`.prompt.md` files in `prompts/` folder) 
  - Chat Modes (`.chatmode.md` files in `chatmodes/` folder)
- **API**: GitHub REST API v3 with rate limiting and optional token authentication
- **Caching**: In-memory cache with configurable TTL (default 24 hours)

### 3. Required MCP Tools

#### Core Tools
1. **handshake** - Server compatibility and capability discovery
2. **build_index** - Build/refresh catalog from GitHub repo tree
3. **search** - Keyword-based search with auto-expansion
4. **preview** - Fetch raw content for specific item paths
5. **install** - Generate installation suggestions for workspace integration
6. **rate_limit** - GitHub API rate limit monitoring
7. **set_repo** - Configure target repository and settings
8. **get_config** - Return current server configuration

#### Intelligent Search Tools
9. **analyze_intent** - Analyze query intent for search strategy
10. **intelligent_search** - MCP-first search with web fallback capability
11. **update_search_preferences** - Configure search routing preferences

#### Telemetry Tools
12. **get_telemetry_stats** - Usage statistics and patterns
13. **get_recent_telemetry_events** - Recent search/usage events
14. **configure_telemetry** - Enable/disable telemetry collection

### 4. Core Architecture Components

#### A. Main Server (`index.ts`)
- MCP server setup with stdio transport
- Tool registration and request handling
- Configuration management via environment variables
- GitHub API interaction with rate limiting
- In-memory caching with TTL validation

#### B. Search Router (`searchRouter.ts`)
- Orchestrates MCP-first search with web search fallback
- Implements search strategy based on intent analysis
- Tracks search paths and provides recommendations
- Manages user preferences for search routing

#### C. Intent Router (`intentRouter.ts`)
- Analyzes user queries to determine best search strategy
- Classifies queries as MCP-suitable vs web-suitable
- Provides confidence scoring for routing decisions
- Supports customizable search preferences

#### D. Extension Cache Service (`extensionCache.ts`)
- Provides caching interface for VS Code extension integration
- Reduces GitHub API calls through shared cache
- Supports cache validation and TTL management

#### E. Telemetry Service (`telemetry.ts`)
- Tracks usage patterns and search effectiveness
- Collects anonymized metrics for optimization
- Provides statistics and recent event access
- Configurable enable/disable functionality

#### F. Type Definitions (`types/`)
- Protocol schemas and interfaces
- Search result and routing types
- Configuration and preference types

### 5. Configuration & Environment

#### Required Environment Variables
- `GITHUB_TOKEN` or `GH_TOKEN` - GitHub API authentication (optional but recommended)

#### Optional Environment Variables
- `AWESOME_COPILOT_REPO` - Target repository (default: `github/awesome-copilot`)
- `AWESOME_COPILOT_BRANCH` - Target branch (default: `main`)
- `AWESOME_COPILOT_MAX_ITEMS` - Max items per search (default: 15)
- `AWESOME_COPILOT_CACHE_TTL_HOURS` - Cache TTL (default: 24)

### 6. Package.json Configuration
```json
{
  "name": "mcp-awesome-copilot-server",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "mcp-awesome-copilot-server": "dist/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "handshake": "node -e \"process.env.HANDSHAKE=1; require('./dist/index.js');\""
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.17.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^18.19.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.0"
  }
}
```

### 7. Key Features

#### Intelligent Search Routing
- Analyze query intent (MCP vs web search suitability)
- Route to appropriate search backends based on confidence scores
- Fallback mechanisms when primary search yields insufficient results
- User-configurable search preferences and thresholds

#### Extension Cache Integration
- Interface for VS Code extension to share cached data
- Reduces redundant GitHub API calls across tools
- Cache validation and freshness checking

#### Comprehensive Telemetry
- Track search patterns and success rates
- Monitor resource discovery effectiveness
- Provide insights for optimization
- Privacy-conscious with opt-out capability

#### GitHub API Optimization
- Rate limit monitoring and automatic backoff
- Token-based authentication for higher limits
- Efficient tree traversal for content discovery
- Smart caching to minimize API usage

### 8. Resource Endpoints
- `catalog://items` - JSON list of all catalog items
- `catalog://item/{path}` - Individual item content with path completion

### 9. Prompt Templates
- `preview-item` - Generate preview prompt for catalog items with path completion

### 10. Code Style Requirements
- TypeScript strict mode with ESM modules
- 2-space indentation, camelCase variables, PascalCase interfaces
- ESM imports ending in `.js` when importing TypeScript outputs
- Zod schemas for input validation
- Comprehensive error handling with meaningful messages

### 11. Testing & Validation
- Handshake compatibility testing
- Search functionality validation
- GitHub API integration tests
- Rate limiting behavior verification
- Cache TTL and invalidation testing

## Implementation Priority
1. **Core MCP server setup** with basic tools (handshake, build_index, search, preview)
2. **GitHub integration** with rate limiting and caching
3. **Search router and intent analysis** for intelligent routing
4. **Extension cache service** for VS Code integration
5. **Telemetry service** for usage tracking
6. **Advanced search features** and web fallback
7. **Resource endpoints and prompt templates**
8. **Comprehensive testing and validation**

## Success Criteria
- MCP server starts successfully and responds to handshake
- All 14 tools function correctly with proper input validation
- GitHub API integration respects rate limits and caches effectively
- Search routing intelligently chooses between MCP and web sources
- Extension cache integration reduces API calls
- Telemetry provides useful insights while respecting privacy
- Server handles errors gracefully and provides meaningful feedback

## Extension Integration Note
Assume a VS Code extension exists that:
- Can start/stop the MCP server process
- Shares cache data through the extension cache service
- Provides UI for configuration and telemetry viewing
- Integrates search results into the development workflow

This server should be designed to work standalone while providing hooks for extension integration through the cache service and configuration options.
