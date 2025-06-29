const { ASO } = require('aso-v2');

async function debugASO() {
  console.log('🔍 Debugging ASO-V2 Library...\n');
  
  try {
    // Test direct ASO-V2 usage
    console.log('1. Testing direct ASO-V2 instantiation...');
    const aso = new ASO('itunes');
    console.log('✅ ASO instance created for iTunes');
    
    // Check available methods
    console.log('\n2. Available ASO methods:');
    console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(aso)));
    
    // Test a simple keyword
    console.log('\n3. Testing keyword analysis...');
    const keyword = 'fitness app';
    console.log(`Analyzing: "${keyword}"`);
    
    const result = await aso.analyzeKeyword(keyword);
    console.log('Raw ASO result:', JSON.stringify(result, null, 2));
    
    // Test different methods if available
    console.log('\n4. Testing other potential methods...');
    
    if (typeof aso.search === 'function') {
      console.log('Testing search method...');
      const searchResult = await aso.search(keyword);
      console.log('Search result:', JSON.stringify(searchResult, null, 2));
    }
    
    if (typeof aso.suggest === 'function') {
      console.log('Testing suggest method...');
      const suggestResult = await aso.suggest(keyword);
      console.log('Suggest result:', JSON.stringify(suggestResult, null, 2));
    }
    
    if (typeof aso.app === 'function') {
      console.log('Testing app method...');
      const appResult = await aso.app({ appId: 'com.example.fitness' });
      console.log('App result:', JSON.stringify(appResult, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

debugASO();