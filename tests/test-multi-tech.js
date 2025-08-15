/**
 * Comprehensive test showing multi-technology and multi-use case support
 */

import { IntentRouter } from '../server/dist/intentRouter.js';

async function testMultiTechSupport() {
  const router = new IntentRouter();
  
  console.log('🌐 Testing Multi-Technology Support\n');
  
  const techQueries = [
    // Frontend Technologies
    "React best practices for component architecture",
    "How to setup a new Vue.js project with TypeScript", 
    "Angular design patterns for large applications",
    "JavaScript coding standards and conventions",
    
    // Backend Technologies  
    "Django REST API best practices",
    "Express.js application structure guidelines", 
    "How to build a FastAPI microservice",
    "Laravel project organization patterns",
    
    // Mobile Development
    "Swift iOS app architecture best practices",
    "React Native project setup guide",
    "Flutter widget organization patterns",
    
    // DevOps & Infrastructure
    "Docker containerization best practices",
    "Kubernetes deployment patterns", 
    "Terraform module structure guidelines",
    "AWS serverless architecture patterns",
    
    // Data & Analytics
    "Python data pipeline best practices",
    "MongoDB schema design patterns",
    "PostgreSQL performance optimization",
    
    // Languages
    "Rust error handling conventions",
    "Go microservices architecture patterns", 
    "C# clean code principles"
  ];
  
  for (const query of techQueries) {
    const intent = router.analyzeIntent(query);
    const shouldUse = intent.shouldUseMCP ? '✅' : '❌';
    const confidence = `${(intent.confidence * 100).toFixed(0)}%`;
    
    console.log(`${shouldUse} ${intent.intentType.padEnd(20)} ${confidence.padEnd(4)} | ${query}`);
  }
}

async function testUseCasePatterns() {
  const router = new IntentRouter();
  
  console.log('\n🎯 Testing Use Case Patterns\n');
  
  const useCaseQueries = [
    // Architecture & Design
    { query: "How should I structure my microservices architecture?", expected: "architecture_guidance" },
    { query: "What are the design patterns for API gateway?", expected: "architecture_guidance" },
    { query: "Best practices for event-driven architecture", expected: "best_practices" },
    
    // Project Setup & Scaffolding  
    { query: "How to create a new full-stack application?", expected: "how_to_build" },
    { query: "Setup CI/CD pipeline for Node.js project", expected: "framework_setup" },
    { query: "Initialize new React TypeScript project", expected: "how_to_build" },
    
    // Code Quality & Standards
    { query: "Coding conventions for team collaboration", expected: "best_practices" },
    { query: "Code review guidelines and standards", expected: "best_practices" },
    { query: "Testing strategies for large applications", expected: "best_practices" },
    
    // Performance & Optimization
    { query: "Database optimization best practices", expected: "best_practices" },
    { query: "Frontend performance patterns", expected: "code_patterns" },
    { query: "API rate limiting strategies", expected: "architecture_guidance" },
    
    // Security
    { query: "Authentication patterns for SPAs", expected: "code_patterns" },
    { query: "Security best practices for web apps", expected: "best_practices" },
    { query: "OAuth implementation guidelines", expected: "best_practices" },
    
    // Deployment & Operations
    { query: "Container orchestration patterns", expected: "architecture_guidance" },
    { query: "Monitoring and logging best practices", expected: "best_practices" },
    { query: "Blue-green deployment strategies", expected: "architecture_guidance" }
  ];
  
  let correct = 0;
  
  for (const test of useCaseQueries) {
    const intent = router.analyzeIntent(test.query);
    const match = intent.intentType === test.expected ? '✅' : '❌';
    const shouldUse = intent.shouldUseMCP ? '🎯' : '🌐';
    
    if (intent.intentType === test.expected) correct++;
    
    console.log(`${match} ${shouldUse} ${intent.intentType.padEnd(20)} | ${test.query}`);
    if (intent.intentType !== test.expected) {
      console.log(`    Expected: ${test.expected}, Got: ${intent.intentType}`);
    }
  }
  
  console.log(`\n📊 Accuracy: ${correct}/${useCaseQueries.length} (${((correct/useCaseQueries.length)*100).toFixed(0)}%)`);
}

