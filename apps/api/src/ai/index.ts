import { OllamaProvider } from "./ollama-provider.js";
import type { AIProvider } from "./provider.js";
import { config } from "../config.js";

let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!providerInstance) {
    if (config.AI_RUNTIME === "ollama") {
      providerInstance = new OllamaProvider();
    } else {
      throw new Error(`Unsupported AI_RUNTIME: ${config.AI_RUNTIME}`);
    }
  }
  return providerInstance;
}
