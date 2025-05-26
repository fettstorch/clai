import { once } from "@fettstorch/jule";
import OpenAI from "openai";

const MAX_INPUT_TOKENS = 10000;

function truncateContent(content: string): string {
  const maxChars = MAX_INPUT_TOKENS * 4;
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars);
}

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

  async complete(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
    } = {}
  ): Promise<string> {
    const truncatedPrompt = truncateContent(prompt);
    const { model = "gpt-4o", temperature = 0.6 } = options;

    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: "user", content: truncatedPrompt }],
      temperature,
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content ?? "";
  }

  async completeStructured<T>(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      functionName?: string;
      responseSchema: Record<string, unknown>;
    }
  ): Promise<T> {
    const truncatedPrompt = truncateContent(prompt);
    const {
      model = "gpt-4o",
      temperature = 1.6,
      functionName = "generate_response",
      responseSchema,
    } = options;

    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: "user", content: truncatedPrompt }],
      temperature,
      max_tokens: 2000,
      functions: [
        {
          name: functionName,
          parameters: {
            type: "object",
            properties: responseSchema,
            required: Object.keys(responseSchema),
          },
        },
      ],
      function_call: { name: functionName },
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall?.arguments) {
      throw new Error("No function call arguments received");
    }

    return JSON.parse(functionCall.arguments) as T;
  }
}

export const openaiClient: (apiKey?: string) => OpenAIWrapper = once(
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    return new OpenAIWrapper(apiKey);
  }
);
