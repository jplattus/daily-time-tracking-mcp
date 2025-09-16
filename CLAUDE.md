# Daily Time Tracking MCP Server - Implementation Guide

This guide provides implementation patterns and standards for building MCP (Model Context Protocol) servers for Daily Time Tracking integration with GitHub OAuth authentication using Node.js, TypeScript, and Cloudflare Workers. For WHAT to build, see the PRP (Product Requirement Prompt) documents.

## Core Principles

**IMPORTANT: You MUST follow these principles in all code changes and PRP generations:**

### KISS (Keep It Simple, Stupid)

- Simplicity should be a key goal in design
- Choose straightforward solutions over complex ones whenever possible
- Simple solutions are easier to understand, maintain, and debug

### YAGNI (You Aren't Gonna Need It)

- Avoid building functionality on speculation
- Implement features only when they are needed, not when you anticipate they might be useful in the future

### Open/Closed Principle

- Software entities should be open for extension but closed for modification
- Design systems so that new functionality can be added with minimal changes to existing code

## Package Management & Tooling

**CRITICAL: This project uses npm for Node.js package management and Wrangler CLI for Cloudflare Workers development.**

### Essential npm Commands

```bash
# Install dependencies from package.json
npm install

# Add a dependency
npm install package-name

# Add a development dependency
npm install --save-dev package-name

# Remove a package
npm uninstall package-name

# Update dependencies
npm update

# Run scripts defined in package.json
npm run dev
npm run deploy
npm run type-check
```

### Essential Wrangler CLI Commands

**CRITICAL: Use Wrangler CLI for all Cloudflare Workers development, testing, and deployment.**

```bash
# Authentication
wrangler login          # Login to Cloudflare account
wrangler logout         # Logout from Cloudflare
wrangler whoami         # Check current user

# Development & Testing
wrangler dev           # Start local development server (default port 8787)

# Deployment
wrangler deploy        # Deploy Worker to Cloudflare
wrangler deploy --dry-run  # Test deployment without actually deploying

# Configuration & Types
wrangler types         # Generate TypeScript types from Worker configuration
```

## Project Architecture

**IMPORTANT: This is a Cloudflare Workers MCP server with GitHub OAuth authentication for secure Daily Time Tracking API access.**

### Current Project Structure

```
/
├── src/                          # TypeScript source code
│   ├── index.ts                  # Main MCP server (standard)
│   ├── index_sentry.ts          # Sentry-enabled MCP server
│   ├── simple-math.ts           # Basic MCP example (no auth)
│   ├── daily-api/               # Daily Time Tracking API integration
│   │   ├── client.ts            # API client and utilities
│   │   └── types.ts             # TypeScript types for Daily API
│   ├── tools/                   # MCP tools implementation
│   │   ├── daily-tools.ts       # Daily Time Tracking tools (standard)
│   │   ├── daily-tools-sentry.ts # Daily Time Tracking tools with Sentry
│   │   └── register-tools.ts    # Tool registration helper
│   └── auth/                    # Authentication implementation
│       └── github-handler.ts    # GitHub OAuth flow
├── PRPs/                        # Product Requirement Prompts
│   ├── README.md
│   └── templates/
│       └── prp_base.md
├── wrangler.jsonc              # Main Cloudflare Workers configuration
├── wrangler-simple.jsonc       # Simple math example configuration
├── package.json                # npm dependencies & scripts
├── tsconfig.json               # TypeScript configuration
├── worker-configuration.d.ts   # Generated Cloudflare types
└── CLAUDE.md                   # This implementation guide
```

### Key File Purposes (ALWAYS ADD NEW FILES HERE)

**Main Implementation Files:**

- `src/index.ts` - Production MCP server with GitHub OAuth + Daily Time Tracking
- `src/index_sentry.ts` - Same as above with Sentry monitoring integration
- `src/simple-math.ts` - Basic MCP server example (calculator without auth)

**Daily Time Tracking Integration:**

- `src/daily-api/client.ts` - Daily Time Tracking API client with error handling
- `src/daily-api/types.ts` - TypeScript types for all Daily API endpoints
- `src/tools/daily-tools.ts` - MCP tools for Daily Time Tracking (standard)
- `src/tools/daily-tools-sentry.ts` - MCP tools with Sentry instrumentation

**Authentication & Security:**

