# Daily Time Tracking MCP Server

A Model Context Protocol (MCP) server that integrates with [Daily Time Tracking](https://dailytimetracking.com) to provide seamless time tracking functionality within Claude Desktop.

## Features

🕒 **Complete Time Tracking Integration**
- Get user account information and sync status
- Retrieve and manage activities with group support
- Generate time summaries by date range
- Access detailed daily timesheets
- Create new activities (with proper permissions)
- Quick summaries for common time periods

🔐 **Secure Authentication**
- GitHub OAuth 2.0 integration
- Role-based access control
- Secure API key management

☁️ **Cloudflare Workers Powered**
- Serverless deployment
- Global edge distribution
- Durable Objects for state management
- Optional Sentry monitoring

## Quick Start

### Prerequisites

1. **Daily Time Tracking App**
   - Install from [dailytimetracking.com](https://dailytimetracking.com)
   - Enable Web API in Preferences → Integrations
   - Copy your API key

2. **GitHub OAuth App**
   - Create at [github.com/settings/developers](https://github.com/settings/developers)
   - Set callback URL to your deployed URL + `/callback`

### Local Development

1. **Clone and Install**
   ```bash
   git clone <this-repo>
   cd daily-time-tracking-mcp
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with your actual keys
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   # Server runs on http://localhost:8792
   ```

4. **Configure Claude Desktop**

   Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "daily-time-tracking": {
         "command": "npx",
         "args": ["mcp-remote", "http://localhost:8792/mcp"],
         "env": {}
       }
     }
   }
   ```

   Restart Claude Desktop and start tracking time!

### Production Deployment

1. **Deploy to Cloudflare Workers**
   ```bash
   wrangler deploy
   ```

2. **Set Production Secrets**
   ```bash
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   wrangler secret put COOKIE_ENCRYPTION_KEY
   wrangler secret put DAILY_API_KEY
   ```

3. **Update Claude Desktop Config**
   ```json
   {
     "mcpServers": {
       "daily-time-tracking": {
         "command": "npx",
         "args": ["mcp-remote", "https://your-worker.workers.dev/mcp"],
         "env": {}
       }
     }
   }
   ```

## Available MCP Tools

### For All Users
- `getDailyUser` - Account information and sync status
- `getDailyActivities` - List activities with filtering options
- `getDailySummary` - Time summary by date range
- `getDailyTimesheet` - Detailed daily breakdown
- `getDailyQuickSummary` - Common time periods (today, week, month)

### For Privileged Users
- `createDailyActivities` - Create and manage activities

## Usage Examples

Ask Claude things like:
- *"Show me my time tracking activities"*
- *"What did I work on today?"*
- *"Give me a summary for this week"*
- *"Create a new activity called 'Project Planning'"*

## Transport Protocols

This MCP server supports both modern and legacy transport protocols:

- **`/mcp` - Streamable HTTP** (recommended): Uses a single endpoint with bidirectional communication, automatic connection upgrades, and better resilience for network interruptions
- **`/sse` - Server-Sent Events** (legacy): Uses separate endpoints for requests/responses, maintained for backward compatibility

For new implementations, use the `/mcp` endpoint as it provides better performance and reliability.

## Architecture

- **Frontend**: Claude Desktop MCP integration
- **Backend**: Cloudflare Workers with TypeScript
- **Authentication**: GitHub OAuth 2.0
- **Time Tracking**: Daily Time Tracking API
- **Storage**: Durable Objects for user sessions
- **Monitoring**: Optional Sentry integration

## Environment Variables Setup

### Create Environment Variables File

1. **Create your `.dev.vars` file** from the example:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. **Configure all required environment variables** in `.dev.vars`:
   ```
   # GitHub OAuth (for authentication)
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   COOKIE_ENCRYPTION_KEY=your_random_encryption_key

   # Daily Time Tracking API Key
   DAILY_API_KEY=your_daily_api_key

   # Optional: Sentry monitoring
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   NODE_ENV=development
   ```

### Getting GitHub OAuth Credentials

1. **Create a GitHub OAuth App** for local development:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click "New OAuth App"
   - **Application name**: `Daily Time Tracking MCP (Local Development)`
   - **Homepage URL**: `http://localhost:8792`
   - **Authorization callback URL**: `http://localhost:8792/callback`
   - Click "Register application"

2. **Copy your credentials**:
   - Copy the **Client ID** and paste it as `GITHUB_CLIENT_ID` in `.dev.vars`
   - Click "Generate a new client secret", copy it, and paste as `GITHUB_CLIENT_SECRET` in `.dev.vars`

### Generate Encryption Key

Generate a secure random encryption key for cookie encryption:
```bash
openssl rand -hex 32
```
Copy the output and paste it as `COOKIE_ENCRYPTION_KEY` in `.dev.vars`.

## Testing with MCP Inspector

Use the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) to test your server:

1. **Install and run Inspector**:
   ```bash
   npx @modelcontextprotocol/inspector@latest
   ```

2. **Connect to your local server**:
   - **Preferred**: Enter URL: `http://localhost:8792/mcp` (streamable HTTP transport - newer, more robust)
   - **Alternative**: Enter URL: `http://localhost:8792/sse` (SSE transport - legacy support)
   - Click "Connect"
   - Follow the OAuth prompts to authenticate with GitHub
   - Once connected, you'll see the available tools

3. **Test the tools**:
   - Use `getDailyUser` to see your account information
   - Use `getDailyActivities` to list your time tracking activities
   - Use `getDailySummary` to get time summaries for date ranges
   - Use `getDailyTimesheet` for detailed daily breakdowns

