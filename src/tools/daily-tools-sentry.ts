import * as Sentry from "@sentry/cloudflare";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  Props,
  GetUserSchema,
  GetActivitiesSchema,
  GetSummarySchema,
  GetTimesheetSchema,
  CreateActivitiesSchema,
  createErrorResponse,
  createSuccessResponse,
} from "../types";
import { DailyTimeTrackingClient, formatDuration, isValidISODate, getTodayISO, getDaysAgoISO } from "../daily-api/client";

const ALLOWED_USERNAMES = new Set<string>([
  // Add GitHub usernames of users who should have access to create/modify activities
  "jplattus",
]);

/**
 * Extract MCP parameters for Sentry tracing
 */
function extractMcpParameters(args: any): Record<string, any> {
  const attributes: Record<string, any> = {};
  Object.entries(args).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      attributes[`mcp.param.${key}`] = value;
    }
  });
  return attributes;
}

/**
 * Handle errors with Sentry integration
 */
function handleError(error: unknown, toolName: string): any {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Capture exception in Sentry
  const eventId = Sentry.captureException(error, {
    tags: {
      tool: toolName,
      component: "daily-time-tracking",
    },
  });

  console.error(`${toolName} error:`, error);

  return createErrorResponse(`Error in ${toolName}: ${errorMessage}`, { sentryEventId: eventId });
}

