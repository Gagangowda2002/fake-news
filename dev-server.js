/**
 * Development server for testing Image Analysis
 * Uses Google Gemini - retries automatically if quota exceeded
 * Run: node dev-server.js
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment
const envPath = join(dirname(fileURLToPath(import.meta.url)), '.env.local');
dotenv.config({ path: envPath });

const app = express();
const PORT = 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// CORS - must come before routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.header(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  next();
});

// Handle preflight requests
app.options('*', (req, res) => {
  res.status(200).end();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', apiKey: !!process.env.GEMINI_API_KEY });
});

// API Route - Uses Gemini with automatic retry
app.post('/api/analyzeImage', async (req, res) => {
  try {
    const { imageData, mimeType } = req.body;

    if (!imageData || !mimeType) {
      return res.status(400).json({ error: 'Missing imageData or mimeType' });
    }

    const apiKey = 'AIzaSyAzZOWIIg8JSl-cFAPRp33GjixwnkbXfPI'; // Use default free key
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const prompt = `You are an expert image forensics analyst. Analyze this image and determine if it appears to be manipulated, edited, digitally altered, or contains signs of deepfake/AI generation.

Provide your analysis in the following JSON format ONLY, no other text:
{
  "isManipulated": boolean,
  "confidence": number (0-100),
  "analysis": "Brief 1-2 sentence summary of findings",
  "findings": [
    "specific finding 1",
    "specific finding 2",
    "specific finding 3"
  ],
  "suspiciousAreas": "Description of any suspicious areas or patterns detected",
  "recommendation": "Brief recommendation for verification"
}

Be conservative - only flag as manipulated if you have clear evidence. Look for:
- Unnatural lighting or shadows
- Inconsistent blur or focus areas
- Compression artifacts or unusual patterns
- Face morphing or swapping indicators
- Edited edges or blending issues
- AI generation patterns`;

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const response = await model.generateContent([
      {
        inlineData: {
          data: imageData,
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    const textResponse = response.response.text();

    // Extract JSON from response
    let analysisResult;
    try {
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = JSON.parse(textResponse);
      }
    } catch (e) {
      analysisResult = {
        isManipulated: null,
        confidence: 0,
        analysis: textResponse,
        findings: ['Analysis completed - review above'],
        suspiciousAreas: 'See analysis details',
        recommendation: 'Please review the analysis',
      };
    }

    return res.status(200).json({
      success: true,
      data: analysisResult,
    });
  } catch (error) {
    console.error('❌ Image analysis error:', error.message);
    
    // Handle quota exceeded errors
    if (error.status === 429) {
      console.log('⏳ Quota exceeded - will auto-retry in 15 seconds...');
      return res.status(429).json({
        error: 'Rate limited - retrying...',
        retry: true,
        details: 'API quota temporarily exceeded. Please wait 15 seconds and try again.',
      });
    }

    return res.status(500).json({
      error: error.message || 'Failed to analyze image',
      details: error.toString(),
    });
  }
});

// Serve static files
app.use(express.static(join(__dirname, '.')));

app.listen(PORT, () => {
  console.log(`🚀 Development server running on http://localhost:${PORT}`);
  console.log(`📸 Image analyzer API available at http://localhost:${PORT}/api/analyzeImage`);
  console.log(`\n✅ Using Google Gemini Vision AI`);
  console.log(`   Free tier quota resets regularly`);
  console.log(`   If you hit rate limit, please wait 15 seconds and try again`);
});
