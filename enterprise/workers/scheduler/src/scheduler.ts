import type { ScheduledJob, ScheduleJobRequest } from './types';
import { verifyM2MToken } from './auth';

const SCHEDULED_JOBS_KEY = 'scheduled_jobs';

export class Scheduler implements DurableObject {
	constructor(private state: DurableObjectState, private env: Env) {}

	async fetch(request: Request): Promise<Response> {
		const authHeader = request.headers.get('Authorization');
		
		if (!authHeader || !this.env.API_KEY) {
			if (request.body && request.method === 'POST') {
				try {
					await request.text();
				} catch {}
			}
			return Response.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const isAuthenticated = await verifyM2MToken(authHeader, this.env);

		if (!isAuthenticated) {
			if (request.body && request.method === 'POST') {
				try {
					await request.text();
				} catch {}
			}
			return Response.json({ error: 'Unauthorized' }, { status: 401 });
		}

		try {
			const url = new URL(request.url);

			if (request.method === 'POST' && url.pathname === '/schedule') {
				const body = await request.json<ScheduleJobRequest>();
				this.validateScheduleJobRequest(body);
				await this.scheduleJob(body);
				return Response.json({ success: true });
			}

			if (request.method === 'DELETE' && url.pathname.startsWith('/cancel/')) {
				const jobId = url.pathname.replace('/cancel/', '');
				const cancelled = await this.cancelJob(jobId);
				return Response.json({ success: cancelled });
			}

			return new Response('Not Found', { status: 404 });
		} catch (error) {
			return Response.json(
				{
					error: error instanceof Error ? error.message : String(error),
				},
				{ status: 500 }
			);
		}
	}

	async alarm(): Promise<void> {
		await this.handleAlarm();
	}

	private validateScheduleJobRequest(body: unknown): asserts body is ScheduleJobRequest {
		const req = body as Partial<ScheduleJobRequest>;
		if (!req.jobId || typeof req.jobId !== 'string') {
			throw new Error('jobId is required and must be a string');
		}
		if (typeof req.delayMs !== 'number' || req.delayMs < 0) {
			throw new Error('delayMs must be a positive number');
		}
		if (!req.type || typeof req.type !== 'string') {
			throw new Error('type is required and must be a valid JobStepType');
		}
		if (!req.data || typeof req.data !== 'object') {
			throw new Error('data is required and must be an object');
		}
		if (!req.data._environmentId || !req.data._id || !req.data._organizationId || !req.data._userId) {
			throw new Error('data must include _environmentId, _id, _organizationId, and _userId');
		}
	}

	private async scheduleJob(request: ScheduleJobRequest): Promise<void> {
		const scheduledFor = Date.now() + request.delayMs;
		const job: ScheduledJob = {
			id: request.jobId,
			type: request.type,
			scheduledFor,
			createdAt: Date.now(),
			data: request.data,
			metadata: request.metadata,
		};

		const jobs = await this.getScheduledJobs();
		jobs.push(job);
		await this.saveScheduledJobs(jobs);

		await this.updateAlarmIfNeeded(scheduledFor);
	}

	private async cancelJob(jobId: string): Promise<boolean> {
		const jobs = await this.getScheduledJobs();
		const filtered = jobs.filter((job) => job.id !== jobId);

		if (jobs.length === filtered.length) {
			return false;
		}

		await this.saveScheduledJobs(filtered);
		await this.recalculateAlarm();

		return true;
	}

	private async handleAlarm(): Promise<void> {
		const now = Date.now();
		const jobs = await this.getScheduledJobs();

		const jobsToExecute: ScheduledJob[] = [];
		const remainingJobs: ScheduledJob[] = [];

		for (const job of jobs) {
			if (job.scheduledFor <= now) {
				jobsToExecute.push(job);
			} else {
				remainingJobs.push(job);
			}
		}

		await this.saveScheduledJobs(remainingJobs);

		await Promise.allSettled(jobsToExecute.map((job) => this.executeJob(job)));

		await this.recalculateAlarm();
	}

	private async updateAlarmIfNeeded(timestamp: number): Promise<void> {
		const currentAlarm = await this.state.storage.getAlarm();
		if (currentAlarm === null || timestamp < currentAlarm) {
			await this.state.storage.setAlarm(timestamp);
		}
	}

	private async recalculateAlarm(): Promise<void> {
		const jobs = await this.getScheduledJobs();
		const now = Date.now();

		const nextJob = jobs
			.filter((job) => job.scheduledFor > now)
			.sort((a, b) => a.scheduledFor - b.scheduledFor)[0];

		if (nextJob) {
			await this.state.storage.setAlarm(nextJob.scheduledFor);
		} else {
			await this.state.storage.deleteAlarm();
		}
	}

	private async executeJob(job: ScheduledJob): Promise<void> {
		try {
			await this.onJobExecute(job);
		} catch (error) {
			console.error(`Failed to execute job ${job.id}:`, error);
			await this.onJobError(job, error);
		}
	}

	protected async onJobExecute(job: ScheduledJob): Promise<void> {
		console.log(`[Scheduler] Alarm fired for job ${job.id}`, {
			type: job.type,
			mode: job.metadata?.mode,
			scheduledFor: new Date(job.scheduledFor).toISOString(),
			actualTime: new Date().toISOString(),
			alarmDriftMs: Date.now() - job.scheduledFor,
			data: job.data,
			metadata: job.metadata,
		});
		// TODO: Call API to enqueue job to BullMQ StandardQueue with delay=0
		// If mode === 'shadow', add skipProcessing: true to job data
		// If mode === 'live' or 'complete', add job data without skipProcessing flag
		// await fetch(`${this.env.API_URL}/v1/internal/scheduler/enqueue`, {
		//   method: 'POST',
		//   headers: {
		//     'Content-Type': 'application/json',
		//     'Authorization': `Bearer ${this.env.API_KEY}`
		//   },
		//   body: JSON.stringify({
		//     name: job.id,
		//     data: {
		//       ...job.data,
		//       ...(job.metadata?.mode === 'shadow' && { skipProcessing: true })
		//     },
		//     groupId: job.data._organizationId,
		//     options: { delay: 0 }
		//   })
		// });
	}

	protected async onJobError(job: ScheduledJob, error: unknown): Promise<void> {
		console.error(`[Scheduler] Job ${job.id} execution failed:`, {
			jobId: job.id,
			type: job.type,
			error: error instanceof Error ? error.message : String(error),
			data: job.data,
		});
	}

	private async getScheduledJobs(): Promise<ScheduledJob[]> {
		const stored = await this.state.storage.get<ScheduledJob[]>(SCHEDULED_JOBS_KEY);
		return stored || [];
	}

	private async saveScheduledJobs(jobs: ScheduledJob[]): Promise<void> {
		await this.state.storage.put(SCHEDULED_JOBS_KEY, jobs);
	}
}
