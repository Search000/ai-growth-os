export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}
export interface ChatResult {
  content: string;
  model: string;
  durationMs: number;
}
export interface AIProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
  embed(text: string): Promise<number[]>;
  healthCheck(): Promise<boolean>;
}
