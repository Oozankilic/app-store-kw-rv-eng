/**
 * Standalone LLM Keyword Generator
 * 
 * This file contains everything needed to generate keywords from app store data using Claude Sonnet.
 * It's completely self-contained and can be easily integrated into other projects.
 * 
 * Dependencies: @anthropic-ai/sdk, dotenv, fs
 * 
 * Usage:
 * const { generateKeywords } = require('./llm-keyword-generator');
 * const result = await generateKeywords(appData);
 */

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

// Initialize Anthropic client with API key from environment
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Function tool definition for keyword generation
const KEYWORD_FUNCTION_TOOL = {
  name: "generate_app_keywords",
  description: "Generates relevant search keywords for app store optimization based on app data and screenshots",
  input_schema: {
    type: "object",
    properties: {
      keywords: {
        type: "array",
        items: {
          type: "string",
          description: "A relevant search keyword that users would likely use to find this app"
        },
        description: "Array of 10-15 highly relevant keywords for app store search optimization"
      }
    },
    required: ["keywords"]
  }
};

/**
 * Reads and encodes image file to base64
 * @param {string} imagePath - Path to the image file
 * @returns {string} Base64 encoded image data
 */
function readImageAsBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error(`Error reading image ${imagePath}:`, error.message);
    throw new Error(`Failed to read image: ${imagePath}`);
  }
}

/**
 * Generates relevant search keywords from app store data using Claude Sonnet
 * 
 * @param {Object} appData - Object containing app information
 * @param {string} appData.title - App title
 * @param {string} appData.description - App description
 * @param {Array<string>} appData.screenshots - Array of image file paths
 * @param {Object} options - Optional configuration
 * @param {string} options.model - Claude model to use (default: claude-sonnet-4-20250514)
 * @param {number} options.maxTokens - Maximum tokens for response (default: 2000)
 * @param {number} options.temperature - Temperature for generation (default: 0.3)
 * @param {number} options.minKeywords - Minimum number of keywords to generate (default: 15)
 * 
 * @returns {Promise<Object>} JSON object with structure: { "keywords": [string] }
 */
async function generateKeywords(appData, options = {}) {
  // Validate input
  if (!appData || !appData.title || !appData.description) {
    throw new Error('appData must include title and description');
  }
  
  if (!appData.screenshots || !Array.isArray(appData.screenshots)) {
    throw new Error('appData must include screenshots array');
  }

  // Set default options
  const config = {
    model: options.model || 'claude-sonnet-4-20250514',
    maxTokens: options.maxTokens || 2000,
    temperature: options.temperature || 0.3,
    minKeywords: options.minKeywords || 15,
    ...options
  };

  try {
    console.log(`Generating keywords for: ${appData.title}`);
    
    // Prepare content array with text and images
    const content = [
      {
        type: "text",
        text: `Analyze this app store data and generate the most relevant search keywords that users would likely use to find this app:

Title: ${appData.title}

Description: ${appData.description}

I'm also providing screenshots of the app store page. Using the information provided in the screenshots, and the description of the app, provide the most relevant search queries directly related to the app and the information provided in screenshots, title, subtitle and description. ensuring only keywords/search queries that would be exact search phrases derived from title, subtitle, app screenshots, and description. exclude long tail keywords, "* app" search phrases and any search phrases a user just wouldnt search, only keywords that are relevant to title, subtitle, screenshots, and description (if not matching context to all these elements then ignore), must have a relevancy score of atleast 95%. Please create at least ${config.minKeywords} keywords.

Use the generate_app_keywords function to return your response with the identified keywords.`
      }
    ];

    // Add screenshot images to the content
    for (const screenshotPath of appData.screenshots) {
      try {
        const base64Image = readImageAsBase64(screenshotPath);
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: base64Image
          }
        });
      } catch (imageError) {
        console.warn(`Skipping image ${screenshotPath}: ${imageError.message}`);
      }
    }

    // Call Claude Sonnet API with images and function tools
    const response = await anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      messages: [
        {
          role: 'user',
          content: content
        }
      ],
      tools: [KEYWORD_FUNCTION_TOOL],
      tool_choice: { type: "tool", name: "generate_app_keywords" }
    });

    // Extract function call result from Claude's response
    const toolUse = response.content.find(content => content.type === 'tool_use');
    
    if (toolUse && toolUse.name === 'generate_app_keywords') {
      const keywords = toolUse.input.keywords;
      
      // Validate keywords
      if (!Array.isArray(keywords) || keywords.length === 0) {
        throw new Error('No keywords generated');
      }
      
      console.log(`✅ Generated ${keywords.length} keywords`);
      
      return { 
        keywords: keywords,
        metadata: {
          appTitle: appData.title,
          keywordCount: keywords.length,
          model: config.model,
          generatedAt: new Date().toISOString()
        }
      };
    } else {
      throw new Error('No valid function call found in response');
    }

  } catch (error) {
    console.error('Error generating keywords:', error.message);
    
    // Enhanced error details
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    
    throw new Error(`Keyword generation failed: ${error.message}`);
  }
}

/**
 * Analyzes app and generates keywords with enhanced logging
 * @param {Object} appData - App data object
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Results with keywords and analysis
 */
async function analyzeAndGenerateKeywords(appData, options = {}) {
  const startTime = Date.now();
  
  try {
    console.log('=== LLM Keyword Generation Analysis ===');
    console.log(`App: ${appData.title}`);
    console.log(`Screenshots: ${appData.screenshots?.length || 0}`);
    console.log('---');
    
    const result = await generateKeywords(appData, options);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('📊 Generation Results:');
    console.log(`✅ Generated ${result.keywords.length} keywords`);
    console.log(`⏱️  Processing time: ${duration}ms`);
    console.log('📋 Keywords:', result.keywords.slice(0, 5).join(', '), '...');
    
    return {
      ...result,
      performance: {
        durationMs: duration,
        keywordsPerSecond: Math.round((result.keywords.length / duration) * 1000)
      }
    };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  }
}

/**
 * Validate environment setup
 * @returns {boolean} True if environment is properly configured
 */
function validateEnvironment() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required');
    return false;
  }
  
  if (process.env.ANTHROPIC_API_KEY.includes('your_actual_anthropic_api_key_here')) {
    console.error('❌ Please set a real ANTHROPIC_API_KEY in your .env file');
    return false;
  }
  
  console.log('✅ Environment configured correctly');
  return true;
}

// Export main functions
module.exports = {
  generateKeywords,
  analyzeAndGenerateKeywords,
  validateEnvironment,
  KEYWORD_FUNCTION_TOOL,
  readImageAsBase64
};

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

// If run directly, test with mock data
if (require.main === module) {
  async function testWithMockData() {
    console.log('🔍 LLM Keyword Generator - Testing with Mock Data');
    console.log('');
    
    // Validate environment
    if (!validateEnvironment()) {
      return;
    }
    
    try {
      console.log('🚀 Starting keyword generation...');
      const result = await analyzeAndGenerateKeywords(mockAppData);
      
    console.log('Generated Keywords JSON:');
    console.log(JSON.stringify(result, null, 2));      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
  
  testWithMockData();
}