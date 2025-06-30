/**
 * Keyword Optimizer - Complete Workflow Tool
 * 
 * This tool combines:
 * 1. LLM keyword generation from app data
 * 2. ASO scoring analysis for generated keywords  
 * 3. LLM-powered keyword suggestions based on ASO scores
 */

require('dotenv').config();
const { generateKeywords } = require('./llm-keyword-generator');
const { ASOAnalyzer } = require('./services/aso-analyzer');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client for additional suggestions
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Mock data for testing
const mockAppData = {
  title: "PlantNet - Plant Identifier",
  description: "Instantly identify any plant, flower, tree, or shrub with your smartphone camera. Get detailed information about plant care, watering schedules, sunlight requirements, and planting tips. Detect plant diseases early with AI-powered diagnosis and receive personalized treatment recommendations. Perfect for gardeners, botanists, nature enthusiasts, and anyone curious about the plant world around them.",
  screenshots: [
    "mock/s1.jpeg",
    "mock/s2.jpeg", 
    "mock/s3.jpeg",
    "mock/s4.jpeg"
  ]
};

// Function tool for additional keyword suggestions
const SUGGEST_KEYWORDS_TOOL = {
  name: "suggest_additional_keywords",
  description: "Suggests additional keywords based on ASO analysis results",
  input_schema: {
    type: "object",
    properties: {
      keywords: {
        type: "array",
        items: {
          type: "string",
          description: "A suggested keyword based on ASO analysis"
        },
        description: "Array of 5-10 additional keyword suggestions based on ASO scores"
      }
    },
    required: ["keywords"]
  }
};

/**
 * Complete keyword optimization workflow
 * @param {Object} appData - App data for initial keyword generation
 * @param {string} platform - Platform for ASO analysis ('itunes' or 'gplay')
 * @param {number} keywordsToAnalyze - Number of keywords to analyze (default: 3)
 * @returns {Promise<Object>} Complete optimization results
 */
async function optimizeKeywords(appData, platform = 'itunes', keywordsToAnalyze = 10) {
  console.log('🚀 Starting Complete Keyword Optimization Workflow\n');
  
  try {
    // Step 1: Generate initial keywords using LLM
    console.log('📝 Step 1: Generating initial keywords from app data...');
    const initialResult = await generateKeywords(appData);
    
    if (!initialResult.keywords || initialResult.keywords.length === 0) {
      throw new Error('No initial keywords generated');
    }
    
    console.log(`✅ Generated ${initialResult.keywords.length} initial keywords`);
    
    // Take first N keywords for ASO analysis
    const keywordsToTest = initialResult.keywords.slice(0, keywordsToAnalyze);
    console.log(`🎯 Selected ${keywordsToTest.length} keywords for ASO analysis:`, keywordsToTest.join(', '));
    
    // Step 2: Analyze selected keywords with ASO
    console.log('\n📊 Step 2: Analyzing keywords with ASO scores...');
    const asoAnalyzer = new ASOAnalyzer(platform);
    const asoResults = await asoAnalyzer.analyzeKeywords(keywordsToTest);
    
    console.log('ASO Analysis Results:');
    asoResults.forEach(result => {
      console.log(`  "${result.keyword}": Traffic=${result.trafficScore}, Difficulty=${result.difficultyScore}, Rec=${result.recommendation}`);
    });
    
    // Step 3: Ask LLM for additional suggestions based on ASO results
    console.log('\n🧠 Step 3: Getting LLM suggestions based on ASO scores...');
    const additionalSuggestions = await getSuggestionsBasedOnASO(appData, asoResults);
    
    console.log(`✅ Generated ${additionalSuggestions.keywords.length} additional suggestions`);
    
    // Compile final results
    const finalResults = {
      appData: {
        title: appData.title,
        platform: platform
      },
      workflow: {
        initialKeywords: initialResult.keywords,
        analyzedKeywords: asoResults,
        additionalSuggestions: additionalSuggestions.keywords
      },
      summary: {
        totalInitialKeywords: initialResult.keywords.length,
        analyzedCount: asoResults.length,
        additionalSuggestions: additionalSuggestions.keywords.length,
        bestPerformingKeyword: findBestKeyword(asoResults),
        recommendations: summarizeRecommendations(asoResults)
      }
    };
    
    return finalResults;
    
  } catch (error) {
    console.error('❌ Optimization workflow failed:', error.message);
    throw error;
  }
}

/**
 * Get additional keyword suggestions from LLM based on ASO analysis
 * @param {Object} appData - Original app data
 * @param {Array} asoResults - ASO analysis results
 * @returns {Promise<Object>} Additional keyword suggestions
 */
