require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const { KEYWORD_FUNCTION } = require('../tools/keyword-tool');

// Initialize Anthropic client with API key from environment
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

module.exports = {
  generateKeywords
};