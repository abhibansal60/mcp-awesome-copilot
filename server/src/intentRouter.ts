/**
 * Intent Router for MCP-first search strategy
 * Analyzes user queries to determine when to prioritize MCP curated content
 */

export interface QueryIntent {
  shouldUseMCP: boolean;
  confidence: number;
  intentType: IntentType;
  suggestedSearchTerms: string[];
  reasoning: string;
}

export type IntentType = 
  | "best_practices"
  | "how_to_build" 
  | "architecture_guidance"
  | "code_patterns"
  | "framework_setup"
  | "debugging_help"
  | "general_question";

export interface MCPPreferences {
  mcpFirst: boolean;
  mcpOnlyForBestPractices: boolean;
  fallbackToWeb: boolean;
  minConfidenceThreshold: number;
}

export class IntentRouter {
  private defaultPreferences: MCPPreferences = {
    mcpFirst: true,
    mcpOnlyForBestPractices: false,
    fallbackToWeb: true,
    minConfidenceThreshold: 0.6
  };

  private intentPatterns = {
    best_practices: [
      /best\s+practices?/i,
      /coding\s+standards?/i,
      /conventions?/i,
      /guidelines?/i,
      /recommended\s+approach/i,
      /how\s+should\s+i\s+structure/i,
      /proper\s+way\s+to/i,
      /standard\s+way\s+to/i,
      /optimization\s+practices/i,
      /performance\s+best\s+practices/i,
      /security\s+best\s+practices/i,
      /testing\s+strategies/i,
      /clean\s+code/i
    ],
    how_to_build: [
      /how\s+to\s+(build|create|make|setup|set\s+up)/i,
      /build\s+a\s+new/i,
      /create\s+a\s+new/i,
      /setup\s+(a\s+)?new/i,
      /getting\s+started\s+with/i,
      /initialize\s+(a\s+)?new/i,
      /scaffold/i
    ],
    architecture_guidance: [
      /architecture/i,
      /design\s+patterns?/i,
      /project\s+structure/i,
      /folder\s+structure/i,
      /organize\s+my\s+(code|project)/i,
      /microservices?/i,
      /system\s+design/i,
      /application\s+structure/i
    ],
    code_patterns: [
      /patterns?\s+for/i,
      /examples?\s+of/i,
      /template/i,
      /boilerplate/i,
      /snippet/i,
      /sample\s+code/i,
      /code\s+example/i
    ],
    framework_setup: [
      /spring\s+boot/i,
      /react\s+app/i,
      /vue\s+project/i,
      /angular\s+app/i,
      /express\s+server/i,
      /django\s+project/i,
      /rails\s+app/i,
      /setup\s+\w+\s+with/i,
      /ci\/cd\s+pipeline/i,
      /deployment\s+setup/i,
      /configuration\s+setup/i,
      /project\s+setup/i,
      /environment\s+setup/i
    ],
    debugging_help: [
      /debug/i,
      /fix\s+(this\s+)?error/i,
      /troubleshoot/i,
      /not\s+working/i,
      /issue\s+with/i,
      /problem\s+with/i,
      /why\s+(is|does)/i
    ]
  };

  private technologyKeywords = [
    // Languages
    "java", "javascript", "typescript", "python", "csharp", "c#", "kotlin", "scala", "go", "rust",
    "php", "ruby", "swift", "objective-c", "dart", "clojure",
    
    // Frameworks & Libraries
    "spring", "springboot", "spring boot", "react", "vue", "angular", "express", "django", "rails",
    "flask", "fastapi", "laravel", "symfony", "gin", "echo", "actix", "tokio", "flutter", "react native",
    "nextjs", "nuxt", "svelte", "blazor", "xamarin",
    
    // Technologies
    "docker", "kubernetes", "microservices", "api", "rest", "graphql", "grpc", "oauth", "jwt",
    "redis", "mongodb", "postgresql", "mysql", "elasticsearch", "kafka", "rabbitmq",
    
    // Cloud
    "aws", "azure", "gcp", "terraform", "bicep", "cloudformation", "serverless"
  ];

