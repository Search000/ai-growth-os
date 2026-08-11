import { toolRegistry } from "./registry.js";
import { getCurrentTimeTool } from "./get-current-time.js";

export function registerTools(): void {
  toolRegistry.register(getCurrentTimeTool);
}

export { toolRegistry } from "./registry.js";
export type { Tool, ToolDefinition, ToolParam } from "./tool.js";
