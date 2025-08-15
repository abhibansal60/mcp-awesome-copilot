/**
 * Telemetry Service - Tracks MCP server consultations and resource discovery
 */

export interface TelemetryEvent {
  timestamp: string;
  eventType: 'mcp_consulted' | 'mcp_resources_found' | 'mcp_resources_not_found' | 'fallback_to_web' | 'search_completed';
  query: string;
  source: 'mcp' | 'web';
  resultCount: number;
  success: boolean;
  duration: number;
  metadata?: {
    intent?: string;
    confidence?: number;
    resourceTypes?: string[];
    fallbackReason?: string;
    searchPath?: string[];
  };
}

export interface TelemetryStats {
  totalConsultations: number;
  successfulMCPConsultations: number;
  unsuccessfulMCPConsultations: number;
  fallbackToWebCount: number;
  averageResponseTime: number;
  topQueries: Array<{ query: string; count: number; successRate: number }>;
  resourceGaps: Array<{ query: string; attempts: number; reason: string }>;
  improvementSuggestions: string[];
}

export class TelemetryService {
  private events: TelemetryEvent[] = [];
  private enabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  trackEvent(event: Omit<TelemetryEvent, 'timestamp'>): void {
    if (!this.enabled) return;

    const telemetryEvent: TelemetryEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    this.events.push(telemetryEvent);

    // Console logging for immediate visibility
    this.logEvent(telemetryEvent);

    // Keep only last 1000 events to prevent memory bloat
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  private logEvent(event: TelemetryEvent): void {
    const icon = this.getEventIcon(event.eventType);
    const duration = event.duration ? `(${event.duration}ms)` : '';
    
    console.log(`${icon} [TELEMETRY] ${event.eventType.toUpperCase()} ${duration}`);
    console.log(`  Query: "${event.query}"`);
    console.log(`  Source: ${event.source} | Results: ${event.resultCount} | Success: ${event.success}`);
    
    if (event.metadata) {
      if (event.metadata.intent) {
        console.log(`  Intent: ${event.metadata.intent} (confidence: ${event.metadata.confidence || 'unknown'})`);
      }
      if (event.metadata.resourceTypes?.length) {
        console.log(`  Resource Types: ${event.metadata.resourceTypes.join(', ')}`);
      }
      if (event.metadata.fallbackReason) {
        console.log(`  Fallback Reason: ${event.metadata.fallbackReason}`);
      }
    }
    console.log(''); // Empty line for readability
  }

  private getEventIcon(eventType: string): string {
    switch (eventType) {
      case 'mcp_consulted': return '🔍';
      case 'mcp_resources_found': return '✅';
      case 'mcp_resources_not_found': return '❌';
      case 'fallback_to_web': return '🌐';
      case 'search_completed': return '📊';
      default: return '📝';
    }
  }

  trackMCPConsultation(query: string, duration: number, metadata?: any): void {
    this.trackEvent({
      eventType: 'mcp_consulted',
      query,
      source: 'mcp',
      resultCount: 0,
      success: true,
      duration,
      metadata
    });
  }

  trackMCPResourcesFound(query: string, resultCount: number, duration: number, resourceTypes: string[], metadata?: any): void {
    this.trackEvent({
      eventType: 'mcp_resources_found',
      query,
      source: 'mcp',
      resultCount,
      success: true,
      duration,
      metadata: {
        ...metadata,
        resourceTypes
      }
    });
  }

  trackMCPResourcesNotFound(query: string, duration: number, reason?: string, metadata?: any): void {
    this.trackEvent({
      eventType: 'mcp_resources_not_found',
      query,
      source: 'mcp',
      resultCount: 0,
      success: false,
      duration,
      metadata: {
        ...metadata,
        fallbackReason: reason || 'No matching resources found'
      }
    });
  }

  trackFallbackToWeb(query: string, mcpResultCount: number, duration: number, reason: string, metadata?: any): void {
    this.trackEvent({
      eventType: 'fallback_to_web',
      query,
      source: 'web',
      resultCount: mcpResultCount,
      success: true,
      duration,
      metadata: {
        ...metadata,
        fallbackReason: reason,
        searchPath: ['mcp', 'web']
      }
    });
  }

  trackSearchCompleted(query: string, totalResults: number, duration: number, sources: string[], metadata?: any): void {
    this.trackEvent({
      eventType: 'search_completed',
      query,
      source: sources.includes('mcp') ? 'mcp' : 'web',
      resultCount: totalResults,
      success: totalResults > 0,
      duration,
      metadata: {
        ...metadata,
        searchPath: sources
      }
    });
  }

  getStats(): TelemetryStats {
    const stats: TelemetryStats = {
      totalConsultations: 0,
      successfulMCPConsultations: 0,
      unsuccessfulMCPConsultations: 0,
      fallbackToWebCount: 0,
      averageResponseTime: 0,
      topQueries: [],
      resourceGaps: [],
      improvementSuggestions: []
    };

    if (this.events.length === 0) {
      return stats;
    }

    // Count consultations and outcomes
    const mcpConsultations = this.events.filter(e => e.eventType === 'mcp_consulted');
    const resourcesFound = this.events.filter(e => e.eventType === 'mcp_resources_found');
    const resourcesNotFound = this.events.filter(e => e.eventType === 'mcp_resources_not_found');
    const fallbacks = this.events.filter(e => e.eventType === 'fallback_to_web');

    stats.totalConsultations = mcpConsultations.length;
    stats.successfulMCPConsultations = resourcesFound.length;
    stats.unsuccessfulMCPConsultations = resourcesNotFound.length;
    stats.fallbackToWebCount = fallbacks.length;

    // Calculate average response time
    const durations = this.events.filter(e => e.duration > 0).map(e => e.duration);
    if (durations.length > 0) {
      stats.averageResponseTime = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }

    // Analyze query patterns
    const queryMap = new Map<string, { count: number; successful: number }>();
    
    for (const event of this.events) {
      if (!queryMap.has(event.query)) {
        queryMap.set(event.query, { count: 0, successful: 0 });
      }
      const entry = queryMap.get(event.query)!;
      entry.count++;
      if (event.success) entry.successful++;
    }

    stats.topQueries = Array.from(queryMap.entries())
      .map(([query, data]) => ({
        query,
        count: data.count,
        successRate: data.count > 0 ? Math.round((data.successful / data.count) * 100) / 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Identify resource gaps (queries that consistently fail)
    stats.resourceGaps = Array.from(queryMap.entries())
      .filter(([_, data]) => data.count >= 2 && data.successful === 0)
      .map(([query, data]) => ({
        query,
        attempts: data.count,
        reason: 'No matching curated content found'
      }))
      .slice(0, 5);

    // Generate improvement suggestions
    stats.improvementSuggestions = this.generateImprovementSuggestions(stats);

    return stats;
  }

  private generateImprovementSuggestions(stats: TelemetryStats): string[] {
    const suggestions: string[] = [];

    // High fallback rate
    if (stats.fallbackToWebCount > stats.successfulMCPConsultations) {
      suggestions.push('Consider expanding curated content - high fallback rate to web search detected');
    }

    // Specific resource gaps
    if (stats.resourceGaps.length > 0) {
      const topGap = stats.resourceGaps[0];
      suggestions.push(`Most requested missing content: "${topGap.query}" (${topGap.attempts} failed attempts)`);
    }

    // Performance suggestions
    if (stats.averageResponseTime > 1000) {
      suggestions.push('Consider optimizing search performance - average response time exceeds 1 second');
    }

    // Coverage suggestions based on query patterns
    const techQueries = stats.topQueries.filter(q => 
      q.query.toLowerCase().includes('java') || 
      q.query.toLowerCase().includes('spring') ||
      q.query.toLowerCase().includes('react') ||
      q.query.toLowerCase().includes('python')
    );

    if (techQueries.length > 0 && techQueries[0].successRate < 0.5) {
      suggestions.push(`Low success rate for ${techQueries[0].query} queries - consider adding more content`);
    }

    // User behavior insights
    if (stats.totalConsultations > 10) {
      const successRate = stats.successfulMCPConsultations / stats.totalConsultations;
      if (successRate < 0.3) {
        suggestions.push('Low overall success rate - repository may need broader content coverage');
      } else if (successRate > 0.8) {
        suggestions.push('High MCP success rate - users are finding valuable curated content');
      }
    }

    return suggestions;
  }

  exportStats(): string {
    const stats = this.getStats();
    return JSON.stringify(stats, null, 2);
  }

  getRecentEvents(limit: number = 50): TelemetryEvent[] {
    return this.events.slice(-limit);
  }

  clearData(): void {
    this.events = [];
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const telemetryService = new TelemetryService();
