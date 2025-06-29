const { generateKeywords } = require('./services/keyword-generator');
const { mockAppData } = require('./data/mock-data');

/**
 * Main function to analyze app and generate keywords
 */
async function analyzeApp(appData = mockAppData) {
  console.log('Analyzing app:', appData.title);
  console.log('---');
  
  try {
    // Generate keywords using LLM
    const result = await generateKeywords(appData);
    
    console.log('Generated Keywords JSON:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    console.error('Failed to analyze app:', error.message);
    return { keywords: [] };
  }
}

// Export functions for use in other modules
module.exports = {
  generateKeywords,
  analyzeApp,
  mockAppData
};

// If run directly, execute with mock data
if (require.main === module) {
  analyzeApp();
}