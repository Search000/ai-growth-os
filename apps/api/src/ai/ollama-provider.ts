import type { AIProvider, ChatMessage, ChatOptions, ChatResult } from "./provider.js";
import { config } from "../config.js";
import { logger } from "../logger.js";

interface OllamaChatResponse {
  message: { role: string; content: string };
  model: string;
  done: boolean;
}

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = config.AI_BASE_URL, model: string = config.AI_MODEL) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
    const start = Date.now();

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: options?.temperature ?? config.AI_TEMPERATURE,
          num_predict: options?.maxTokens ?? config.AI_MAX_OUTPUT_TOKENS,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, errorText }, "Ollama request failed");
      throw new Error(`Ollama request failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    const durationMs = Date.now() - start;

    return {
      content: data.message.content,
      model: data.model,
      durationMs,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (err) {
      logger.error({ err }, "Ollama health check failed");
      return false;
    }
  }
}
