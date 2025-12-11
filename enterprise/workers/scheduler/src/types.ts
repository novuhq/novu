import * as v from 'valibot';

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

const JobDataSchema = v.object({
  _environmentId: v.pipe(v.string(), v.minLength(1)),
  _id: v.pipe(v.string(), v.minLength(1)),
  _organizationId: v.pipe(v.string(), v.minLength(1)),
  _userId: v.pipe(v.string(), v.minLength(1)),
});

const JobMetadataSchema = v.optional(
  v.object({
    mode: v.optional(v.string()),
    workflowId: v.optional(v.string()),
    subscriberId: v.optional(v.string()),
    stepId: v.optional(v.string()),
  })
);

export const ScheduleJobRequestSchema = v.object({
  jobId: v.pipe(v.string(), v.minLength(1)),
  type: v.enum(SchedulerJobType),
  scheduledFor: v.pipe(v.number(), v.minValue(Date.now())),
  data: JobDataSchema,
  metadata: JobMetadataSchema,
});

export type ScheduleJobRequest = v.InferOutput<typeof ScheduleJobRequestSchema>;
