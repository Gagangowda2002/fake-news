# Setup Instructions for Image Analyzer Feature

## Prerequisites

You need a **Google Gemini API Key** to use the image analysis feature.

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Select your project or create a new one
4. Copy the generated API key

## Configuration

### For Local Development

1. Create a `.env.local` file in the project root:
```bash
GEMINI_API_KEY=your_api_key_here
```

2. The Vite dev server will automatically load this environment variable.

### For Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to **Settings > Environment Variables**
3. Add a new environment variable:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Gemini API key
4. Redeploy your project

## How It Works

The Image Analyzer uses Google's Gemini Vision API to:
- Examine image content for signs of manipulation
- Detect compression artifacts and unusual patterns
- Identify AI-generated content indicators
- Analyze lighting and shadow consistency
- Flag suspicious areas or blending issues

## API Endpoint

The image analysis is handled by the `/api/analyzeImage` serverless function, which:
1. Receives base64-encoded image data from the frontend
2. Sends it to Gemini Vision API with a custom analysis prompt
3. Returns structured JSON with findings and confidence level

## Rate Limits

Google's free Gemini API has rate limits:
- 60 requests per minute
- 1,500 requests per day

For higher limits, consider upgrading to a paid plan.

## Security Notes

- Never commit your API key to version control
- Use environment variables for all sensitive credentials
- The Vercel function runs server-side (your API key is not exposed to the client)
- Images are not stored or logged

## Troubleshooting

### "Gemini API key not configured" error
- Ensure you've added `GEMINI_API_KEY` to your environment variables
- For local dev, check your `.env.local` file
- For Vercel, redeploy after adding the environment variable

### Image analysis takes too long
- Check your internet connection
- Verify the image file size is under 5MB
- Check if you've reached the API rate limit

### "Failed to analyze image" error
- Ensure the image format is supported (JPG, PNG, GIF, WebP)
- Try with a different image
- Check browser console for more details