async function testContextualEnhancement() {
  const router = new IntentRouter();
  
  console.log('\n🔍 Testing Contextual Enhancement\n');
  
  const contexts = [
    {
      name: "Python AI/ML Project",
      files: ["main.py", "requirements.txt", "model.py", "train.py"],
      query: "Best practices for project structure"
    },
    {
      name: "React Frontend App", 
      files: ["App.tsx", "package.json", "src/components/", "public/index.html"],
      query: "Component organization guidelines"
    },
    {
      name: "Go Microservice",
      files: ["main.go", "go.mod", "cmd/", "internal/"],
      query: "API design patterns"
    },
    {
      name: "Full-Stack TypeScript",
      files: ["frontend/package.json", "backend/server.ts", "shared/types.ts"],
      query: "How to structure monorepo"
    }
  ];
  
  for (const context of contexts) {
    console.log(`📁 Context: ${context.name}`);
    
    // Simulate file-based technology detection
    const detectedTech = [];
    if (context.files.some(f => f.endsWith('.py'))) detectedTech.push('python');
    if (context.files.some(f => f.endsWith('.tsx') || f.endsWith('.ts'))) detectedTech.push('typescript');
    if (context.files.some(f => f.endsWith('.go'))) detectedTech.push('go');
    if (context.files.some(f => f.includes('package.json'))) detectedTech.push('javascript');
    if (context.files.some(f => f.includes('requirements.txt'))) detectedTech.push('python');
    
    const enhancedQuery = `${context.query} ${detectedTech.join(' ')}`;
    const intent = router.analyzeIntent(enhancedQuery);
    
    console.log(`   Original: "${context.query}"`);
    console.log(`   Enhanced: "${enhancedQuery}"`);
    console.log(`   Result: ${intent.intentType} (${(intent.confidence*100).toFixed(0)}%) - ${intent.shouldUseMCP ? 'MCP First' : 'Web First'}`);
    console.log(`   Technologies: ${intent.suggestedSearchTerms.join(', ')}`);
    console.log('');
  }
}

async function testEdgeCases() {
  const router = new IntentRouter();
  
  console.log('\n⚠️  Testing Edge Cases\n');
  
  const edgeCases = [
    // Debugging queries (should prefer web search for specific issues)
    "Why is my React app crashing on startup?",
    "How to fix 'Cannot resolve module' error in Node?", 
    "Debug memory leak in Python application",
    
    // Version-specific queries (should prefer web search for latest info)
    "What's new in Python 3.12?",
    "React 18 new features and changes",
    "Node.js 20 LTS release notes",
    
    // Mixed intent queries
    "How to setup React with best practices for testing?",
    "Build Docker container following security best practices",
    "Create AWS Lambda with TypeScript and proper architecture",
    
    // Ambiguous queries  
    "How to optimize performance?",
    "What are the latest trends?",
    "Best tools for development?"
  ];
  
  for (const query of edgeCases) {
    const intent = router.analyzeIntent(query);
    const strategy = intent.shouldUseMCP ? '🎯 MCP First' : '🌐 Web First';
    
    console.log(`${strategy.padEnd(15)} | ${intent.intentType.padEnd(20)} | ${query}`);
    console.log(`   Reasoning: ${intent.reasoning}`);
    console.log('');
  }
}

// Run comprehensive tests
console.log('🚀 Comprehensive Multi-Tech & Use Case Testing\n');

testMultiTechSupport()
  .then(() => testUseCasePatterns())
  .then(() => testContextualEnhancement())  
  .then(() => testEdgeCases())
  .then(() => console.log('\n🎉 All comprehensive tests completed!'))
  .catch(error => console.error('❌ Test failed:', error));
