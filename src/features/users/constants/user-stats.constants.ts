export const USER_STATS_QUEUE = 'user-stats-queue';

export enum UserStatsJobName {
  SESSION_COMPLETED = 'SESSION_COMPLETED',
}

export interface SessionCompletedJobPayload {
  userId: string;
  earnedMinutes: number;
  sessionId: string;
  incrementSession: boolean;
}
