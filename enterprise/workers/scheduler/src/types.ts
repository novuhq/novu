export enum SchedulerJobType {
	DELAY = 'delay',
	DIGEST = 'digest',
	THROTTLE = 'throttle',
	SNOOZE = 'snooze',
	SCHEDULED = 'scheduled',
}

export type ScheduledJob = {
	id: string;
	type: SchedulerJobType;
	scheduledFor: number;
	createdAt: number;

	data: {
		_environmentId: string;
		_id: string;
		_organizationId: string;
		_userId: string;
	};

	metadata?: {
		mode?: string;
		workflowId?: string;
		subscriberId?: string;
		stepId?: string;
	};
};

export type ScheduleJobRequest = {
	jobId: string;
	type: SchedulerJobType;
	delayMs: number;
	data: {
		_environmentId: string;
		_id: string;
		_organizationId: string;
		_userId: string;
};
	metadata?: {
		mode?: string;
		workflowId?: string;
		subscriberId?: string;
		stepId?: string;
	};
};
