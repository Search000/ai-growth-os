import { toolRegistry } from "./registry.js";
import { getCurrentTimeTool } from "./get-current-time.js";
import { crawlAndAnalyzeTool } from "./crawl-and-analyze.js";

export function registerTools(): void {
  toolRegistry.register(getCurrentTimeTool);
  toolRegistry.register(crawlAndAnalyzeTool);
}

export { toolRegistry } from "./registry.js";
export type { Tool, ToolDefinition, ToolParam } from "./tool.js";
