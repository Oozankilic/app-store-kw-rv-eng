const { ASOAnalyzer } = require('./services/aso-analyzer');

// You can modify these keywords to test whatever you want
const TEST_KEYWORDS = [
  'plant identifier',
  'fitness app',
  'photo editor',
  'meditation app',
  'recipe app'
];

async function testCustomKeywords() {
  console.log('🔍 Testing Custom Keywords with ASO-V2\n');
  
  const analyzer = new ASOAnalyzer('itunes'); // Using Apple App Store
  
  console.log('Keywords to analyze:', TEST_KEYWORDS.join(', '));
  console.log('Platform: Apple App Store\n');
  
  for (const keyword of TEST_KEYWORDS) {
    console.log(`Analyzing: "${keyword}"`);
    const result = await analyzer.analyzeKeyword(keyword);
    
    console.log(`  📊 Traffic Score: ${result.trafficScore}/100 (${result.trafficLevel})`);
    console.log(`  🎯 Difficulty Score: ${result.difficultyScore}/100 (${result.competitionLevel})`);
    console.log(`  💡 Recommendation: ${result.recommendation}`);
    
    if (result.error) {
      console.log(`  ❌ Error: ${result.error}`);
    }
    
    console.log(''); // Empty line for spacing
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('✅ Analysis complete!');
}

// Export for use in other files
module.exports = { testCustomKeywords, TEST_KEYWORDS };

// Run if called directly
if (require.main === module) {
  testCustomKeywords().catch(console.error);
}