async function getSuggestionsBasedOnASO(appData, asoResults) {
  // Prepare ASO analysis summary for the LLM
  const asoSummary = asoResults.map(result => 
    `"${result.keyword}": Traffic Score ${result.trafficScore}/100, Difficulty Score ${result.difficultyScore}/100, Recommendation: ${result.recommendation}`
  ).join('\n');
  
  const prompt = `Based on this app store data and ASO analysis results, suggest additional keywords that might perform better:

App: ${appData.title}
Description: ${appData.description}

ASO Analysis Results:
${asoSummary}

The current keywords show varying performance. Please suggest 5-10 additional keywords that could:
1. Have better traffic/difficulty ratios
2. Target similar but less competitive terms
3. Cover related functionality or use cases
4. Appeal to the same target audience

Focus on keywords that might have higher traffic scores or lower difficulty scores than the analyzed ones.

Use the suggest_additional_keywords function to return your suggestions.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.4,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      tools: [SUGGEST_KEYWORDS_TOOL],
      tool_choice: { type: "tool", name: "suggest_additional_keywords" }
    });

    const toolUse = response.content.find(content => content.type === 'tool_use');
    
    if (toolUse && toolUse.name === 'suggest_additional_keywords') {
      return { keywords: toolUse.input.keywords };
    } else {
      throw new Error('No valid suggestions found in response');
    }
    
  } catch (error) {
    console.error('Error getting LLM suggestions:', error.message);
    throw error;
  }
}

/**
 * Find the best performing keyword from ASO results
 * @param {Array} asoResults - ASO analysis results
 * @returns {Object} Best keyword info
 */
function findBestKeyword(asoResults) {
  const best = asoResults.reduce((prev, current) => {
    const prevScore = prev.trafficScore - prev.difficultyScore;
    const currentScore = current.trafficScore - current.difficultyScore;
    return currentScore > prevScore ? current : prev;
  });
  
  return {
    keyword: best.keyword,
    trafficScore: best.trafficScore,
    difficultyScore: best.difficultyScore,
    recommendation: best.recommendation,
    score: best.trafficScore - best.difficultyScore
  };
}

/**
 * Summarize ASO recommendations
 * @param {Array} asoResults - ASO analysis results
 * @returns {Object} Recommendation summary
 */
function summarizeRecommendations(asoResults) {
  const counts = {
    excellent: 0,
    good: 0,
    consider: 0,
    challenging: 0,
    avoid: 0
  };
  
  asoResults.forEach(result => {
    if (counts.hasOwnProperty(result.recommendation)) {
      counts[result.recommendation]++;
    }
  });
  
  return counts;
}

/**
 * Display results in a formatted way
 * @param {Object} results - Complete optimization results
 */
function displayResults(results) {
  console.log('\n🎉 COMPLETE KEYWORD OPTIMIZATION RESULTS');
  console.log('='.repeat(50));
  
  console.log(`\n📱 App: ${results.appData.title}`);
  console.log(`🏪 Platform: ${results.appData.platform}`);
  
  console.log(`\n📊 Summary:`);
  console.log(`  Initial Keywords Generated: ${results.summary.totalInitialKeywords}`);
  console.log(`  Keywords Analyzed: ${results.summary.analyzedCount}`);
  console.log(`  Additional Suggestions: ${results.summary.additionalSuggestions}`);
  
  console.log(`\n🏆 Best Performing Keyword:`);
  const best = results.summary.bestPerformingKeyword;
  console.log(`  "${best.keyword}"`);
  console.log(`  Traffic: ${best.trafficScore}/100, Difficulty: ${best.difficultyScore}/100`);
  console.log(`  Recommendation: ${best.recommendation}`);
  
  console.log(`\n📈 ASO Analysis Results:`);
  results.workflow.analyzedKeywords.forEach((result, index) => {
    console.log(`  ${index + 1}. "${result.keyword}"`);
    console.log(`     Traffic: ${result.trafficScore}/100, Difficulty: ${result.difficultyScore}/100`);
    console.log(`     Recommendation: ${result.recommendation}`);
  });
  
  console.log(`\n💡 Additional LLM Suggestions:`);
  results.workflow.additionalSuggestions.forEach((keyword, index) => {
    console.log(`  ${index + 1}. ${keyword}`);
  });
  
  console.log(`\n📋 Recommendation Breakdown:`);
  Object.entries(results.summary.recommendations).forEach(([rec, count]) => {
    if (count > 0) {
      console.log(`  ${rec}: ${count}`);
    }
  });
}

// Export main functions
module.exports = {
  optimizeKeywords,
  getSuggestionsBasedOnASO,
  displayResults
};

// If run directly, test with mock data
if (require.main === module) {
  async function testOptimization() {
    try {
      const results = await optimizeKeywords(mockAppData, 'itunes', 10);
      displayResults(results);
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
  
  testOptimization();
}