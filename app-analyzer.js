require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// Initialize Anthropic client with API key from environment
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Function tool definition for keyword generation
const KEYWORD_FUNCTION = {
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

// Mock app store data for testing - Plant Identifier App
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

/**
 * Reads and encodes image file to base64
 * @param {string} imagePath - Path to the image file
 * @returns {string} Base64 encoded image data
 */
function readImageAsBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

/**
 * Generates relevant search keywords from app store data using Claude Sonnet
 * @param {Object} appData - Object containing title, description, and screenshots (image paths)
 * @returns {Promise<Object>} JSON object with structure: { "keywords": [string] }
 */
async function generateKeywords(appData) {
  try {
    // Prepare content array with text and images
    const content = [
      {
        type: "text",
        text: `Analyze this app store data and generate the most relevant search keywords that users would likely use to find this app:

Title: ${appData.title}

Description: ${appData.description}

I'm also providing screenshots of the app store page. Using the information provided in the screenshots, and the description of the app, provide the most relevant search queries directly related to the app and the information provided in screenshots, title, subtitle and description. ensuring only keywords/search queries that would be exact search phrases derived from title, subtitle, app screenshots, and description. exclude long tail keywords, "* app" search phrases and any search phrases a user just wouldnt search, only keywords that are relevant to title, subtitle, screenshots, and description (if not matching context to all these elements then ignore), must have a relevancy score of atleast 95%. Please create at least 20 keywords.

Use the generate_app_keywords function to return your response with the identified keywords.`
      }
    ];

    // Add screenshot images to the content
    for (const screenshotPath of appData.screenshots) {
      const base64Image = readImageAsBase64(screenshotPath);
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: base64Image
        }
      });
    }

    // Call Claude Sonnet API with images and function tools
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent keyword generation
      messages: [
        {
          role: 'user',
          content: content
        }
      ],
      tools: [KEYWORD_FUNCTION],
      tool_choice: { type: "tool", name: "generate_app_keywords" }
    });

    // Extract function call result from Claude's response
    const toolUse = response.content.find(content => content.type === 'tool_use');
    
    if (toolUse && toolUse.name === 'generate_app_keywords') {
      // Return the structured data from the function call
      return { keywords: toolUse.input.keywords };
    } else {
      throw new Error('No valid function call found in response');
    }

  } catch (error) {
    console.error('Error generating keywords:', error.message);
    throw error;
  }
}

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