- `src/auth/github-handler.ts` - Complete GitHub OAuth 2.0 flow
- GitHub OAuth provides secure access to Daily Time Tracking data

**Configuration Files:**

- `wrangler.jsonc` - Main Worker config with Durable Objects, KV, AI bindings
- `wrangler-simple.jsonc` - Simple example configuration
- `tsconfig.json` - TypeScript compiler settings for Cloudflare Workers

## Development Commands

### Core Workflow Commands

```bash
# Setup & Dependencies
npm install                  # Install all dependencies
npm install --save-dev @types/package  # Add dev dependency with types

# Development
wrangler dev                # Start local development server
npm run dev                 # Alternative via npm script

# Type Checking & Validation
npm run type-check          # Run TypeScript compiler check
wrangler types              # Generate Cloudflare Worker types
npx tsc --noEmit           # Type check without compiling

# Testing
npx vitest                  # Run unit tests (if configured)

# Code Quality
npx prettier --write .      # Format code
npx eslint src/            # Lint TypeScript code
```

### Environment Configuration

**Environment Variables Setup:**

```bash
# Create .dev.vars file for local development based on .dev.vars.example
cp .dev.vars.example .dev.vars

# Production secrets (via Wrangler)
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY
wrangler secret put DAILY_API_KEY
wrangler secret put SENTRY_DSN
```

## MCP Development Context

**IMPORTANT: This project builds production-ready MCP servers using Node.js/TypeScript on Cloudflare Workers with GitHub OAuth authentication.**

### MCP Technology Stack

**Core Technologies:**

- **@modelcontextprotocol/sdk** - Official MCP TypeScript SDK
- **agents/mcp** - Cloudflare Workers MCP agent framework
- **workers-mcp** - MCP transport layer for Workers
- **@cloudflare/workers-oauth-provider** - OAuth 2.1 server implementation

**Cloudflare Platform:**

- **Cloudflare Workers** - Serverless runtime (V8 isolates)
- **Durable Objects** - Stateful objects for MCP agent persistence
- **KV Storage** - OAuth state and session management

### MCP Server Architecture

This project implements MCP servers as Cloudflare Workers with three main patterns:

**1. Authenticated Daily Time Tracking MCP Server (`src/index.ts`):**

```typescript
export class MyMCP extends McpAgent<Env, Record<string, never>, Props> {
  server = new McpServer({
    name: "Daily Time Tracking MCP Server",
    version: "1.0.0",
  });

  // MCP Tools available based on user permissions
  // - getDailyUser (all users)
  // - getDailyActivities (all users)
  // - getDailySummary (all users)
  // - getDailyTimesheet (all users)
  // - createDailyActivities (privileged users only)
  // - getDailyQuickSummary (all users)
}
```

**2. Monitored MCP Server (`src/index_sentry.ts`):**

- Same functionality as above with Sentry instrumentation
- Distributed tracing for MCP tool calls
- Error tracking with event IDs
- Performance monitoring

**3. Simple MCP Server (`src/simple-math.ts`):**

- Basic calculator example without authentication
- Demonstrates core MCP patterns
- Useful for learning and testing

### MCP Development Commands

**Local Development & Testing:**

```bash
# Start main MCP server (with OAuth)
wrangler dev                    # Available at http://localhost:8788/mcp

# Start simple MCP server (no auth)
wrangler dev --config wrangler-simple.jsonc  # Port 8789
```

### Claude Desktop Integration

**For Local Development:**

```json
{
  "mcpServers": {
    "database-mcp": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8788/mcp"],
      "env": {}
    }
  }
}
```

**For Production Deployment:**

```json
{
  "mcpServers": {
    "database-mcp": {
      "command": "npx",
      "args": ["mcp-remote", "https://your-worker.workers.dev/mcp"],
      "env": {}
    }
  }
}
```

### MCP Key Concepts for This Project

- **Tools**: Daily Time Tracking operations (getUser, getActivities, getSummary, getTimesheet, createActivities)
- **Authentication**: GitHub OAuth with role-based access control
- **Transport**: Dual support for HTTP (`/mcp`) and SSE (`/sse`) protocols
- **State**: Durable Objects maintain authenticated user context
- **Security**: API key management, input validation, error sanitization

## Daily Time Tracking Integration & Security

**CRITICAL: This project provides secure Daily Time Tracking API access through MCP tools with role-based permissions.**

### API Client Architecture

**Daily Time Tracking Client (`src/daily-api/client.ts`):**

