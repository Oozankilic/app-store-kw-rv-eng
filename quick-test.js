const { ASOAnalyzer } = require('./services/aso-analyzer');

// Quick test function - just change the keyword here
async function quickTest() {
  const keyword = process.argv[2] || 'fitness app'; // Get keyword from command line or use default
  const platform = process.argv[3] || 'itunes'; // Get platform from command line or use default
  
  console.log(`🔍 Quick ASO Test: "${keyword}" on ${platform}\n`);
  
  const analyzer = new ASOAnalyzer(platform);
  const result = await analyzer.analyzeKeyword(keyword);
  
  console.log('📊 Results:');
  console.log(`  Traffic Score: ${result.trafficScore}/100 (${result.trafficLevel})`);
  console.log(`  Difficulty Score: ${result.difficultyScore}/100 (${result.competitionLevel})`);
  console.log(`  Recommendation: ${result.recommendation}`);
  
  if (result.error) {
    console.log(`  ❌ Error: ${result.error}`);
  }
}

quickTest().catch(console.error);