  analyzeIntent(query: string, preferences: Partial<MCPPreferences> = {}): QueryIntent {
    const prefs = { ...this.defaultPreferences, ...preferences };
    const normalizedQuery = query.toLowerCase().trim();
    
    let bestMatch: { type: IntentType; confidence: number } = { 
      type: "general_question", 
      confidence: 0 
    };

    // Check each intent pattern
    for (const [intentType, patterns] of Object.entries(this.intentPatterns)) {
      const matches = patterns.filter(pattern => pattern.test(normalizedQuery));
      if (matches.length > 0) {
        const confidence = Math.min(0.9, 0.3 + (matches.length * 0.2));
        if (confidence > bestMatch.confidence) {
          bestMatch = { type: intentType as IntentType, confidence };
        }
      }
    }

    // Boost confidence if technology keywords are present
    const techKeywords = this.technologyKeywords.filter(keyword => 
      normalizedQuery.includes(keyword.toLowerCase())
    );
    if (techKeywords.length > 0 && bestMatch.confidence > 0.3) {
      bestMatch.confidence = Math.min(0.95, bestMatch.confidence + (techKeywords.length * 0.1));
    }

    // Generate suggested search terms
    const suggestedSearchTerms = this.generateSearchTerms(normalizedQuery, techKeywords);

    // Determine if should use MCP
    let shouldUseMCP = false;
    let reasoning = "";

    if (prefs.mcpFirst && bestMatch.confidence >= prefs.minConfidenceThreshold) {
      shouldUseMCP = true;
      reasoning = `High confidence ${bestMatch.type} query with curated content likely available`;
    } else if (prefs.mcpOnlyForBestPractices && bestMatch.type === "best_practices") {
      shouldUseMCP = true;
      reasoning = "Best practices query - prioritizing curated community content";
    } else if (techKeywords.length > 0 && bestMatch.confidence > 0.4) {
      shouldUseMCP = true;
      reasoning = `Technology-specific query (${techKeywords.join(", ")}) may have curated guidance`;
    } else {
      reasoning = `Low confidence for curated content (${bestMatch.confidence.toFixed(2)})`;
    }

    return {
      shouldUseMCP,
      confidence: bestMatch.confidence,
      intentType: bestMatch.type,
      suggestedSearchTerms,
      reasoning
    };
  }

  private generateSearchTerms(query: string, techKeywords: string[]): string[] {
    const terms = new Set<string>();
    
    // Add detected technology keywords
    techKeywords.forEach(keyword => terms.add(keyword));
    
    // Extract key phrases
    const keyPhrases = [
      ...query.match(/(?:best|good|proper|standard|recommended)\s+\w+/gi) || [],
      ...query.match(/\b\w+(?:\s+\w+){0,2}\s+(?:pattern|practice|approach|way|method)\b/gi) || [],
      ...query.match(/\b(?:build|create|setup|configure|implement)\s+\w+(?:\s+\w+){0,2}/gi) || []
    ];
    
    keyPhrases.forEach(phrase => {
      const cleaned = phrase.toLowerCase().replace(/[^\w\s]/g, '').trim();
      if (cleaned.length > 3) terms.add(cleaned);
    });
    
    // Fallback to important words if no key phrases found
    if (terms.size === 0) {
      const words = query.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && !['the', 'and', 'for', 'with', 'that', 'this', 'how'].includes(word));
      words.slice(0, 3).forEach(word => terms.add(word));
    }
    
    return Array.from(terms).slice(0, 5);
  }

  /**
   * Create a search strategy based on intent analysis
   */
  createSearchStrategy(query: string, preferences: Partial<MCPPreferences> = {}): SearchStrategy {
    const intent = this.analyzeIntent(query, preferences);
    const prefs = { ...this.defaultPreferences, ...preferences };
    
    return {
      intent,
      steps: this.planSearchSteps(intent, prefs),
      explanation: this.explainStrategy(intent, prefs)
    };
  }

  private planSearchSteps(intent: QueryIntent, prefs: MCPPreferences): SearchStep[] {
    const steps: SearchStep[] = [];
    
    if (intent.shouldUseMCP) {
      steps.push({
        type: "mcp_search",
        query: intent.suggestedSearchTerms.join(" "),
        priority: "high",
        reasoning: intent.reasoning
      });
      
      if (prefs.fallbackToWeb) {
        steps.push({
          type: "web_search",
          query: intent.suggestedSearchTerms.join(" "),
          priority: "fallback",
          reasoning: "Fallback if MCP search yields insufficient results"
        });
      }
    } else {
      steps.push({
        type: "web_search",
        query: intent.suggestedSearchTerms.join(" "),
        priority: "high",
        reasoning: "Primary search for general or low-confidence queries"
      });
      
      if (intent.confidence > 0.3) {
        steps.push({
          type: "mcp_search",
          query: intent.suggestedSearchTerms.join(" "),
          priority: "supplementary",
          reasoning: "Check for any relevant curated content"
        });
      }
    }
    
    return steps;
  }

  private explainStrategy(intent: QueryIntent, prefs: MCPPreferences): string {
    if (intent.shouldUseMCP) {
      return `Searching curated content first for ${intent.intentType} (confidence: ${(intent.confidence * 100).toFixed(0)}%)`;
    } else {
      return `Using web search for general query with MCP as supplement`;
    }
  }
}

export interface SearchStrategy {
  intent: QueryIntent;
  steps: SearchStep[];
  explanation: string;
}

export interface SearchStep {
  type: "mcp_search" | "web_search";
  query: string;
  priority: "high" | "fallback" | "supplementary";
  reasoning: string;
}
