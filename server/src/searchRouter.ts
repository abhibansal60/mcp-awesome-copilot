/**
 * Search Router - Orchestrates MCP-first search with web fallback
 */

import { IntentRouter, SearchStrategy, MCPPreferences } from "./intentRouter.js";
import { telemetryService } from "./telemetry.js";

export interface SearchResult {
  source: "mcp" | "web";
  title: string;
  content?: string;
  url?: string;
  relevanceScore: number;
  type?: "instruction" | "prompt" | "chatmode" | "web_result";
}

export interface RouterSearchResponse {
  results: SearchResult[];
  strategy: SearchStrategy;
  searchPath: SearchPathStep[];
  recommendations?: string[];
}

export interface SearchPathStep {
  action: string;
  source: "mcp" | "web";
  query: string;
  resultCount: number;
  duration: number;
  success: boolean;
}

export interface MCPServerInterface {
  search(query: string): Promise<any[]>;
  preview(path: string): Promise<{ title: string; content: string; rawUrl: string }>;
}

export interface WebSearchInterface {
  search(query: string, numResults?: number): Promise<{
    title: string;
    url: string;
    summary: string;
  }[]>;
}

export class SearchRouter {
  private intentRouter: IntentRouter;
  private userPreferences: MCPPreferences;

  constructor(
    private mcpServer: MCPServerInterface,
    private webSearch: WebSearchInterface,
    preferences: Partial<MCPPreferences> = {}
  ) {
    this.intentRouter = new IntentRouter();
    this.userPreferences = {
      mcpFirst: true,
      mcpOnlyForBestPractices: false,
      fallbackToWeb: true,
      minConfidenceThreshold: 0.6,
      ...preferences
    };
  }

  async search(query: string): Promise<RouterSearchResponse> {
    const searchStartTime = Date.now();
    const strategy = this.intentRouter.createSearchStrategy(query, this.userPreferences);
    const searchPath: SearchPathStep[] = [];
    const results: SearchResult[] = [];
    const sourcesUsed: string[] = [];
    
    // Track that MCP was consulted
    telemetryService.trackMCPConsultation(query, 0, {
      intent: strategy.intent.intentType,
      confidence: strategy.intent.confidence
    });
    
    for (const step of strategy.steps) {
      const startTime = Date.now();
      
      try {
        if (step.type === "mcp_search") {
          sourcesUsed.push('mcp');
          const stepResult = await this.performMCPSearch(step.query, searchPath, strategy);
          results.push(...stepResult.results);
          
          // If this is high priority MCP search and we got good results, we might skip web search
          if (step.priority === "high" && stepResult.results.length > 0 && !this.userPreferences.fallbackToWeb) {
            break;
          }
          
          // For fallback searches, only proceed if primary search was insufficient
          if (step.priority === "fallback" && results.length >= 3) {
            searchPath.push({
              action: "Skipped web fallback - sufficient MCP results found",
              source: "web",
              query: step.query,
              resultCount: 0,
              duration: 0,
              success: true
            });
            break;
          }
        } else {
          sourcesUsed.push('web');
          const stepResult = await this.performWebSearch(step.query, searchPath);
          results.push(...stepResult.results);
          
          // Track fallback to web search
          const mcpResultCount = results.filter(r => r.source === 'mcp').length;
          telemetryService.trackFallbackToWeb(
            query,
            mcpResultCount,
            Date.now() - startTime,
            step.priority === 'fallback' ? 'Insufficient MCP results' : 'Primary web search',
            { intent: strategy.intent.intentType, confidence: strategy.intent.confidence }
          );
        }
      } catch (error) {
        searchPath.push({
          action: `Failed ${step.type}`,
          source: step.type === "mcp_search" ? "mcp" : "web",
          query: step.query,
          resultCount: 0,
          duration: Date.now() - startTime,
          success: false
        });
      }
    }

    // Sort results by relevance and source priority (MCP first if configured)
    const sortedResults = this.sortResults(results, strategy);
    
    // Generate recommendations based on results
    const recommendations = this.generateRecommendations(sortedResults, strategy);

    // Track search completion
    const totalDuration = Date.now() - searchStartTime;
    telemetryService.trackSearchCompleted(
      query,
      sortedResults.length,
      totalDuration,
      sourcesUsed,
      {
        intent: strategy.intent.intentType,
        confidence: strategy.intent.confidence,
        mcpResultCount: sortedResults.filter(r => r.source === 'mcp').length,
        webResultCount: sortedResults.filter(r => r.source === 'web').length
      }
    );

    return {
      results: sortedResults,
      strategy,
      searchPath,
      recommendations
    };
  }

