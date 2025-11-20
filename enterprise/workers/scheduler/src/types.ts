export enum JobStepType {
	DELAY = 'delay',
	DIGEST = 'digest',
	THROTTLE = 'throttle',
	SNOOZE = 'snooze',
	SCHEDULED = 'scheduled',
}

export type ScheduledJob = {
	id: string;
	type: JobStepType;
	scheduledFor: number;
	createdAt: number;

	data: {
		_environmentId: string;
		_id: string;
		_organizationId: string;
		_userId: string;
	};

	metadata?: {
		workflowId?: string;
		subscriberId?: string;
		stepId?: string;
	};
};

export type ScheduleJobRequest = {
	jobId: string;
	type: JobStepType;
	delayMs: number;
	data: {
		_environmentId: string;
		_id: string;
		_organizationId: string;
		_userId: string;
	};
	metadata?: {
		workflowId?: string;
		subscriberId?: string;
		stepId?: string;
	};
};