```typescript
// Daily Time Tracking API Client with error handling
export class DailyTimeTrackingClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: DailyApiConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.dailytimetracking.com';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'API-Key': this.apiKey,
    };
  }
}
```

### Security Implementation

**API Key Protection:**

```typescript
// Secure API key management
const getDailyClient = () => {
  if (!(env as any).DAILY_API_KEY) {
    throw new Error("DAILY_API_KEY environment variable is required");
  }
  return new DailyTimeTrackingClient({
    apiKey: (env as any).DAILY_API_KEY,
  });
};

// Input validation with Zod schemas
export function isValidISODate(dateString: string): boolean {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso8601Regex.test(dateString)) {
    return false;
  }
  const date = new Date(dateString + 'T00:00:00.000Z');
  return !isNaN(date.getTime());
}
```

**Access Control (`src/tools/daily-tools.ts`):**

```typescript
const ALLOWED_USERNAMES = new Set<string>([
  'coleam00'  // Only these GitHub usernames can create/modify activities
]);

// Tool availability based on user permissions
if (ALLOWED_USERNAMES.has(props.login)) {
  // Register createDailyActivities tool for privileged users
  server.tool("createDailyActivities", ...);
}
```

### MCP Tools Implementation

**Available Daily Time Tracking Tools:**

1. **`getDailyUser`** - User account information (all authenticated users)
2. **`getDailyActivities`** - List of activities (all authenticated users)
3. **`getDailySummary`** - Time summary by date range (all authenticated users)
4. **`getDailyTimesheet`** - Detailed daily timesheet (all authenticated users)
5. **`createDailyActivities`** - Create/modify activities (privileged users only)
6. **`getDailyQuickSummary`** - Quick summaries for common periods (all authenticated users)

**Tool Implementation Pattern:**

```typescript
server.tool(
  "getDailyActivities",
  "Get a list of activities from Daily Time Tracking.",
  GetActivitiesSchema,
  async ({ includeArchivedActivities }) => {
    try {
      const client = getDailyClient();
      const response = await client.getActivities({ includeArchivedActivities });

      if (!response.success) {
        return createErrorResponse(
          `Failed to retrieve activities: ${response.error}`,
          { statusCode: response.statusCode }
        );
      }

      const activities = response.data!;
      const totalActivities = activities.length;
      const archivedCount = activities.filter(a => a.archived).length;

      return createSuccessResponse(
        `Retrieved ${totalActivities} activities`,
        {
          summary: { total: totalActivities, active: totalActivities - archivedCount },
          activities,
        }
      );
    } catch (error) {
      return createErrorResponse(`Error retrieving activities: ${error.message}`);
    }
  },
);
```

## GitHub OAuth Implementation

**CRITICAL: This project implements secure GitHub OAuth 2.0 flow with signed cookie-based approval system.**

### OAuth Flow Architecture

**Authentication Flow (`src/github-handler.ts`):**

```typescript
// 1. Authorization Request
app.get("/authorize", async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);

  // Check if client already approved via signed cookie
  if (await clientIdAlreadyApproved(c.req.raw, oauthReqInfo.clientId, c.env.COOKIE_ENCRYPTION_KEY)) {
    return redirectToGithub(c.req.raw, oauthReqInfo, c.env, {});
  }

  // Show approval dialog
  return renderApprovalDialog(c.req.raw, { client, server, state });
});

// 2. GitHub Callback
app.get("/callback", async (c) => {
  // Exchange code for access token
  const [accessToken, errResponse] = await fetchUpstreamAuthToken({
    client_id: c.env.GITHUB_CLIENT_ID,
    client_secret: c.env.GITHUB_CLIENT_SECRET,
    code: c.req.query("code"),
    redirect_uri: new URL("/callback", c.req.url).href,
  });

  // Get GitHub user info
  const user = await new Octokit({ auth: accessToken }).rest.users.getAuthenticated();

  // Complete authorization with user props
  return c.env.OAUTH_PROVIDER.completeAuthorization({
    props: { accessToken, email, login, name } as Props,
    userId: login,
  });
});
```

### Cookie Security System

**HMAC-Signed Approval Cookies (`src/workers-oauth-utils.ts`):**