## Production Deployment

### Set up a KV namespace
- Create the KV namespace:
```bash
wrangler kv namespace create "OAUTH_KV"
```
- Update the `wrangler.jsonc` file with the KV ID

### Deploy
Deploy the MCP server to make it available on your workers.dev domain

```bash
wrangler deploy
```

### Create environment variables in production
Create a new [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app):
- For the Homepage URL, specify `https://your-worker.workers.dev`
- For the Authorization callback URL, specify `https://your-worker.workers.dev/callback`
- Note your Client ID and generate a Client secret.
- Set all required secrets via Wrangler:
```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY  # use: openssl rand -hex 32
wrangler secret put DAILY_API_KEY
wrangler secret put SENTRY_DSN  # optional
```

### Test

Test the remote server using [Inspector](https://modelcontextprotocol.io/docs/tools/inspector):

```bash
npx @modelcontextprotocol/inspector@latest
```
Enter `https://your-worker.workers.dev/mcp` (preferred) or `https://your-worker.workers.dev/sse` (legacy) and hit connect. Once you go through the authentication flow, you'll see the Tools working.

### Access the remote MCP server from Claude Desktop

Open Claude Desktop and navigate to Settings -> Developer -> Edit Config. This opens the configuration file that controls which MCP servers Claude can access.

Replace the content with the following configuration. Once you restart Claude Desktop, a browser window will open showing your OAuth login page. Complete the authentication flow to grant Claude access to your MCP server. After you grant access, the tools will become available for you to use.

```json
{
  "mcpServers": {
    "daily-time-tracking": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-worker.workers.dev/mcp"
      ]
    }
  }
}
```

Once the Tools (under 🔨) show up in the interface, you can ask Claude to interact with your time tracking data. Example commands:

- **"Show me my time tracking activities"** → Uses `getDailyActivities` tool
- **"What did I work on today?"** → Uses `getDailyQuickSummary` tool
- **"Give me a summary for this week"** → Uses `getDailySummary` tool
- **"Create a new activity called 'Project Planning'"** → Uses `createDailyActivities` tool (if you have write access)

## Access Control Configuration

Activity creation access is controlled by GitHub username in the `ALLOWED_USERNAMES` configuration:

```typescript
// Add GitHub usernames for activity creation access
const ALLOWED_USERNAMES = new Set([
  'yourusername',    // Replace with your GitHub username
  'teammate1',       // Add team members who need write access
  'admin-user'       // Add other trusted users
]);
```

**To update access permissions**:
1. Edit `src/tools/daily-tools.ts` and `src/tools/daily-tools-sentry.ts`
2. Update the `ALLOWED_USERNAMES` set with GitHub usernames
3. Redeploy the worker: `wrangler deploy`

## Sentry Integration (Optional)

This project includes optional Sentry integration for comprehensive error tracking, performance monitoring, and distributed tracing. There are two versions available:

- `src/index.ts` - Standard version without Sentry
- `src/index_sentry.ts` - Version with full Sentry integration

### Setting Up Sentry

1. **Create a Sentry Account**: Sign up at [sentry.io](https://sentry.io) if you don't have an account.
2. **Create a New Project**: Create a new project in Sentry and select "Cloudflare Workers" as the platform.
3. **Get Your DSN**: Copy the DSN from your Sentry project settings.

To deploy with Sentry monitoring, update your `wrangler.jsonc` to use the Sentry-enabled version:
```json
{
  "main": "src/index_sentry.ts"
}
```

## Development

### Project Structure
```
src/
├── index.ts                    # Main MCP server
├── index_sentry.ts            # Sentry-enabled version
├── daily-api/                 # Daily Time Tracking API client
│   ├── client.ts              # API client implementation
│   └── types.ts               # TypeScript types
├── tools/                     # MCP tool implementations
│   ├── daily-tools.ts         # Standard tools
│   ├── daily-tools-sentry.ts  # Sentry-instrumented tools
│   └── register-tools.ts      # Tool registration
└── auth/                      # GitHub OAuth handlers
    └── github-handler.ts      # OAuth flow implementation
```

### Commands
```bash
npm run dev          # Start development server
npm run type-check   # TypeScript validation
wrangler deploy      # Deploy to Cloudflare
wrangler types       # Generate Worker types
```

## How does it work?

#### OAuth Provider
The OAuth Provider library serves as a complete OAuth 2.1 server implementation for Cloudflare Workers. It handles the complexities of the OAuth flow, including token issuance, validation, and management. In this project, it plays the dual role of:

- Authenticating MCP clients that connect to your server
- Managing the connection to GitHub's OAuth services
- Securely storing tokens and authentication state in KV storage

#### Durable MCP
Durable MCP extends the base MCP functionality with Cloudflare's Durable Objects, providing:
- Persistent state management for your MCP server
- Secure storage of authentication context between requests
- Access to authenticated user information via `this.props`
- Support for conditional tool availability based on user identity

#### MCP Remote
The MCP Remote library enables your server to expose tools that can be invoked by MCP clients like the Inspector. It:
- Defines the protocol for communication between clients and your server
- Provides a structured way to define tools
- Handles serialization and deserialization of requests and responses
- Maintains the connection between clients and your server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- [Daily Time Tracking Documentation](https://dailytimetracking.com/support)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [MCP Specification](https://modelcontextprotocol.io/)

---

**Built with ❤️ for productivity enthusiasts who want seamless time tracking in Claude Desktop**