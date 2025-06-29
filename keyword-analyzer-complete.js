const { generateKeywords } = require('./services/keyword-generator');
const { ASOAnalyzer } = require('./services/aso-analyzer');
const { mockAppData } = require('./data/mock-data');

/**
 * Complete keyword analysis workflow combining Claude generation and ASO analysis
 */
class KeywordAnalyzerComplete {
  constructor(platform = 'itunes') {
    this.asoAnalyzer = new ASOAnalyzer(platform);
    this.platform = platform;
  }

  /**
   * Use Case 1: Generate keywords from app data using Claude
   * @param {Object} appData - App data with title, description, screenshots
   * @returns {Promise<Object>} Generated keywords
   */
  async generateKeywordsFromApp(appData) {
    console.log('=== USE CASE 1: Generating keywords from app data ===');
    return await generateKeywords(appData);
  }

  /**
   * Use Case 2: Analyze specific keywords for traffic and difficulty scores
   * @param {Array<string>} keywords - Keywords to analyze
   * @returns {Promise<Array<Object>>} Analysis results with scores
   */
  async analyzeKeywordScores(keywords) {
    console.log('=== USE CASE 2: Analyzing keyword traffic and difficulty scores ===');
    return await this.asoAnalyzer.analyzeKeywords(keywords);
  }

  /**
   * Combined workflow: Generate keywords then analyze them
   * @param {Object} appData - App data for keyword generation
   * @param {number} topN - Number of top opportunities to return
   * @returns {Promise<Object>} Complete analysis with generated keywords and ASO scores
   */
  async completeAnalysis(appData, topN = 10) {
    console.log('=== COMPLETE WORKFLOW: Generate + Analyze Keywords ===');
    
    try {
      // Step 1: Generate keywords using Claude
      console.log('Step 1: Generating keywords from app data...');
      const generatedResult = await this.generateKeywordsFromApp(appData);
      
      if (!generatedResult.keywords || generatedResult.keywords.length === 0) {
        throw new Error('No keywords were generated from app data');
      }
      
      console.log(`Generated ${generatedResult.keywords.length} keywords`);
      
      // Step 2: Analyze keywords using ASO-V2
      console.log('Step 2: Analyzing keywords with ASO-V2...');
      const asoAnalyses = await this.analyzeKeywordScores(generatedResult.keywords);
      
      // Step 3: Find best opportunities
      console.log('Step 3: Finding best keyword opportunities...');
      const opportunities = await this.asoAnalyzer.findKeywordOpportunities(generatedResult.keywords, topN);
      
      return {
        appData: {
          title: appData.title,
          platform: this.platform
        },
        generatedKeywords: generatedResult.keywords,
        asoAnalyses: asoAnalyses,
        topOpportunities: opportunities.topOpportunities,
        summary: {
          totalGenerated: generatedResult.keywords.length,
          totalAnalyzed: opportunities.totalAnalyzed,
          recommendations: opportunities.summary
        }
      };
      
    } catch (error) {
      console.error('Complete analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Analyze single keyword (for testing individual keywords)
   * @param {string} keyword - Single keyword to analyze
   * @returns {Promise<Object>} Single keyword analysis
   */
  async analyzeKeyword(keyword) {
    console.log(`=== SINGLE KEYWORD ANALYSIS: "${keyword}" ===`);
    return await this.asoAnalyzer.analyzeKeyword(keyword);
  }
}

/**
 * Demo function showing both use cases
 */
async function runDemo() {
  try {
    const analyzer = new KeywordAnalyzerComplete('itunes'); // Use Apple App Store
    
    console.log('🚀 Starting Keyword Analysis Demo...\n');
    
    // Demo Use Case 1: Generate keywords from app data
    console.log('📱 Analyzing app: ' + mockAppData.title);
    const generatedKeywords = await analyzer.generateKeywordsFromApp(mockAppData);
    console.log('✅ Generated keywords:', generatedKeywords.keywords.slice(0, 5).join(', '), '...\n');
    
    // Demo Use Case 2: Analyze specific keywords
    const testKeywords = ['plant identifier', 'flower recognition', 'garden app'];
    console.log('🔍 Testing specific keywords:', testKeywords.join(', '));
    const keywordAnalyses = await analyzer.analyzeKeywordScores(testKeywords);
    
    console.log('📊 Keyword Analysis Results:');
    keywordAnalyses.forEach(analysis => {
      console.log(`  "${analysis.keyword}": Traffic=${analysis.trafficScore}, Difficulty=${analysis.difficultyScore}, Recommendation=${analysis.recommendation}`);
    });
    
    console.log('\n🎯 Complete Analysis (Generate + Analyze):');
    const completeResult = await analyzer.completeAnalysis(mockAppData, 5);
    
    console.log('📈 Top 5 Keyword Opportunities:');
    completeResult.topOpportunities.forEach((kw, index) => {
      console.log(`  ${index + 1}. "${kw.keyword}" - Traffic: ${kw.trafficScore}, Difficulty: ${kw.difficultyScore} (${kw.recommendation})`);
    });
    
    console.log('\n📋 Summary:', completeResult.summary);
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Export classes and functions
module.exports = {
  KeywordAnalyzerComplete,
  runDemo
};

// If run directly, execute demo
if (require.main === module) {
  runDemo();
}