export function registerDailyToolsWithSentry(server: McpServer, env: Env, props: Props) {
  // Initialize Daily Time Tracking client
  const getDailyClient = () => {
    if (!(env as any).DAILY_API_KEY) {
      throw new Error("DAILY_API_KEY environment variable is required");
    }
    return new DailyTimeTrackingClient({
      apiKey: (env as any).DAILY_API_KEY,
    });
  };

  // Helper function to register tools with Sentry instrumentation
  function registerToolWithSentry(name: string, description: string, schema: any, handler: (args: any) => Promise<any>) {
    server.tool(name, description, schema, async (args: any) => {
      return await Sentry.startNewTrace(async () => {
        return await Sentry.startSpan(
          {
            name: `mcp.tool/${name}`,
            attributes: extractMcpParameters(args),
          },
          async (span) => {
            // Set user context
            Sentry.setUser({
              username: props.login,
              email: props.email,
            });

            try {
              const result = await handler(args);
              span.setStatus({ code: 1 }); // OK
              return result;
            } catch (error) {
              span.setStatus({ code: 2 }); // ERROR
              return handleError(error, name);
            }
          },
        );
      });
    });
  }

  // Tool 1: Get User Information
  registerToolWithSentry(
    "getDailyUser",
    "Get information about the Daily Time Tracking user account including data retention settings and last sync time.",
    GetUserSchema,
    async () => {
      const client = getDailyClient();
      const response = await client.getUser();

      if (!response.success) {
        throw new Error(`Failed to retrieve user information: ${response.error}`);
      }

      const user = response.data!;
      return createSuccessResponse(`User information retrieved successfully`, {
        dataRetention: `${user.dataRetention} days`,
        lastSynced: user.lastSynced || "Never synchronized",
        syncStatus: user.lastSynced ? "Active" : "No data synced yet",
      });
    },
  );

  // Tool 2: Get Activities
  registerToolWithSentry(
    "getDailyActivities",
    "Get a list of activities from Daily Time Tracking. You can optionally exclude archived activities from the results.",
    GetActivitiesSchema,
    async ({ includeArchivedActivities }) => {
      const client = getDailyClient();
      const response = await client.getActivities({ includeArchivedActivities });

      if (!response.success) {
        throw new Error(`Failed to retrieve activities: ${response.error}`);
      }

      const activities = response.data!;
      const totalActivities = activities.length;
      const archivedCount = activities.filter((a) => a.archived).length;
      const activeCount = totalActivities - archivedCount;

      // Group activities by group for better display
      const groupedActivities = activities.reduce(
        (acc, activity) => {
          const groupName = activity.group || "Ungrouped";
          if (!acc[groupName]) {
            acc[groupName] = [];
          }
          acc[groupName].push(activity);
          return acc;
        },
        {} as Record<string, typeof activities>,
      );

      return createSuccessResponse(`Retrieved ${totalActivities} activities (${activeCount} active, ${archivedCount} archived)`, {
        summary: {
          total: totalActivities,
          active: activeCount,
          archived: archivedCount,
          groups: Object.keys(groupedActivities).length,
        },
        activitiesByGroup: groupedActivities,
      });
    },
  );

  // Tool 3: Get Summary
  registerToolWithSentry(
    "getDailySummary",
    "Get a summary of time spent on activities within a specified date range. Shows total duration for each activity across all days in the range.",
    GetSummarySchema,
    async ({ start, end, includeArchivedActivities }) => {
      // Validate dates
      if (!isValidISODate(start)) {
        throw new Error(`Invalid start date format. Use YYYY-MM-DD format. Example: ${getTodayISO()}`);
      }
      if (!isValidISODate(end)) {
        throw new Error(`Invalid end date format. Use YYYY-MM-DD format. Example: ${getTodayISO()}`);
      }

      const client = getDailyClient();
      const response = await client.getSummary({ start, end, includeArchivedActivities });

      if (!response.success) {
        throw new Error(`Failed to retrieve summary: ${response.error}`);
      }

      const summary = response.data!;
      const totalDuration = summary.reduce((sum, item) => sum + item.duration, 0);
      const sortedSummary = summary.sort((a, b) => b.duration - a.duration);

      const formattedSummary = sortedSummary.map((item) => ({
        activity: item.activity,
        group: item.group || "Ungrouped",
        duration: formatDuration(item.duration),
        durationSeconds: item.duration,
        percentage: totalDuration > 0 ? ((item.duration / totalDuration) * 100).toFixed(1) + "%" : "0%",
      }));

      return createSuccessResponse(`Time summary from ${start} to ${end} (${formattedSummary.length} activities)`, {
        period: { start, end },
        totalTime: formatDuration(totalDuration),
        totalSeconds: totalDuration,
        activities: formattedSummary,
      });
    },
  );

  // Tool 4: Get Timesheet
  registerToolWithSentry(
    "getDailyTimesheet",
    "Get a detailed timesheet showing activities recorded for each day within a specified date range. Shows daily breakdown with activities and durations.",
    GetTimesheetSchema,
    async ({ start, end, includeArchivedActivities }) => {
      // Validate dates
      if (!isValidISODate(start)) {
        throw new Error(`Invalid start date format. Use YYYY-MM-DD format. Example: ${getTodayISO()}`);
      }
      if (!isValidISODate(end)) {
        throw new Error(`Invalid end date format. Use YYYY-MM-DD format. Example: ${getTodayISO()}`);
      }

      const client = getDailyClient();
      const response = await client.getTimesheet({ start, end, includeArchivedActivities });

      if (!response.success) {
        throw new Error(`Failed to retrieve timesheet: ${response.error}`);
      }

      const timesheet = response.data!;
      let totalDays = timesheet.length;
      let daysWithActivity = timesheet.filter((day) => day.activities.length > 0).length;
      let totalTimeAllDays = 0;

      const formattedTimesheet = timesheet.map((day) => {
        const dayTotal = day.activities.reduce((sum, activity) => sum + activity.duration, 0);
        totalTimeAllDays += dayTotal;

        const formattedActivities = day.activities.map((activity) => ({
          activity: activity.activity,
          group: activity.group || "Ungrouped",
          duration: formatDuration(activity.duration),
          durationSeconds: activity.duration,
        }));

        return {
          date: day.date,
          dayTotal: formatDuration(dayTotal),
          dayTotalSeconds: dayTotal,
          activitiesCount: day.activities.length,
          activities: formattedActivities,
        };
      });

      return createSuccessResponse(`Timesheet from ${start} to ${end} (${totalDays} days, ${daysWithActivity} with activity)`, {
        period: { start, end },
        summary: {
          totalDays,
          daysWithActivity,
          daysWithoutActivity: totalDays - daysWithActivity,
          totalTime: formatDuration(totalTimeAllDays),
          totalSeconds: totalTimeAllDays,
          averagePerDay: totalDays > 0 ? formatDuration(Math.round(totalTimeAllDays / totalDays)) : "0s",
        },
        timesheet: formattedTimesheet,
      });
    },
  );

  // Tool 5: Create Activities (privileged users only)
  if (ALLOWED_USERNAMES.has(props.login)) {
    registerToolWithSentry(
      "createDailyActivities",
      "Create new activities in Daily Time Tracking. You can optionally archive all existing activities while creating new ones. **USE WITH CAUTION** - this can modify your activity list.",
      CreateActivitiesSchema,
      async ({ activities, archiveExistingActivities }) => {
        const client = getDailyClient();
        const response = await client.createActivities(activities, { archiveExistingActivities });

        if (!response.success) {
          throw new Error(`Failed to create activities: ${response.error}`);
        }

        const result = response.data!;

        return createSuccessResponse(
          `Successfully processed ${activities.length} activities${archiveExistingActivities ? " (existing activities were archived)" : ""}`,
          {
            requestedActivities: activities.length,
            processedActivities: result.length,
            archivedExisting: archiveExistingActivities || false,
            activities: result,
            executedBy: `${props.login} (${props.name})`,
          },
        );
      },
    );
  }

  // Tool 6: Quick Summary Helper
  registerToolWithSentry(
    "getDailyQuickSummary",
    "Get a quick summary for common time periods (today, yesterday, this week, last week, this month). This is a convenience tool that automatically calculates date ranges.",
    {
      period: {
        type: "string",
        enum: ["today", "yesterday", "this_week", "last_week", "this_month", "last_7_days", "last_30_days"],
        description: "The time period to get summary for",
      },
      includeArchivedActivities: {
        type: "boolean",
        optional: true,
        description: "Whether to include archived activities",
      },
    },
    async ({ period, includeArchivedActivities }) => {
      let start: string, end: string;
      const today = new Date();

      switch (period) {
        case "today":
          start = end = getTodayISO();
          break;
        case "yesterday":
          start = end = getDaysAgoISO(1);
          break;
        case "this_week":
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          start = startOfWeek.toISOString().split("T")[0];
          end = getTodayISO();
          break;
        case "last_week":
          const lastWeekEnd = new Date(today);
          lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
          const lastWeekStart = new Date(lastWeekEnd);
          lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
          start = lastWeekStart.toISOString().split("T")[0];
          end = lastWeekEnd.toISOString().split("T")[0];
          break;
        case "this_month":
          start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
          end = getTodayISO();
          break;
        case "last_7_days":
          start = getDaysAgoISO(7);
          end = getTodayISO();
          break;
        case "last_30_days":
          start = getDaysAgoISO(30);
          end = getTodayISO();
          break;
        default:
          throw new Error(`Invalid period: ${period}`);
      }

      const client = getDailyClient();
      const response = await client.getSummary({ start, end, includeArchivedActivities });

      if (!response.success) {
        throw new Error(`Failed to retrieve quick summary: ${response.error}`);
      }

      const summary = response.data!;
      const totalDuration = summary.reduce((sum, item) => sum + item.duration, 0);
      const sortedSummary = summary.sort((a, b) => b.duration - a.duration);

      const formattedSummary = sortedSummary.map((item) => ({
        activity: item.activity,
        group: item.group || "Ungrouped",
        duration: formatDuration(item.duration),
        percentage: totalDuration > 0 ? ((item.duration / totalDuration) * 100).toFixed(1) + "%" : "0%",
      }));

      return createSuccessResponse(`Quick summary for ${period.replace("_", " ")} (${start} to ${end})`, {
        period: period.replace("_", " "),
        dateRange: { start, end },
        totalTime: formatDuration(totalDuration),
        activitiesCount: formattedSummary.length,
        topActivities: formattedSummary.slice(0, 5),
        allActivities: formattedSummary,
      });
    },
  );
}
