import * as v from 'valibot';

export type ScheduledJob = {
  id: string;
  scheduledFor: number;
  mode: string;
  createdAt: number;

  data: {
    _environmentId: string;
    _id: string;
    _organizationId: string;
    _userId: string;
  };
};

const JobDataSchema = v.object({
  _environmentId: v.pipe(v.string(), v.minLength(1)),
  _id: v.pipe(v.string(), v.minLength(1)),
  _organizationId: v.pipe(v.string(), v.minLength(1)),
  _userId: v.pipe(v.string(), v.minLength(1)),
});

export const ScheduleJobRequestSchema = v.object({
  jobId: v.pipe(v.string(), v.minLength(1)),
  scheduledFor: v.number(),
  mode: v.pipe(v.string(), v.minLength(1)),
  data: JobDataSchema,
});

export type ScheduleJobRequest = v.InferOutput<typeof ScheduleJobRequestSchema>;
