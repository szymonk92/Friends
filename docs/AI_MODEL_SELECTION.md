# AI Model Selection Feature

## Overview

The Friends mobile app now supports multiple AI models for story extraction, giving you the flexibility to choose between:

- **Anthropic Claude 3.5 Sonnet** - High quality analysis with excellent understanding
- **Google Gemini 2.5 Flash Lite** - Fast and efficient with lower costs

## Features

### 1. Model Selection
- Switch between AI models in Settings → AI Configuration
- Each model has its own API key storage
- Visual indicators show which API keys are configured

### 2. API Key Management
- Separate secure storage for Anthropic and Gemini API keys
- Keys are stored locally using AsyncStorage
- Easy to add, change, or clear API keys for each model

### 3. Seamless Integration
- The app automatically uses the selected model for all AI extractions
- No code changes needed when switching models
- Consistent extraction results regardless of model choice

## How to Use

### Setting Up

1. **Go to Settings**
   - Navigate to Settings from the main menu
   - Find the "AI Configuration" section

2. **Select Your Preferred Model**
   - Use the segmented buttons to choose between "Claude" or "Gemini"
   - Green checkmarks indicate which models have API keys configured

3. **Configure API Keys**

   **For Anthropic (Claude):**
   - Click "Set Claude API Key"
   - Get your key from: https://console.anthropic.com
   - Enter your key (starts with `sk-ant-...`)
   - Save

   **For Google Gemini:**
   - Click "Set Gemini API Key"
   - Get your key from: https://aistudio.google.com/apikey
   - Enter your key (starts with `AIza...`)
   - Save

4. **Start Using AI Extraction**
   - Write a story in the "Tell a Story" screen
   - The app will use your selected model for extraction
   - View results and manage extracted relations

### Switching Models

You can switch models at any time:

1. Go to Settings → AI Configuration
2. Tap the model you want to use (Claude or Gemini)
3. The app will immediately start using that model
4. Make sure you have an API key configured for the selected model

### Managing API Keys

**View Status:**
- Each API key section shows if a key is configured
- Green checkmark = Key is set
- Orange alert = Not configured

**Change a Key:**
1. Click "Change [Model] Key"
2. Enter the new API key
3. Save

**Clear a Key:**
1. Click "Clear [Model] Key"
2. Confirm the action
3. The key will be removed from secure storage

## Technical Details

### Architecture

The implementation uses a clean abstraction layer:

```typescript
// AI Service Configuration
interface AIServiceConfig {
  model: 'anthropic' | 'gemini';
  apiKey: string;
}

// Unified AI calling interface
async function callAI(config: AIServiceConfig, prompt: string): Promise<Response>
```

### Files Modified

1. **Store**: `/store/useSettings.ts`
   - Added model selection state
   - Added Gemini API key storage
   - Added helper methods for active API key

2. **AI Service**: `/lib/ai/ai-service.ts` (new)
   - Abstracted AI provider interface
   - Handles both Anthropic and Gemini calls
   - Unified response parsing

3. **Extraction**: `/lib/ai/extraction.ts`
   - Updated to use new AI service
   - Model-agnostic implementation

4. **Hooks**: `/hooks/useAIExtraction.ts`, `/hooks/useExtraction.ts`
   - Updated to pass model configuration
   - Use active API key from settings

5. **UI**: `/app/settings.tsx`
   - Model selection UI
   - Dual API key management
   - Visual status indicators

### Data Storage

API keys and model selection are stored securely:

```typescript
// AsyncStorage keys
'@friends_api_key'          // Anthropic API key
'@friends_gemini_api_key'   // Gemini API key
'@friends_selected_model'   // Selected model ('anthropic' | 'gemini')
```

### Model Specifications

**Anthropic Claude 3.5 Sonnet:**
- Model ID: `claude-3-5-sonnet-20241022`
- Max tokens: 4000
- Temperature: 0.3
- Best for: Complex analysis, nuanced understanding

**Google Gemini 2.5 Flash Lite:**
- Model ID: `gemini-2.0-flash-lite`
- Max tokens: 4000
- Temperature: 0.3
- Best for: Fast processing, cost efficiency

Both models use the same extraction prompt and produce compatible outputs.

## Testing

Comprehensive tests are included:

### Unit Tests

**AI Service Tests** (`lib/ai/__tests__/ai-service.test.ts`):
- Response parsing (JSON, markdown code blocks)
- Anthropic API calls
- Gemini API calls
- Error handling

**Settings Store Tests** (`store/__tests__/useSettings.test.ts`):
- Model selection
- API key storage (both models)
- Active API key retrieval
- Storage persistence

### Running Tests

```bash
npm test
```

### Manual Testing Checklist

- [ ] Can select Anthropic model
- [ ] Can select Gemini model
- [ ] Can set Anthropic API key
- [ ] Can set Gemini API key
- [ ] Can change existing API keys
- [ ] Can clear API keys
- [ ] Warning shows when no key is set for selected model
- [ ] Story extraction works with Claude
- [ ] Story extraction works with Gemini
- [ ] Can switch models mid-session
- [ ] API keys persist after app restart

## Future Enhancements

Potential improvements for future versions:

1. **Cost Tracking**
   - Track token usage per model
   - Show estimated costs
   - Monthly spending reports

2. **Model Comparison**
   - Side-by-side extraction results
   - Quality metrics per model
   - Performance benchmarks

3. **Advanced Configuration**
   - Custom temperature settings
   - Max tokens adjustment
   - Response format options

4. **More Models**
   - OpenAI GPT-4
   - Cohere
   - Local models (Ollama)

## Troubleshooting

**"API Key Required" error:**
- Check that you've set an API key for the selected model
- Verify the key format is correct
- Try re-entering the key

**Extraction fails:**
- Ensure you have a valid API key
- Check your internet connection
- Verify API key has credits/quota

**Model switch doesn't work:**
- Make sure the target model has an API key configured
- Restart the app if needed

## Security

- All API keys are stored locally on your device
- Keys are never sent to any server except the respective AI provider
- AsyncStorage provides secure storage on both iOS and Android
- No keys are logged or exposed in error messages

## Support

For issues or questions:
1. Check this documentation
2. Review Settings → AI Configuration
3. Verify API keys are valid and have quota
4. Check app logs for detailed error messages
