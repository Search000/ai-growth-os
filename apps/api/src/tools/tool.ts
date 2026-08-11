export interface ToolParam {
  type: "string" | "number" | "boolean";
  description: string;
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  params: Record<string, ToolParam>;
  permission: "read" | "write" | "network" | "system";
}

export interface Tool extends ToolDefinition {
  execute(args: Record<string, unknown>): Promise<unknown>;
}
