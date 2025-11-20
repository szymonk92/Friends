import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIModel } from '@/store/useSettings';

export interface AIServiceConfig {
  model: AIModel;
  apiKey: string;
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds

// Error types for classification
export enum AIErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_API_KEY = 'INVALID_API_KEY',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  CONTENT_POLICY = 'CONTENT_POLICY',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface AIError extends Error {
  type: AIErrorType;
  retryable: boolean;
  retryAfter?: number; // milliseconds
  statusCode?: number;
}

/**
 * Main AI call function with retry logic and error handling
 * 
 * @param config - AI model configuration
 * @param prompt - The prompt to send
 * @param retryCount - Current retry attempt (internal use)
 * @returns AI response with token usage
 * 
 * TODO: Rate limiting per user
 * - Track requests per user in database or Redis
 * - Implement sliding window rate limit (e.g., 10 requests per hour)
 * - Show user their remaining quota in UI
 * - Queue requests if limit reached
 * - Consider premium tier with higher limits
 */
export async function callAI(
  config: AIServiceConfig,
  prompt: string,
  retryCount: number = 0
): Promise<{ response: string; tokensUsed?: number }> {
  try {
    if (config.model === 'anthropic') {
      return await callAnthropic(config.apiKey, prompt);
    } else {
      return await callGemini(config.apiKey, prompt);
    }
  } catch (error) {
    const aiError = classifyError(error, config.model);
    
    // If retryable and haven't exceeded max retries, retry with exponential backoff
    if (aiError.retryable && retryCount < MAX_RETRIES) {
      const delay = calculateRetryDelay(retryCount, aiError.retryAfter);
      console.log(`[AI Service] Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms for ${aiError.type}`);
      
      await sleep(delay);
      return callAI(config, prompt, retryCount + 1);
    }
    
    // Not retryable or max retries exceeded
    throw createUserFriendlyError(aiError, config.model);
  }
}

async function callAnthropic(
  apiKey: string,
  prompt: string
): Promise<{ response: string; tokensUsed: number }> {
  const anthropic = new Anthropic({ 
    apiKey,
    timeout: 60000, // 60 second timeout
  });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      const error = new Error('Unexpected response type from Claude') as AIError;
      error.type = AIErrorType.INVALID_RESPONSE;
      error.retryable = false;
      throw error;
    }

    return {
      response: content.text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  } catch (error: any) {
    // Re-throw with additional context
    throw error;
  }
}

async function callGemini(
  apiKey: string,
  prompt: string
): Promise<{ response: string; tokensUsed?: number }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-lite',
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4000,
      responseMimeType: 'application/json',
    },
  });

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const response = await result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      const error = new Error('Empty response from Gemini') as AIError;
      error.type = AIErrorType.INVALID_RESPONSE;
      error.retryable = true; // Empty responses might be temporary
      throw error;
    }

    return {
      response: text,
      tokensUsed: response.usageMetadata
        ? response.usageMetadata.promptTokenCount + response.usageMetadata.candidatesTokenCount
        : undefined,
    };
  } catch (error: any) {
    // Re-throw with additional context
    throw error;
  }
}

/**
 * Classify error to determine if it's retryable and how to handle it
 */
