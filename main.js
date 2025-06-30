const { getAppData, getSimilarApps } = require('./services/app-store-scraper');
const { generateKeywords } = require('./services/keyword-generator');
const { ASOAnalyzer } = require('./services/aso-analyzer');

/**
 * Collects app data and similar apps, then logs the main app
 */
async function collectAppData(appId) {
  // Validate app ID is numeric
  const numericAppId = parseInt(appId, 10);
  if (isNaN(numericAppId) || numericAppId <= 0) {
    throw new Error('App ID must be a valid numeric value');
  }

  console.log(`🚀 Starting analysis for app ID: ${numericAppId}`);
  
  // Get app data from App Store
  const appData = await getAppData(numericAppId);

  // Get similar apps (limit to 3)
  const allSimilarApps = await getSimilarApps(numericAppId);
  const top3SimilarApps = allSimilarApps.slice(0, 3);

  // Scrape app data for top 3 similar apps
  const similarAppsData = [];
  for (const similarApp of top3SimilarApps) {
    try {
      const similarAppData = await getAppData(similarApp.id);
      similarAppsData.push(similarAppData);
    } catch (error) {
      console.warn(`⚠️ Failed to scrape data for similar app ${similarApp.id}: ${error.message}`);
    }
  }

  // Log the main app data
  console.log(`\n📋 Scraped App Data for ${appData.title}`);
  console.log(`📋 Also scraped data of ${similarAppsData.length} similar apps`);
  
  return { appData, similarApps: similarAppsData, numericAppId };
}

/**
 * Generates keywords for main app and similar apps
 */
async function generateAppKeywords(appData, similarApps) {
  console.log('\n🧠 Generating keywords for main app...');
  const mainAppKeywords = await generateKeywords(appData);
  
  console.log(`✅ Generated keywords for ${appData.title}:`);
  console.log(mainAppKeywords.keywords.join(', '));
  
  console.log('\n🧠 Generating keywords for similar apps...');
  const similarAppKeywords = [];
  for (const similarApp of similarApps) {
    try {
      const keywords = await generateKeywords(similarApp);
      similarAppKeywords.push(...keywords.keywords);
      console.log(`✅ Generated keywords for ${similarApp.title}:`);
      console.log(keywords.keywords.join(', '));
    } catch (error) {
      console.warn(`⚠️ Failed to generate keywords for ${similarApp.title}: ${error.message}`);
    }
  }
  
  return {
    mainAppKeywords: mainAppKeywords.keywords,
    similarAppKeywords: similarAppKeywords,
    allKeywords: [...mainAppKeywords.keywords, ...similarAppKeywords]
  };
}

/**
 * Analyzes 5 random keywords with ASO metrics
 */
async function analyzeRandomKeywords(allKeywords) {
  // Shuffle array and take 5 random keywords
  const shuffled = [...allKeywords].sort(() => 0.5 - Math.random());
  const random5Keywords = shuffled.slice(0, 5);
  
  console.log('\n📊 Analyzing 5 random keywords with ASO...');
  
  const asoAnalyzer = new ASOAnalyzer('itunes');
  const results = [];
  
  for (const keyword of random5Keywords) {
    try {
      const analysis = await asoAnalyzer.analyzeKeyword(keyword);
      results.push({
        keyword,
        traffic: analysis.trafficScore,
        difficulty: analysis.difficultyScore
      });
      console.log(`- ${keyword} | traffic: ${analysis.trafficScore} | difficulty: ${analysis.difficultyScore}`);
    } catch (error) {
      console.warn(`⚠️ Failed to analyze keyword "${keyword}": ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Main entry function for app analysis
 * @param {string|number} appId - The app ID (must be numeric)
 */
async function analyzeApp(appId) {
  try {
    // Step 1: Collect app data and similar apps, then log
    const { appData, similarApps } = await collectAppData(appId);

    // Step 2: Generate keywords for main app and similar apps
    const { mainAppKeywords, similarAppKeywords, allKeywords } = await generateAppKeywords(appData, similarApps);

    // Step 3: Analyze 5 random keywords from all keywords with ASO
    const keywordAnalysis = await analyzeRandomKeywords(allKeywords);

    return {
      appData,
      similarApps,
      mainAppKeywords,
      similarAppKeywords,
      allKeywords,
      keywordAnalysis
    };

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  }
}

// Export for use in other modules
module.exports = {
  analyzeApp
};

// If run directly, get app ID from command line arguments
if (require.main === module) {
  const appId = process.argv[2];
  
  if (!appId) {
    console.error('❌ Please provide an app ID as argument');
    console.log('Usage: node main.js <appId>');
    console.log('Example: node main.js 310633997');
    process.exit(1);
  }

  analyzeApp(appId);
}