```typescript
// Generate signed cookie for client approval
async function signData(key: CryptoKey, data: string): Promise<string> {
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Verify cookie integrity
async function verifySignature(key: CryptoKey, signatureHex: string, data: string): Promise<boolean> {
  const signatureBytes = new Uint8Array(signatureHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  return await crypto.subtle.verify("HMAC", key, signatureBytes.buffer, enc.encode(data));
}
```

### User Context & Permissions

**Authenticated User Props:**

```typescript
type Props = {
  login: string; // GitHub username
  name: string; // Display name
  email: string; // Email address
  accessToken: string; // GitHub access token
};

// Available in MCP tools via this.props
class MyMCP extends McpAgent<Env, Record<string, never>, Props> {
  async init() {
    // Access user context in any tool
    const username = this.props.login;
    const hasWriteAccess = ALLOWED_USERNAMES.has(username);
  }
}
```

## Monitoring & Observability

**CRITICAL: This project supports optional Sentry integration for production monitoring and includes built-in console logging.**

### Logging Architecture

**Two Deployment Options:**

1. **Standard Version (`src/index.ts`)**: Console logging only
2. **Sentry Version (`src/index_sentry.ts`)**: Full Sentry instrumentation

### Sentry Integration (Optional)

**Enable Sentry Monitoring:**

```typescript
// src/index_sentry.ts - Production-ready with monitoring
import * as Sentry from "@sentry/cloudflare";

// Sentry configuration
function getSentryConfig(env: Env) {
  return {
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1,  // 100% trace sampling
  };
}

// Instrument MCP tools with tracing
private registerTool(name: string, description: string, schema: any, handler: any) {
  this.server.tool(name, description, schema, async (args: any) => {
    return await Sentry.startNewTrace(async () => {
      return await Sentry.startSpan({
        name: `mcp.tool/${name}`,
        attributes: extractMcpParameters(args),
      }, async (span) => {
        // Set user context
        Sentry.setUser({
          username: this.props.login,
          email: this.props.email,
        });

        try {
          return await handler(args);
        } catch (error) {
          span.setStatus({ code: 2 }); // error
          return handleError(error);  // Returns user-friendly error with event ID
        }
      });
    });
  });
}
```

**Sentry Features Enabled:**

- **Error Tracking**: Automatic exception capture with context
- **Performance Monitoring**: Full request tracing with 100% sample rate
- **User Context**: GitHub user information bound to events
- **Tool Tracing**: Each MCP tool call traced with parameters
- **Distributed Tracing**: Request flow across Cloudflare Workers

### Production Logging Patterns

**Console Logging (Standard):**

```typescript
// Database operations
console.log(`Database operation completed successfully in ${duration}ms`);
console.error(`Database operation failed after ${duration}ms:`, error);

// Authentication events
console.log(`User authenticated: ${this.props.login} (${this.props.name})`);

// Tool execution
console.log(`Tool called: ${toolName} by ${this.props.login}`);
console.error(`Tool failed: ${toolName}`, error);
```

**Structured Error Handling:**

```typescript
// Error sanitization for security
export function formatDatabaseError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("password")) {
      return "Database authentication failed. Please check credentials.";
    }
    if (error.message.includes("timeout")) {
      return "Database connection timed out. Please try again.";
    }
    return `Database error: ${error.message}`;
  }
  return "Unknown database error occurred.";
}
```

### Monitoring Configuration

**Development Monitoring:**

```bash
# Enable Sentry in development
echo 'SENTRY_DSN=https://your-dsn@sentry.io/project' >> .dev.vars
echo 'NODE_ENV=development' >> .dev.vars

# Use Sentry-enabled version
wrangler dev --config wrangler.jsonc  # Ensure main = "src/index_sentry.ts"
```

**Production Monitoring:**

```bash
# Set production secrets
wrangler secret put SENTRY_DSN
wrangler secret put NODE_ENV  # Set to "production"

# Deploy with monitoring
wrangler deploy
```

## TypeScript Development Standards

**CRITICAL: All MCP tools MUST follow TypeScript best practices with Zod validation and proper error handling.**

### Standard Response Format

**ALL tools MUST return MCP-compatible response objects:**