function classifyError(error: any, _model: AIModel): AIError {
  const aiError = error as AIError;
  
  // Default values
  aiError.type = AIErrorType.UNKNOWN;
  aiError.retryable = false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorString = error.toString().toLowerCase();
  
  // Rate limit errors (429)
  if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('resource exhausted')) {
    aiError.type = AIErrorType.RATE_LIMIT;
    aiError.retryable = true;
    aiError.statusCode = 429;
    // Extract retry-after if available, otherwise use exponential backoff
    const retryAfterMatch = errorMessage.match(/retry[- ]after[:\s]+(\d+)/i);
    if (retryAfterMatch) {
      aiError.retryAfter = parseInt(retryAfterMatch[1]) * 1000;
    }
    return aiError;
  }
  
  // Quota exceeded (billing/limits)
  if (errorMessage.includes('quota') || errorMessage.includes('insufficient_quota') || errorMessage.includes('billing')) {
    aiError.type = AIErrorType.QUOTA_EXCEEDED;
    aiError.retryable = false; // User needs to add credits
    aiError.statusCode = 429;
    return aiError;
  }
  
  // Invalid API key (401/403)
  if (errorMessage.includes('401') || errorMessage.includes('403') || 
      errorMessage.includes('unauthorized') || errorMessage.includes('forbidden') ||
      errorMessage.includes('invalid api key') || errorMessage.includes('authentication')) {
    aiError.type = AIErrorType.INVALID_API_KEY;
    aiError.retryable = false;
    aiError.statusCode = error.status || 401;
    return aiError;
  }
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || 
      errorMessage.includes('econnrefused') || errorMessage.includes('enotfound') ||
      errorString.includes('networkerror')) {
    aiError.type = AIErrorType.NETWORK_ERROR;
    aiError.retryable = true;
    return aiError;
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out') || errorMessage.includes('etimedout')) {
    aiError.type = AIErrorType.TIMEOUT;
    aiError.retryable = true;
    return aiError;
  }
  
  // Content policy violations
  if (errorMessage.includes('content policy') || errorMessage.includes('safety') || 
      errorMessage.includes('harmful') || errorMessage.includes('blocked')) {
    aiError.type = AIErrorType.CONTENT_POLICY;
    aiError.retryable = false;
    return aiError;
  }
  
  // Server errors (500s)
  if (errorMessage.includes('500') || errorMessage.includes('502') || 
      errorMessage.includes('503') || errorMessage.includes('504') ||
      errorMessage.includes('server error') || errorMessage.includes('internal error')) {
    aiError.type = AIErrorType.SERVER_ERROR;
    aiError.retryable = true;
    aiError.statusCode = 500;
    return aiError;
  }
  
  // Invalid response format
  if (error.type === AIErrorType.INVALID_RESPONSE) {
    return aiError; // Already set
  }
  
  // Unknown error - be conservative and don't retry
  console.warn('[AI Service] Unknown error type:', error);
  return aiError;
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(retryCount: number, retryAfter?: number): number {
  if (retryAfter) {
    return retryAfter;
  }
  
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  const exponentialDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 500;
  
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY);
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create user-friendly error message
 */
function createUserFriendlyError(error: AIError, model: AIModel): Error {
  const modelName = model === 'anthropic' ? 'Claude' : 'Gemini';
  
  let message = '';
  let suggestion = '';
  
  switch (error.type) {
    case AIErrorType.RATE_LIMIT:
      message = `${modelName} rate limit reached. Please wait a moment and try again.`;
      suggestion = 'Tip: Try again in a few minutes, or consider upgrading your API plan for higher limits.';
      break;
      
    case AIErrorType.QUOTA_EXCEEDED:
      message = `${modelName} quota exceeded. You've run out of API credits.`;
      suggestion = 'Action required: Add credits to your API account or wait for quota reset.';
      break;
      
    case AIErrorType.INVALID_API_KEY:
      message = `Invalid ${modelName} API key. Please check your settings.`;
      suggestion = 'Action required: Go to Settings and update your API key.';
      break;
      
    case AIErrorType.NETWORK_ERROR:
      message = 'Network connection error. Please check your internet connection.';
      suggestion = 'Tip: Make sure you have a stable internet connection and try again.';
      break;
      
    case AIErrorType.TIMEOUT:
      message = `Request timed out. ${modelName} took too long to respond.`;
      suggestion = 'Tip: Try with a shorter story or try again later.';
      break;
      
    case AIErrorType.INVALID_RESPONSE:
      message = `${modelName} returned an invalid response.`;
      suggestion = 'This is unusual. Please try again or contact support if it persists.';
      break;
      
    case AIErrorType.CONTENT_POLICY:
      message = 'Content blocked by AI safety policy.';
      suggestion = 'Your story content may have triggered safety filters. Try rephrasing.';
      break;
      
    case AIErrorType.SERVER_ERROR:
      message = `${modelName} server error. This is on their end.`;
      suggestion = 'Tip: Wait a few minutes and try again. The service should recover soon.';
      break;
      
    default:
      message = `AI extraction failed: ${error.message}`;
      suggestion = 'Please try again. If the problem persists, check your API key in Settings.';
  }
  
  const fullMessage = `${message}\n\n${suggestion}`;
  const friendlyError = new Error(fullMessage);
  (friendlyError as any).originalError = error;
  (friendlyError as any).errorType = error.type;
  
  return friendlyError;
}

export function parseExtractionResponse(rawResponse: string): any {
  try {
    // Try parsing as pure JSON first (Gemini with responseMimeType)
    const parsed = JSON.parse(rawResponse.trim());
    return parsed;
  } catch {
    // Fall back to markdown extraction (Claude might wrap in code blocks)
    const jsonMatch = rawResponse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || [
      null,
      rawResponse,
    ];
    const jsonText = jsonMatch[1] || rawResponse;
    
    try {
      return JSON.parse(jsonText.trim());
    } catch {
      console.error('[AI Service] Failed to parse response:', rawResponse.substring(0, 200));
      throw new Error('Failed to parse AI response as JSON. The response format was invalid.');
    }
  }
}
