import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Props } from "../types";
import { registerDailyTools } from "./daily-tools";

/**
 * Register all MCP tools based on user permissions
 */
export function registerAllTools(server: McpServer, env: Env, props: Props) {
	// Register Daily Time Tracking tools
	registerDailyTools(server, env, props);

	// Future tools can be registered here
	// registerOtherTools(server, env, props);
}