  private async performMCPSearch(query: string, searchPath: SearchPathStep[], strategy: SearchStrategy): Promise<{ results: SearchResult[] }> {
    const startTime = Date.now();
    
    try {
      const mcpResults = await this.mcpServer.search(query);
      const results: SearchResult[] = [];
      const resourceTypes: string[] = [];
      
      // Convert MCP results to SearchResult format
      for (const item of mcpResults.slice(0, 5)) { // Limit to top 5 MCP results
        const relevanceScore = this.calculateMCPRelevance(item, query);
        
        results.push({
          source: "mcp",
          title: item.title,
          url: item.rawUrl,
          relevanceScore,
          type: item.type as "instruction" | "prompt" | "chatmode"
        });

        resourceTypes.push(item.type);
        
        // For high-relevance items, also fetch the content preview
        if (relevanceScore > 0.7) {
          try {
            const preview = await this.mcpServer.preview(item.path);
            results[results.length - 1].content = this.truncateContent(preview.content, 500);
          } catch {
            // Content fetch failed, continue with just metadata
          }
        }
      }
      
      const duration = Date.now() - startTime;
      
      // Track MCP resource discovery outcome
      if (results.length > 0) {
        telemetryService.trackMCPResourcesFound(
          query,
          results.length,
          duration,
          [...new Set(resourceTypes)], // Remove duplicates
          {
            intent: strategy.intent.intentType,
            confidence: strategy.intent.confidence,
            averageRelevance: results.length > 0 ? results.reduce((acc, r) => acc + r.relevanceScore, 0) / results.length : 0
          }
        );
      } else {
        telemetryService.trackMCPResourcesNotFound(
          query,
          duration,
          'No matching curated content found in repository',
          {
            intent: strategy.intent.intentType,
            confidence: strategy.intent.confidence
          }
        );
      }
      
      searchPath.push({
        action: "MCP search completed",
        source: "mcp",
        query,
        resultCount: results.length,
        duration,
        success: true
      });
      
      return { results };
    } catch (error) {
      const duration = Date.now() - startTime;
      telemetryService.trackMCPResourcesNotFound(
        query,
        duration,
        `MCP search failed: ${error}`,
        {
          intent: strategy.intent.intentType,
          confidence: strategy.intent.confidence
        }
      );
      throw new Error(`MCP search failed: ${error}`);
    }
  }

  private async performWebSearch(query: string, searchPath: SearchPathStep[]): Promise<{ results: SearchResult[] }> {
    const startTime = Date.now();
    
    try {
      const webResults = await this.webSearch.search(query, 5);
      const results: SearchResult[] = webResults.map(item => ({
        source: "web" as const,
        title: item.title,
        content: item.summary,
        url: item.url,
        relevanceScore: this.calculateWebRelevance(item, query),
        type: "web_result" as const
      }));
      
      searchPath.push({
        action: "Web search completed",
        source: "web",
        query,
        resultCount: results.length,
        duration: Date.now() - startTime,
        success: true
      });
      
      return { results };
    } catch (error) {
      throw new Error(`Web search failed: ${error}`);
    }
  }

  private calculateMCPRelevance(item: any, query: string): number {
    const queryLower = query.toLowerCase();
    const titleScore = this.stringMatch(item.title.toLowerCase(), queryLower);
    const pathScore = this.stringMatch(item.path.toLowerCase(), queryLower);
    const typeBoost = item.type === "instruction" ? 0.1 : item.type === "prompt" ? 0.05 : 0;
    
    return Math.min(0.95, (titleScore * 0.6 + pathScore * 0.4 + typeBoost));
  }

  private calculateWebRelevance(item: any, query: string): number {
    const queryLower = query.toLowerCase();
    const titleScore = this.stringMatch(item.title.toLowerCase(), queryLower);
    const summaryScore = this.stringMatch(item.summary.toLowerCase(), queryLower);
    
    return Math.min(0.9, (titleScore * 0.7 + summaryScore * 0.3));
  }

  private stringMatch(text: string, query: string): number {
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);
    const matches = queryWords.filter(word => text.includes(word)).length;
    return queryWords.length > 0 ? matches / queryWords.length : 0;
  }

  private sortResults(results: SearchResult[], strategy: SearchStrategy): SearchResult[] {
    return results.sort((a, b) => {
      // If MCP-first preference, prioritize MCP results
      if (this.userPreferences.mcpFirst) {
        if (a.source === "mcp" && b.source === "web") return -1;
        if (a.source === "web" && b.source === "mcp") return 1;
      }
      
      // Within same source, sort by relevance
      return b.relevanceScore - a.relevanceScore;
    });
  }

  private generateRecommendations(results: SearchResult[], strategy: SearchStrategy): string[] {
    const recommendations: string[] = [];
    
    const mcpResults = results.filter(r => r.source === "mcp");
    const webResults = results.filter(r => r.source === "web");
    
    if (mcpResults.length > 0) {
      const instructionCount = mcpResults.filter(r => r.type === "instruction").length;
      const promptCount = mcpResults.filter(r => r.type === "prompt").length;
      
      if (instructionCount > 0) {
        recommendations.push(`Found ${instructionCount} curated instruction(s) - these contain community-vetted best practices`);
      }
      
      if (promptCount > 0) {
        recommendations.push(`Found ${promptCount} specialized prompt(s) for your specific use case`);
      }
    }
    
    if (strategy.intent.intentType === "best_practices" && mcpResults.length === 0) {
      recommendations.push("No curated best practices found - consider contributing your solution to the community");
    }
    
    if (mcpResults.length > 0 && webResults.length > 0) {
      recommendations.push("Consider reviewing both curated community practices and latest web resources");
    }
    
    return recommendations;
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength - 3) + "...";
  }

  updatePreferences(preferences: Partial<MCPPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };
  }

  getPreferences(): MCPPreferences {
    return { ...this.userPreferences };
  }
}
