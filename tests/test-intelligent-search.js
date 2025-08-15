/**
 * Test script to demonstrate intelligent search functionality
 */

import { IntentRouter } from '../server/dist/intentRouter.js';

async function testIntentAnalysis() {
  const router = new IntentRouter();
  
  console.log('🧠 Testing Intent Analysis\n');
  
  const testQueries = [
    "What are the best practices for Spring Boot applications?",
    "How to build a new Java project with Spring Boot?",
    "Fix this NullPointerException error",
    "Latest Java version features",
    "Proper way to structure microservices architecture",
    "Create Spring Boot Kotlin project"
  ];
  
  for (const query of testQueries) {
    console.log(`📝 Query: "${query}"`);
    const intent = router.analyzeIntent(query);
    
    console.log(`   🎯 Intent Type: ${intent.intentType}`);
    console.log(`   📊 Confidence: ${(intent.confidence * 100).toFixed(0)}%`);
    console.log(`   🔍 Should Use MCP: ${intent.shouldUseMCP}`);
    console.log(`   💭 Reasoning: ${intent.reasoning}`);
    console.log(`   🏷️  Search Terms: ${intent.suggestedSearchTerms.join(', ')}`);
    console.log('');
  }
  
  // Test with different preferences
  console.log('⚙️  Testing with Different Preferences\n');
  
  const query = "How should I organize my Spring Boot project structure?";
  console.log(`📝 Query: "${query}"`);
  
  const scenarios = [
    { name: 'Default (MCP First)', prefs: {} },
    { name: 'MCP Only for Best Practices', prefs: { mcpOnlyForBestPractices: true } },
    { name: 'High Confidence Threshold', prefs: { minConfidenceThreshold: 0.8 } },
    { name: 'Web Search First', prefs: { mcpFirst: false } }
  ];
  
  for (const scenario of scenarios) {
    console.log(`   📋 Scenario: ${scenario.name}`);
    const intent = router.analyzeIntent(query, scenario.prefs);
    console.log(`      🔍 Use MCP: ${intent.shouldUseMCP} (${intent.reasoning})`);
  }
  
  console.log('\n✅ Intent analysis test completed!');
}

async function testSearchStrategy() {
  const router = new IntentRouter();
  
  console.log('\n🎯 Testing Search Strategy Planning\n');
  
  const query = "Spring Boot best practices for microservices";
  console.log(`📝 Query: "${query}"`);
  
  const strategy = router.createSearchStrategy(query);
  
  console.log(`   📋 Strategy: ${strategy.explanation}`);
  console.log(`   🎯 Intent: ${strategy.intent.intentType} (${(strategy.intent.confidence * 100).toFixed(0)}%)`);
  console.log(`   📝 Search Steps:`);
  
  strategy.steps.forEach((step, index) => {
    console.log(`      ${index + 1}. ${step.type} (${step.priority})`);
    console.log(`         Query: "${step.query}"`);
    console.log(`         Reason: ${step.reasoning}`);
  });
  
  console.log('\n✅ Search strategy test completed!');
}

// Run tests
console.log('🚀 Starting Intelligent Search Tests\n');

testIntentAnalysis()
  .then(() => testSearchStrategy())
  .then(() => console.log('\n🎉 All tests completed!'))
  .catch(error => console.error('❌ Test failed:', error));
