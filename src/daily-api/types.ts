// Daily Time Tracking API Types
// Based on API documentation: https://api.dailytimetracking.com

/**
 * User information from Daily Time Tracking
 */
export interface DailyUser {
  dataRetention: number;
  lastSynced: string | null;
}

/**
 * Activity object from Daily Time Tracking
 */
export interface DailyActivity {
  id?: number; // Optional, used by Zapier for determining new activities
  name: string;
  group: string | null;
  lastUsed: string | null;
  archived: boolean;
}

/**
 * Summary activity with duration
 */
export interface DailySummaryActivity {
  activity: string;
  group: string | null;
  duration: number; // Duration in seconds
}

/**
 * Timesheet activity with duration
 */
export interface DailyTimesheetActivity {
  activity: string;
  group: string | null;
  duration: number; // Duration in seconds
}

/**
 * Daily timesheet day object
 */
export interface DailyTimesheetDay {
  date: string; // ISO 8601 date format
  activities: DailyTimesheetActivity[];
}

/**
 * Request body for creating activities
 */
export interface CreateActivityRequest {
  name: string;
  group?: string | null;
}

/**
 * API response wrapper for standardized error handling
 */
export interface DailyApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Query parameters for activities endpoint
 */
export interface ActivitiesQueryParams {
  includeArchivedActivities?: boolean;
}

/**
 * Query parameters for summary endpoint
 */
export interface SummaryQueryParams {
  start: string; // ISO 8601 date
  end: string; // ISO 8601 date
  includeArchivedActivities?: boolean;
}

/**
 * Query parameters for timesheet endpoint
 */
export interface TimesheetQueryParams {
  start: string; // ISO 8601 date
  end: string; // ISO 8601 date
  includeArchivedActivities?: boolean;
}

/**
 * Query parameters for creating activities
 */
export interface CreateActivitiesQueryParams {
  archiveExistingActivities?: boolean;
}

/**
 * Daily Time Tracking API configuration
 */
export interface DailyApiConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Error types that can be returned by the API
 */
export enum DailyApiErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Standardized API error
 */
export interface DailyApiError {
  type: DailyApiErrorType;
  message: string;
  statusCode?: number;
  details?: any;
}