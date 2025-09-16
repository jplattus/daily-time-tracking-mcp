import { z } from "zod";
import type { AuthRequest, OAuthHelpers, ClientInfo } from "@cloudflare/workers-oauth-provider";

// User context passed through OAuth
export type Props = {
  login: string;
  name: string;
  email: string;
  accessToken: string;
};

// Extended environment with OAuth provider
export type ExtendedEnv = Env & { OAUTH_PROVIDER: OAuthHelpers };

// OAuth URL construction parameters
export interface UpstreamAuthorizeParams {
  upstream_url: string;
  client_id: string;
  scope: string;
  redirect_uri: string;
  state?: string;
}

// OAuth token exchange parameters
export interface UpstreamTokenParams {
  code: string | undefined;
  upstream_url: string;
  client_secret: string;
  redirect_uri: string;
  client_id: string;
}

// Approval dialog configuration
export interface ApprovalDialogOptions {
  client: ClientInfo | null;
  server: {
    name: string;
    logo?: string;
    description?: string;
  };
  state: Record<string, any>;
  cookieName?: string;
  cookieSecret?: string | Uint8Array;
  cookieDomain?: string;
  cookiePath?: string;
  cookieMaxAge?: number;
}

// Result of parsing approval form
export interface ParsedApprovalResult {
  state: any;
  headers: Record<string, string>;
}

// MCP tool schemas using Zod for Daily Time Tracking
export const GetUserSchema = {};

export const GetActivitiesSchema = {
  includeArchivedActivities: z
    .boolean()
    .optional()
    .describe("When set to false, archived activities are excluded from the response. Defaults to true."),
};

export const GetSummarySchema = {
  start: z
    .string()
    .min(1, "Start date is required")
    .describe("The start date formatted according to ISO 8601 (YYYY-MM-DD)"),
  end: z
    .string()
    .min(1, "End date is required")
    .describe("The end date formatted according to ISO 8601 (YYYY-MM-DD)"),
  includeArchivedActivities: z
    .boolean()
    .optional()
    .describe("When set to false, archived activities are excluded from the response. Defaults to true."),
};

export const GetTimesheetSchema = {
  start: z
    .string()
    .min(1, "Start date is required")
    .describe("The start date formatted according to ISO 8601 (YYYY-MM-DD)"),
  end: z
    .string()
    .min(1, "End date is required")
    .describe("The end date formatted according to ISO 8601 (YYYY-MM-DD)"),
  includeArchivedActivities: z
    .boolean()
    .optional()
    .describe("When set to false, archived activities are excluded from the response. Defaults to true."),
};

export const CreateActivitiesSchema = {
  activities: z
    .array(
      z.object({
        name: z.string().min(1, "Activity name is required"),
        group: z.string().nullable().optional().describe("Group name for the activity. If omitted or null, the activity is ungrouped."),
      })
    )
    .min(1, "At least one activity is required")
    .describe("Array of activities to create"),
  archiveExistingActivities: z
    .boolean()
    .optional()
    .describe("If true, all existing activities will be archived, unless they are part of the request. Defaults to false."),
};

// MCP response types
export interface McpTextContent {
  [x: string]: unknown;
  type: "text";
  text: string;
  isError?: boolean;
  _meta?: { [x: string]: unknown };
}

export interface McpResponse {
  [x: string]: unknown;
  content: McpTextContent[];
  _meta?: { [x: string]: unknown };
}

// Standard response creators
export function createSuccessResponse(message: string, data?: any): McpResponse {
  let text = `**Success**\n\n${message}`;
  if (data !== undefined) {
    text += `\n\n**Result:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
  }
  return {
    content: [{
      type: "text",
      text,
    }],
  };
}

export function createErrorResponse(message: string, details?: any): McpResponse {
  let text = `**Error**\n\n${message}`;
  if (details !== undefined) {
    text += `\n\n**Details:**\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\``;
  }
  return {
    content: [{
      type: "text",
      text,
      isError: true,
    }],
  };
}

// Daily Time Tracking operation result type
export interface DailyApiOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// Re-export external types that are used throughout
export type { AuthRequest, OAuthHelpers, ClientInfo };