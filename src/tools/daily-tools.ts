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
  // For example: 'yourusername', 'coworkerusername'
  'coleam00'
]);

export function registerDailyTools(server: McpServer, env: Env, props: Props) {
  // Initialize Daily Time Tracking client
  const getDailyClient = () => {
    if (!(env as any).DAILY_API_KEY) {
      throw new Error("DAILY_API_KEY environment variable is required");
    }
    return new DailyTimeTrackingClient({
      apiKey: (env as any).DAILY_API_KEY,
    });
  };

  // Tool 1: Get User Information - Available to all authenticated users
  server.tool(
    "getDailyUser",
    "Get information about the Daily Time Tracking user account including data retention settings and last sync time.",
    GetUserSchema,
    async () => {
      try {
        const client = getDailyClient();
        const response = await client.getUser();

        if (!response.success) {
          return createErrorResponse(
            `Failed to retrieve user information: ${response.error}`,
            { statusCode: response.statusCode }
          );
        }

        const user = response.data!;
        return createSuccessResponse(
          `User information retrieved successfully`,
          {
            dataRetention: `${user.dataRetention} days`,
            lastSynced: user.lastSynced || "Never synchronized",
            syncStatus: user.lastSynced ? "Active" : "No data synced yet",
          }
        );
      } catch (error) {
        console.error('getDailyUser error:', error);
        return createErrorResponse(
          `Error retrieving user information: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  // Tool 2: Get Activities - Available to all authenticated users
  server.tool(
    "getDailyActivities",
    "Get a list of activities from Daily Time Tracking. You can optionally exclude archived activities from the results.",
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
        const activeCount = totalActivities - archivedCount;

        // Group activities by group for better display
        const groupedActivities = activities.reduce((acc, activity) => {
          const groupName = activity.group || 'Ungrouped';
          if (!acc[groupName]) {
            acc[groupName] = [];
          }
          acc[groupName].push(activity);
          return acc;
        }, {} as Record<string, typeof activities>);

        return createSuccessResponse(
          `Retrieved ${totalActivities} activities (${activeCount} active, ${archivedCount} archived)`,
          {
            summary: {
              total: totalActivities,
              active: activeCount,
              archived: archivedCount,
              groups: Object.keys(groupedActivities).length,
            },
            activitiesByGroup: groupedActivities,
          }
        );
      } catch (error) {
        console.error('getDailyActivities error:', error);
        return createErrorResponse(
          `Error retrieving activities: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  // Tool 3: Get Summary - Available to all authenticated users
  server.tool(
    "getDailySummary",
    "Get a summary of time spent on activities within a specified date range. Shows total duration for each activity across all days in the range.",
    GetSummarySchema,
    async ({ start, end, includeArchivedActivities }) => {
      try {
        // Validate dates
        if (!isValidISODate(start)) {
          return createErrorResponse(`Invalid start date format. Use YYYY-MM-DD format. Example: ${getTodayISO()}`);
        }
        if (!isValidISODate(end)) {
          return createErrorResponse(`Invalid end date format. Use YYYY-MM-DD format. Example: ${getTodayISO()}`);
        }

        const client = getDailyClient();
        const response = await client.getSummary({ start, end, includeArchivedActivities });

        if (!response.success) {
          return createErrorResponse(
            `Failed to retrieve summary: ${response.error}`,
            { statusCode: response.statusCode }
          );
        }

        const summary = response.data!;
        const totalDuration = summary.reduce((sum, item) => sum + item.duration, 0);

        // Sort by duration descending
        const sortedSummary = summary.sort((a, b) => b.duration - a.duration);

        // Format with human-readable durations
        const formattedSummary = sortedSummary.map(item => ({
          activity: item.activity,
          group: item.group || 'Ungrouped',
          duration: formatDuration(item.duration),
          durationSeconds: item.duration,
          percentage: totalDuration > 0 ? ((item.duration / totalDuration) * 100).toFixed(1) + '%' : '0%',
        }));

        return createSuccessResponse(
          `Time summary from ${start} to ${end} (${formattedSummary.length} activities)`,
          {
            period: { start, end },
            totalTime: formatDuration(totalDuration),
            totalSeconds: totalDuration,
            activities: formattedSummary,
          }
        );
      } catch (error) {
        console.error('getDailySummary error:', error);
        return createErrorResponse(
          `Error retrieving summary: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  // Tool 4: Get Timesheet - Available to all authenticated users
  server.tool(
    "getDailyTimesheet",
    "Get a detailed timesheet showing activities recorded for each day within a specified date range. Shows daily breakdown with activities and durations.",
    GetTimesheetSchema,
    async ({ start, end, includeArchivedActivities }) => {
      try {
        // Validate dates
        if (!isValidISODate(start)) {
          return createErrorResponse(`Invalid start date format. Use YYYY-MM-DD format. Example: ${getTodayISO()}`);
        }
        if (!isValidISODate(end)) {
          return createErrorResponse(`Invalid end date format. Use YYYY-MM-DD format. Example: ${getTodayISO()}`);
        }

        const client = getDailyClient();
        const response = await client.getTimesheet({ start, end, includeArchivedActivities });

        if (!response.success) {
          return createErrorResponse(
            `Failed to retrieve timesheet: ${response.error}`,
            { statusCode: response.statusCode }
          );
        }

        const timesheet = response.data!;
        let totalDays = timesheet.length;
        let daysWithActivity = timesheet.filter(day => day.activities.length > 0).length;
        let totalTimeAllDays = 0;

        // Format timesheet with human-readable durations
        const formattedTimesheet = timesheet.map(day => {
          const dayTotal = day.activities.reduce((sum, activity) => sum + activity.duration, 0);
          totalTimeAllDays += dayTotal;

          const formattedActivities = day.activities.map(activity => ({
            activity: activity.activity,
            group: activity.group || 'Ungrouped',
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

        return createSuccessResponse(
          `Timesheet from ${start} to ${end} (${totalDays} days, ${daysWithActivity} with activity)`,
          {
            period: { start, end },
            summary: {
              totalDays,
              daysWithActivity,
              daysWithoutActivity: totalDays - daysWithActivity,
              totalTime: formatDuration(totalTimeAllDays),
              totalSeconds: totalTimeAllDays,
              averagePerDay: totalDays > 0 ? formatDuration(Math.round(totalTimeAllDays / totalDays)) : '0s',
            },
            timesheet: formattedTimesheet,
          }
        );
      } catch (error) {
        console.error('getDailyTimesheet error:', error);
        return createErrorResponse(
          `Error retrieving timesheet: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  // Tool 5: Create Activities - Only available to privileged users
  if (ALLOWED_USERNAMES.has(props.login)) {
    server.tool(
      "createDailyActivities",
      "Create new activities in Daily Time Tracking. You can optionally archive all existing activities while creating new ones. **USE WITH CAUTION** - this can modify your activity list.",
      CreateActivitiesSchema,
      async ({ activities, archiveExistingActivities }) => {
        try {
          const client = getDailyClient();
          const response = await client.createActivities(activities, { archiveExistingActivities });

          if (!response.success) {
            return createErrorResponse(
              `Failed to create activities: ${response.error}`,
              { statusCode: response.statusCode }
            );
          }

          const result = response.data!;

          return createSuccessResponse(
            `Successfully processed ${activities.length} activities${archiveExistingActivities ? ' (existing activities were archived)' : ''}`,
            {
              requestedActivities: activities.length,
              processedActivities: result.length,
              archivedExisting: archiveExistingActivities || false,
              activities: result,
              executedBy: `${props.login} (${props.name})`,
            }
          );
        } catch (error) {
          console.error('createDailyActivities error:', error);
          return createErrorResponse(
            `Error creating activities: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    );
  }

  // Helper tool for quick date ranges
  server.tool(
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
      try {
        let start: string, end: string;
        const today = new Date();

        switch (period) {
          case 'today':
            start = end = getTodayISO();
            break;
          case 'yesterday':
            start = end = getDaysAgoISO(1);
            break;
          case 'this_week':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            start = startOfWeek.toISOString().split('T')[0];
            end = getTodayISO();
            break;
          case 'last_week':
            const lastWeekEnd = new Date(today);
            lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
            const lastWeekStart = new Date(lastWeekEnd);
            lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
            start = lastWeekStart.toISOString().split('T')[0];
            end = lastWeekEnd.toISOString().split('T')[0];
            break;
          case 'this_month':
            start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            end = getTodayISO();
            break;
          case 'last_7_days':
            start = getDaysAgoISO(7);
            end = getTodayISO();
            break;
          case 'last_30_days':
            start = getDaysAgoISO(30);
            end = getTodayISO();
            break;
          default:
            return createErrorResponse(`Invalid period: ${period}`);
        }

        const client = getDailyClient();
        const response = await client.getSummary({ start, end, includeArchivedActivities });

        if (!response.success) {
          return createErrorResponse(
            `Failed to retrieve quick summary: ${response.error}`,
            { statusCode: response.statusCode }
          );
        }

        const summary = response.data!;
        const totalDuration = summary.reduce((sum, item) => sum + item.duration, 0);
        const sortedSummary = summary.sort((a, b) => b.duration - a.duration);

        const formattedSummary = sortedSummary.map(item => ({
          activity: item.activity,
          group: item.group || 'Ungrouped',
          duration: formatDuration(item.duration),
          percentage: totalDuration > 0 ? ((item.duration / totalDuration) * 100).toFixed(1) + '%' : '0%',
        }));

        return createSuccessResponse(
          `Quick summary for ${period.replace('_', ' ')} (${start} to ${end})`,
          {
            period: period.replace('_', ' '),
            dateRange: { start, end },
            totalTime: formatDuration(totalDuration),
            activitiesCount: formattedSummary.length,
            topActivities: formattedSummary.slice(0, 5), // Show top 5
            allActivities: formattedSummary,
          }
        );
      } catch (error) {
        console.error('getDailyQuickSummary error:', error);
        return createErrorResponse(
          `Error retrieving quick summary: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );
}