import {
  DailyUser,
  DailyActivity,
  DailySummaryActivity,
  DailyTimesheetDay,
  CreateActivityRequest,
  DailyApiResponse,
  DailyApiConfig,
  DailyApiError,
  DailyApiErrorType,
  ActivitiesQueryParams,
  SummaryQueryParams,
  TimesheetQueryParams,
  CreateActivitiesQueryParams,
} from './types';

/**
 * Daily Time Tracking API Client
 * Handles authentication and API requests to Daily Time Tracking service
 */
export class DailyTimeTrackingClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: DailyApiConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.dailytimetracking.com';
  }

  /**
   * Create standard headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'API-Key': this.apiKey,
    };
  }

  /**
   * Make HTTP request with error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<DailyApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      const statusCode = response.status;

      // Handle different response codes as documented
      if (statusCode === 200) {
        const data = await response.json() as T;
        return {
          success: true,
          data,
          statusCode,
        };
      } else if (statusCode === 204) {
        // No content response
        return {
          success: true,
          statusCode,
        };
      } else if (statusCode === 400) {
        return {
          success: false,
          error: 'Bad Request: The request was invalid or missing required data',
          statusCode,
        };
      } else if (statusCode === 401) {
        return {
          success: false,
          error: 'Unauthorized: Invalid or missing API key',
          statusCode,
        };
      } else if (statusCode === 500) {
        return {
          success: false,
          error: 'Internal Server Error: The server encountered an unexpected error',
          statusCode,
        };
      } else {
        return {
          success: false,
          error: `Unexpected response status: ${statusCode}`,
          statusCode,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Build query string from parameters
   */
  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * GET /user - Returns information about the user
   */
  async getUser(): Promise<DailyApiResponse<DailyUser>> {
    return this.makeRequest<DailyUser>('/user');
  }

  /**
   * GET /activities - Returns a list of activities
   */
  async getActivities(params: ActivitiesQueryParams = {}): Promise<DailyApiResponse<DailyActivity[]>> {
    const queryString = this.buildQueryString(params);
    return this.makeRequest<DailyActivity[]>(`/activities${queryString}`);
  }

  /**
   * GET /summary - Returns a summary of time spent on activities within the specified date range
   */
  async getSummary(params: SummaryQueryParams): Promise<DailyApiResponse<DailySummaryActivity[]>> {
    const queryString = this.buildQueryString(params);
    return this.makeRequest<DailySummaryActivity[]>(`/summary${queryString}`);
  }

  /**
   * GET /timesheet - Returns a list of calendar days with activities recorded for each day
   */
  async getTimesheet(params: TimesheetQueryParams): Promise<DailyApiResponse<DailyTimesheetDay[]>> {
    const queryString = this.buildQueryString(params);
    return this.makeRequest<DailyTimesheetDay[]>(`/timesheet${queryString}`);
  }

  /**
   * POST /activities - Adds new activities and optionally archives existing activities
   */
  async createActivities(
    activities: CreateActivityRequest[],
    params: CreateActivitiesQueryParams = {}
  ): Promise<DailyApiResponse<DailyActivity[]>> {
    const queryString = this.buildQueryString(params);
    return this.makeRequest<DailyActivity[]>(`/activities${queryString}`, {
      method: 'POST',
      body: JSON.stringify(activities),
    });
  }
}

/**
 * Utility function to format duration from seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

/**
 * Utility function to validate ISO 8601 date format
 */
export function isValidISODate(dateString: string): boolean {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso8601Regex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString + 'T00:00:00.000Z');
  return !isNaN(date.getTime());
}

/**
 * Utility function to get today's date in ISO 8601 format
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Utility function to get date N days ago in ISO 8601 format
 */
export function getDaysAgoISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}