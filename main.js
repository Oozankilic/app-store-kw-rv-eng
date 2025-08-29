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
 * Analyzes a single keyword with error handling for parallel processing
 * @param {string} keyword - Keyword to analyze
 * @param {ASOAnalyzer} asoAnalyzer - ASO analyzer instance
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeKeywordParallel(keyword, asoAnalyzer) {
  try {
    console.log(`📊 Analyzing: "${keyword}"`);
    const analysis = await asoAnalyzer.analyzeKeyword(keyword);
    return {
      keyword: analysis.keyword,
      trafficScore: analysis.trafficScore,
      difficultyScore: analysis.difficultyScore,
      competitionLevel: analysis.competitionLevel,
      trafficLevel: analysis.trafficLevel,
      recommendation: analysis.recommendation
    };
  } catch (error) {
    console.warn(`⚠️ Failed to analyze keyword "${keyword}": ${error.message}`);
    return {
      keyword,
      trafficScore: 0,
      difficultyScore: 0,
      competitionLevel: 'unknown',
      trafficLevel: 'unknown',
      recommendation: 'analysis_failed',
      error: error.message
    };
  }
}

/**
 * Processes keywords in parallel batches to avoid overwhelming the API
 * @param {Array<string>} keywords - Keywords to analyze
 * @param {ASOAnalyzer} asoAnalyzer - ASO analyzer instance
 * @param {number} batchSize - Number of concurrent requests (default: 3)
 * @returns {Promise<Array<Object>>} Analysis results
 */
async function processKeywordsBatch(keywords, asoAnalyzer, batchSize = 3) {
  const results = [];
  
  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    console.log(`\n🚀 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(keywords.length / batchSize)} (${batch.length} keywords)`);
    
    // Process batch in parallel
    const batchPromises = batch.map(keyword => analyzeKeywordParallel(keyword, asoAnalyzer));
    const batchResults = await Promise.all(batchPromises);
    
    results.push(...batchResults);
    
    // Small delay between batches to be respectful to the API
    if (i + batchSize < keywords.length) {
      console.log('⏳ Waiting 1 second before next batch...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Searches and analyzes comma-separated keywords with ASO metrics (parallelized)
 * @param {string} keywordsString - Comma-separated keywords string
 * @param {number} concurrency - Number of concurrent requests per batch (default: 3)
 */
async function searchKeywords(keywordsString, concurrency = 3) {
  // Parse comma-separated keywords and clean them
  const keywords = keywordsString
    .split(',')
    .map(keyword => keyword.trim())
    .filter(keyword => keyword.length > 0);
  
  if (keywords.length === 0) {
    console.error('❌ No valid keywords provided');
    return [];
  }
  
  console.log(`🔍 Searching and analyzing ${keywords.length} keywords on itunes (${concurrency} concurrent):`);
  keywords.forEach(keyword => console.log(`  - "${keyword}"`));
  
  const asoAnalyzer = new ASOAnalyzer('itunes');
  const startTime = Date.now();
  
  // Process keywords in parallel batches
  const results = await processKeywordsBatch(keywords, asoAnalyzer, concurrency);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
  // Sort results: traffic score descending, then difficulty score ascending
  results.sort((a, b) => {
    if (b.trafficScore !== a.trafficScore) {
      return b.trafficScore - a.trafficScore; // Higher traffic first
    }
    return a.difficultyScore - b.difficultyScore; // Lower difficulty first
  });
  
  // Display sorted results
  console.log('\n📈 Results sorted by traffic score (desc) → difficulty score (asc):');
  console.log('─'.repeat(80));
  console.log('Keyword'.padEnd(25) + 'Traffic'.padEnd(10) + 'Difficulty'.padEnd(12) + 'Recommendation');
  console.log('─'.repeat(80));
  
  results.forEach(result => {
    const keyword = result.keyword.padEnd(25);
    const traffic = result.trafficScore.toString().padEnd(10);
    const difficulty = result.difficultyScore.toString().padEnd(12);
    const recommendation = result.recommendation;
    console.log(`${keyword}${traffic}${difficulty}${recommendation}`);
  });
  
  console.log('─'.repeat(80));
  console.log(`\n✅ Analysis complete! Analyzed ${results.length} keywords in ${duration}s`);
  
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
  analyzeApp,
  searchKeywords
};

// If run directly, handle command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Please provide arguments');
    console.log('Usage:');
    console.log('  node main.js <appId>                    - Analyze an app');
    console.log('  node main.js -search "keyword1,keyword2" - Search keywords');
    console.log('');
    console.log('Examples:');
    console.log('  node main.js 310633997');
    console.log('  node main.js -search "AI photo editor,AI image editor,photo editor,photo editing"');
    process.exit(1);
  }
  
  // Handle -search command
  if (args[0] === '-search') {
    if (!args[1]) {
      console.error('❌ Please provide keywords after -search');
      console.log('Usage: node main.js -search "keyword1,keyword2,keyword3" [concurrency]');
      console.log('Examples:');
      console.log('  node main.js -search "AI photo editor,AI image editor,photo editor,photo editing"');
      console.log('  node main.js -search "keywords..." 5');
      console.log('  node main.js -search "keywords..." 10');
      process.exit(1);
    }
    
    const keywordsString = args[1];
    const concurrency = parseInt(args[2]) || 3; // Optional concurrency parameter
    
    // Validate concurrency
    if (concurrency < 1 || concurrency > 20) {
      console.error('❌ Concurrency must be between 1 and 20');
      process.exit(1);
    }
    
    searchKeywords(keywordsString, concurrency).catch(error => {
      console.error('❌ Search failed:', error.message);
      process.exit(1);
    });
  }
  // Handle regular app analysis
  else {
    const appId = args[0];
    
    // Validate app ID is numeric
    const numericAppId = parseInt(appId, 10);
    if (isNaN(numericAppId) || numericAppId <= 0) {
      console.error('❌ App ID must be a valid numeric value');
      console.log('Usage: node main.js <appId>');
      console.log('Example: node main.js 310633997');
      process.exit(1);
    }

    analyzeApp(appId).catch(error => {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    });
  }
}