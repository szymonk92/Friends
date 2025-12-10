import { callAI, parseExtractionResponse } from '../ai-service';
import type { AIServiceConfig } from '../ai-service';

jest.mock('@anthropic-ai/sdk');
jest.mock('@google/generative-ai');

describe('AI Service', () => {
  describe('parseExtractionResponse', () => {
    it('should parse JSON wrapped in markdown code blocks', () => {
      const response = '```json\n{"people": [], "relations": []}\n```';
      const result = parseExtractionResponse(response);
      expect(result).toEqual({ people: [], relations: [] });
    });

    it('should parse JSON without code blocks', () => {
      const response = '{"people": [], "relations": []}';
      const result = parseExtractionResponse(response);
      expect(result).toEqual({ people: [], relations: [] });
    });

    it('should parse JSON with markdown without json tag', () => {
      const response = '```\n{"people": [], "relations": []}\n```';
      const result = parseExtractionResponse(response);
      expect(result).toEqual({ people: [], relations: [] });
    });

    it('should handle complex extraction data', () => {
      const response = `\`\`\`json
{
  "people": [
    {
      "id": "temp-1",
      "name": "John",
      "isNew": true,
      "personType": "primary",
      "confidence": 0.95
    }
  ],
  "relations": [
    {
      "subjectId": "temp-1",
      "relationType": "LIKES",
      "objectLabel": "pizza",
      "confidence": 0.9
    }
  ],
  "conflicts": []
}
\`\`\``;
      const result = parseExtractionResponse(response);
      expect(result.people).toHaveLength(1);
      expect(result.relations).toHaveLength(1);
      expect(result.people[0].name).toBe('John');
      expect(result.relations[0].objectLabel).toBe('pizza');
    });
  });

  describe('callAI', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call Anthropic when model is anthropic', async () => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"test": "data"}' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
      Anthropic.mockImplementation(() => ({
        messages: { create: mockCreate },
      }));

      const config: AIServiceConfig = {
        model: 'anthropic',
        apiKey: 'test-key',
      };

      const result = await callAI(config, 'test prompt');

      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-key', timeout: 60000 });
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: 'test prompt',
          },
        ],
      });
      expect(result.response).toBe('{"test": "data"}');
      expect(result.tokensUsed).toBe(150);
    });

    it('should call Gemini when model is gemini', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          text: () => '{"test": "gemini"}',
          usageMetadata: {
            promptTokenCount: 80,
            candidatesTokenCount: 40,
          },
        },
      });
      const mockGetGenerativeModel = jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      });
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: mockGetGenerativeModel,
      }));

      const config: AIServiceConfig = {
        model: 'gemini',
        apiKey: 'test-gemini-key',
      };

      const result = await callAI(config, 'test prompt');

      expect(GoogleGenerativeAI).toHaveBeenCalledWith('test-gemini-key');
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.0-flash-lite',
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000,
          responseMimeType: 'application/json',
        },
      });
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'test prompt' }] }],
      });
      expect(result.response).toBe('{"test": "gemini"}');
      expect(result.tokensUsed).toBe(120);
    });

    it('should throw error on invalid Anthropic response type', async () => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = jest.fn().mockResolvedValue({
        content: [{ type: 'image', data: 'invalid' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });
      Anthropic.mockImplementation(() => ({
        messages: { create: mockCreate },
      }));

      const config: AIServiceConfig = {
        model: 'anthropic',
        apiKey: 'test-key',
      };

      await expect(callAI(config, 'test prompt')).rejects.toThrow(
        'Unexpected response type from Claude'
      );
    });

    it('should handle Gemini response without usage metadata', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          text: () => '{"test": "gemini"}',
          usageMetadata: null,
        },
      });
      const mockGetGenerativeModel = jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      });
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: mockGetGenerativeModel,
      }));

      const config: AIServiceConfig = {
        model: 'gemini',
        apiKey: 'test-gemini-key',
      };

      const result = await callAI(config, 'test prompt');

      expect(result.response).toBe('{"test": "gemini"}');
      expect(result.tokensUsed).toBeUndefined();
    });
  });
});
