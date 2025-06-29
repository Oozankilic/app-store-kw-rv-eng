const { ASOAnalyzer } = require('./services/aso-analyzer');

async function testASO() {
  console.log('Testing ASO-V2 integration...\n');
  
  const analyzer = new ASOAnalyzer('itunes');
  
  // Test single keyword
  console.log('Testing single keyword analysis...');
  const result = await analyzer.analyzeKeyword('fitness app');
  
  console.log('Result:', {
    keyword: result.keyword,
    trafficScore: result.trafficScore,
    difficultyScore: result.difficultyScore,
    recommendation: result.recommendation,
    hasError: !!result.error
  });
  
  console.log('\nASO-V2 integration test completed!');
}

testASO();