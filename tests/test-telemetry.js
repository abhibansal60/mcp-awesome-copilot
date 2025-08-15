#!/usr/bin/env node

/**
 * Test script to demonstrate telemetry functionality
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testTelemetry() {
  console.log('🔍 Testing MCP Server Telemetry...\n');

  const serverPath = path.join(__dirname, '..', 'server', 'dist', 'index.js');
  
  if (!fs.existsSync(serverPath)) {
    console.error('❌ Server not built. Run: cd server && npm run build');
    process.exit(1);
  }

  // Simulate intelligent searches to generate telemetry data
  const testQueries = [
    'Spring Boot best practices',
    'Java microservices architecture',
    'React component patterns',
    'Docker deployment guide',
    'Authentication best practices'
  ];

  console.log('📊 Running test searches to generate telemetry data...\n');

  for (const query of testQueries) {
    await testSearch(query);
  }

  // Get telemetry stats
  await getTelemetryStats();
  
  // Get recent events
  await getRecentEvents();
}

async function testSearch(query) {
  return new Promise((resolve, reject) => {
    console.log(`🔎 Testing search: "${query}"`);
    
    const server = spawn('node', ['../server/dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    let responseData = '';
    let hasResponded = false;

    // Send intelligent search request
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "intelligent_search",
        arguments: {
          query: query,
          preferences: {
            mcpFirst: true,
            fallbackToWeb: true,
            minConfidenceThreshold: 0.5
          }
        }
      }
    };

    server.stdout.on('data', (data) => {
      responseData += data.toString();
      if (!hasResponded && responseData.includes('"result"')) {
        hasResponded = true;
        console.log(`  ✅ Search completed\n`);
        server.kill();
        setTimeout(resolve, 100);
      }
    });

    server.stderr.on('data', (data) => {
      console.log(`  📝 Telemetry: ${data.toString().trim()}`);
    });

    server.on('error', (error) => {
      console.error(`  ❌ Error: ${error.message}`);
      reject(error);
    });

    setTimeout(() => {
      if (!hasResponded) {
        console.log(`  ⏱️  Timeout for query: ${query}`);
        server.kill();
        resolve();
      }
    }, 10000);

    // Send the request
    server.stdin.write(JSON.stringify(request) + '\n');
  });
}

async function getTelemetryStats() {
  return new Promise((resolve, reject) => {
    console.log('📊 Getting telemetry statistics...\n');
    
    const server = spawn('node', ['../server/dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    let responseData = '';
    let hasResponded = false;

    const request = {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "get_telemetry_stats",
        arguments: {}
      }
    };

    server.stdout.on('data', (data) => {
      responseData += data.toString();
      if (!hasResponded && responseData.includes('"result"')) {
        hasResponded = true;
        try {
          const response = JSON.parse(responseData);
          const stats = JSON.parse(response.result.content[0].text);
          
          console.log('📈 TELEMETRY STATISTICS:');
          console.log('========================');
          console.log(`Total MCP Consultations: ${stats.totalConsultations}`);
          console.log(`Successful MCP Searches: ${stats.successfulMCPConsultations}`);
          console.log(`Unsuccessful MCP Searches: ${stats.unsuccessfulMCPConsultations}`);
          console.log(`Fallback to Web Count: ${stats.fallbackToWebCount}`);
          console.log(`Average Response Time: ${stats.averageResponseTime}ms`);
          
          if (stats.topQueries.length > 0) {
            console.log('\n🔥 Top Queries:');
            stats.topQueries.slice(0, 3).forEach((q, i) => {
              console.log(`${i + 1}. "${q.query}" (${q.count} times, ${Math.round(q.successRate * 100)}% success)`);
            });
          }
          
          if (stats.resourceGaps.length > 0) {
            console.log('\n🔍 Resource Gaps Identified:');
            stats.resourceGaps.forEach((gap, i) => {
              console.log(`${i + 1}. "${gap.query}" - ${gap.attempts} failed attempts`);
            });
          }
          
          if (stats.improvementSuggestions.length > 0) {
            console.log('\n💡 Improvement Suggestions:');
            stats.improvementSuggestions.forEach((suggestion, i) => {
              console.log(`${i + 1}. ${suggestion}`);
            });
          }
          
        } catch (error) {
          console.error('❌ Failed to parse telemetry stats:', error.message);
        }
        
        server.kill();
        resolve();
      }
    });

    server.stderr.on('data', (data) => {
      // Ignore stderr for stats request
    });

    server.on('error', (error) => {
      console.error(`❌ Error getting stats: ${error.message}`);
      reject(error);
    });

    setTimeout(() => {
      if (!hasResponded) {
        console.log('⏱️  Timeout getting telemetry stats');
        server.kill();
        resolve();
      }
    }, 5000);

    server.stdin.write(JSON.stringify(request) + '\n');
  });
}

async function getRecentEvents() {
  return new Promise((resolve, reject) => {
    console.log('\n📝 Getting recent telemetry events...\n');
    
    const server = spawn('node', ['../server/dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    let responseData = '';
    let hasResponded = false;

    const request = {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "get_recent_telemetry_events",
        arguments: { limit: 10 }
      }
    };

    server.stdout.on('data', (data) => {
      responseData += data.toString();
      if (!hasResponded && responseData.includes('"result"')) {
        hasResponded = true;
        try {
          const response = JSON.parse(responseData);
          const events = JSON.parse(response.result.content[0].text);
          
          console.log('📋 RECENT TELEMETRY EVENTS:');
          console.log('============================');
          events.slice(0, 5).forEach((event, i) => {
            console.log(`${i + 1}. ${event.eventType.toUpperCase()} (${event.duration}ms)`);
            console.log(`   Query: "${event.query}"`);
            console.log(`   Source: ${event.source} | Results: ${event.resultCount} | Success: ${event.success}`);
            if (event.metadata?.intent) {
              console.log(`   Intent: ${event.metadata.intent} (confidence: ${event.metadata.confidence})`);
            }
            console.log('');
          });
          
        } catch (error) {
          console.error('❌ Failed to parse recent events:', error.message);
        }
        
        server.kill();
        resolve();
      }
    });

    server.on('error', (error) => {
      console.error(`❌ Error getting events: ${error.message}`);
      reject(error);
    });

    setTimeout(() => {
      if (!hasResponded) {
        console.log('⏱️  Timeout getting recent events');
        server.kill();
        resolve();
      }
    }, 5000);

    server.stdin.write(JSON.stringify(request) + '\n');
  });
}

// Run the test
testTelemetry().catch(console.error);