```typescript
import { z } from "zod";

// Tool with proper TypeScript patterns
this.server.tool(
  "standardizedTool",
  "Tool following standard response format",
  {
    name: z.string().min(1, "Name cannot be empty"),
    options: z.object({}).optional(),
  },
  async ({ name, options }) => {
    try {
      // Input already validated by Zod schema
      const result = await processName(name, options);

      // Return standardized success response
      return {
        content: [
          {
            type: "text",
            text: `**Success**\n\nProcessed: ${name}\n\n**Result:**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n**Processing time:** 0.5s`,
          },
        ],
      };
    } catch (error) {
      // Return standardized error response
      return {
        content: [
          {
            type: "text",
            text: `**Error**\n\nProcessing failed: ${error instanceof Error ? error.message : String(error)}`,
            isError: true,
          },
        ],
      };
    }
  },
);
```

### Input Validation with Zod

**ALL tool inputs MUST be validated using Zod schemas:**

```typescript
import { z } from "zod";

// Define validation schemas
const DatabaseQuerySchema = z.object({
  sql: z
    .string()
    .min(1, "SQL query cannot be empty")
    .refine((sql) => sql.trim().toLowerCase().startsWith("select"), {
      message: "Only SELECT queries are allowed",
    }),
  limit: z.number().int().positive().max(1000).optional(),
});

// Use in tool definition
this.server.tool(
  "queryDatabase",
  "Execute a read-only SQL query",
  DatabaseQuerySchema, // Zod schema provides automatic validation
  async ({ sql, limit }) => {
    // sql and limit are already validated and properly typed
    const results = await db.unsafe(sql);
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  },
);
```

### Error Handling Patterns

**Standardized error responses:**

```typescript
// Error handling utility
function createErrorResponse(message: string, details?: any): any {
  return {
    content: [{
      type: "text",
      text: `**Error**\n\n${message}${details ? `\n\n**Details:**\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\`` : ''}`,
      isError: true
    }]
  };
}

// Permission error
if (!ALLOWED_USERNAMES.has(this.props.login)) {
  return createErrorResponse(
    "Insufficient permissions for this operation",
    { requiredRole: "privileged", userRole: "standard" }
  );
}

// Validation error
if (isWriteOperation(sql)) {
  return createErrorResponse(
    "Write operations not allowed with this tool",
    { operation: "write", allowedOperations: ["select", "show", "describe"] }
  );
}

// Database error
catch (error) {
  return createErrorResponse(
    "Database operation failed",
    { error: formatDatabaseError(error) }
  );
}
```

### Type Safety Rules

**MANDATORY TypeScript patterns:**

1. **Strict Types**: All parameters and return types explicitly typed
2. **Zod Validation**: All inputs validated with Zod schemas
3. **Error Handling**: All async operations wrapped in try/catch
4. **User Context**: Props typed with GitHub user information
5. **Environment**: Cloudflare Workers types generated with `wrangler types`

## Code Style Preferences

### TypeScript Style

- Use explicit type annotations for all function parameters and return types
- Use JSDoc comments for all exported functions and classes
- Prefer async/await for all asynchronous operations
- **MANDATORY**: Use Zod schemas for all input validation
- **MANDATORY**: Use proper error handling with try/catch blocks
- Keep functions small and focused (single responsibility principle)

### File Organization

- Each MCP server should be self-contained in a single TypeScript file
- Import statements organized: Node.js built-ins, third-party packages, local imports
- Use relative imports within the src/ directory
- **Import Zod for validation and proper types for all modules**

### Testing Conventions

- Use MCP Inspector for integration testing: `npx @modelcontextprotocol/inspector@latest`
- Test with local development server: `wrangler dev`
- Use descriptive tool names and descriptions
- **Test both authentication and permission scenarios**
- **Test input validation with invalid data**

## Important Notes

### What NOT to do

- **NEVER** commit secrets or environment variables to the repository
- **NEVER** build complex solutions when simple ones will work
- **NEVER** skip input validation with Zod schemas

### What TO do

- **ALWAYS** use TypeScript strict mode and proper typing
- **ALWAYS** validate inputs with Zod schemas
- **ALWAYS** follow the core principles (KISS, YAGNI, etc.)
- **ALWAYS** use Wrangler CLI for all development and deployment

## Git Workflow

```bash
# Before committing, always run:
npm run type-check              # Ensure TypeScript compiles
wrangler dev --dry-run          # Test deployment configuration

# Commit with descriptive messages
git add .
git commit -m "feat: add new MCP tool for database queries"
```

## Quick Reference

### Adding a New MCP Tool

1. Add tool to existing MCP server class (`src/index.ts`)
2. Define Zod schema for input validation
3. Implement tool handler with proper error handling
4. Update documentation if needed
