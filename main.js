const { getAppData, getSimilarApps } = require('./services/app-store-scraper');

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
  console.log('📱 Fetching app data...');
  const appData = await getAppData(numericAppId);

  // Get similar apps (limit to 3)
  console.log('🔍 Fetching similar apps...');
  const allSimilarApps = await getSimilarApps(numericAppId);
  const top3SimilarApps = allSimilarApps.slice(0, 3);

  // Scrape app data for top 3 similar apps
  console.log('📱 Scraping data for top 3 similar apps...');
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
 * Main entry function for app analysis
 * @param {string|number} appId - The app ID (must be numeric)
 */
async function analyzeApp(appId) {
  try {
    // Collect app data and similar apps, then log
    const { appData, similarApps } = await collectAppData(appId);

    return {
      appData,
      similarApps
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