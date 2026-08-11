import type { Tool } from "./tool.js";

export const getCurrentTimeTool: Tool = {
  name: "get_current_time",
  description: "Returns the current date and time.",
  params: {},
  permission: "read",
  async execute() {
    return { now: new Date().toISOString() };
  },
};
