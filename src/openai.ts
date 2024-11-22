import { once } from '@fettstorch/jule';
import OpenAI from 'openai';

export interface StructuredResponse<T> {
  function_call: {
    arguments: string;
  };
}

class OpenAIWrapper {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generates a simple text completion using GPT model
   */
  async complete(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
    } = {}
  ): Promise<string> {
    const { model = 'gpt-3.5-turbo', temperature = 0.6 } = options;

    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature
    });

    return response.choices[0]?.message?.content ?? '';
  }

  /**
   * Generates a structured completion using GPT model
   */
  async completeStructured<T>(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      functionName?: string;
      responseSchema: Record<string, unknown>;
    }
  ): Promise<T> {
    const { 
      model = 'gpt-3.5-turbo', 
      temperature = 0.6,
      functionName = 'generate_response',
      responseSchema 
    } = options;

    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      functions: [{
        name: functionName,
        parameters: {
          type: 'object',
          properties: responseSchema,
          required: Object.keys(responseSchema)
        }
      }],
      function_call: { name: functionName }
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall?.arguments) {
      throw new Error('No function call arguments received');
    }

    return JSON.parse(functionCall.arguments) as T;
  }
}

export const openaiClient: (apiKey?: string) => OpenAIWrapper = once((apiKey?: string) => {
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not set')
    }
    return new OpenAIWrapper(apiKey)
}); 