export type ScheduledTask = {
	id: string;
	payload: unknown;
	scheduledFor: number;
	createdAt: number;
};

export type ScheduleTaskRequest = {
	taskId: string;
	payload: unknown;
	delayMs: number;
};

export type ScheduleRecurringTaskRequest = {
	taskId: string;
	payload: unknown;
	intervalMs: number;
};

export type RecurringTask = {
	payload: unknown;
	intervalMs: number;
	lastRun: number | null;
};

export type RecurringTasksMap = Record<string, RecurringTask>;
