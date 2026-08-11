import type { Tool } from "./tool.js";
import { logger } from "../logger.js";

class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
    logger.info({ tool: tool.name, permission: tool.permission }, "Tool registered");
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    logger.info({ tool: name, args }, "Executing tool");
    const result = await tool.execute(args);
    logger.info({ tool: name }, "Tool execution complete");
    return result;
  }
}

export const toolRegistry = new ToolRegistry();
