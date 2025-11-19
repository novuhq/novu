import type {
	ScheduledTask,
	ScheduleTaskRequest,
	ScheduleRecurringTaskRequest,
	RecurringTasksMap,
} from './types';
import { verifyM2MToken } from './auth';

const TASKS_STORAGE_KEY = 'scheduled_tasks';
const RECURRING_TASKS_STORAGE_KEY = 'recurring_tasks';

export class Scheduler implements DurableObject {
	constructor(private state: DurableObjectState, private env: Env) {}

	async fetch(request: Request): Promise<Response> {
		const authHeader = request.headers.get('Authorization');
		
		if (!authHeader || !this.env.CLERK_MACHINE_SECRET_KEY) {
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
				const body = await request.json<ScheduleTaskRequest>();
				this.validateScheduleTaskRequest(body);
				await this.scheduleTask(body);
				return Response.json({ success: true });
			}

			if (request.method === 'POST' && url.pathname === '/schedule/recurring') {
				const body = await request.json<ScheduleRecurringTaskRequest>();
				this.validateScheduleRecurringTaskRequest(body);
				await this.scheduleRecurringTask(body);
				return Response.json({ success: true });
			}

			if (request.method === 'DELETE' && url.pathname.startsWith('/cancel/recurring/')) {
				const taskId = url.pathname.replace('/cancel/recurring/', '');
				const cancelled = await this.cancelRecurringTask(taskId);
				return Response.json({ success: cancelled });
			}

			if (request.method === 'DELETE' && url.pathname.startsWith('/cancel/')) {
				const taskId = url.pathname.replace('/cancel/', '');
				const cancelled = await this.cancelTask(taskId);
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

	private validateScheduleTaskRequest(body: unknown): asserts body is ScheduleTaskRequest {
		const req = body as Partial<ScheduleTaskRequest>;
		if (!req.taskId || typeof req.taskId !== 'string') {
			throw new Error('taskId is required and must be a string');
		}
		if (typeof req.delayMs !== 'number' || req.delayMs < 0) {
			throw new Error('delayMs must be a positive number');
		}
	}

	private validateScheduleRecurringTaskRequest(body: unknown): asserts body is ScheduleRecurringTaskRequest {
		const req = body as Partial<ScheduleRecurringTaskRequest>;
		if (!req.taskId || typeof req.taskId !== 'string') {
			throw new Error('taskId is required and must be a string');
		}
		if (typeof req.intervalMs !== 'number' || req.intervalMs < 1000) {
			throw new Error('intervalMs must be a number >= 1000ms');
		}
	}

	private async scheduleTask(request: ScheduleTaskRequest): Promise<void> {
		const scheduledFor = Date.now() + request.delayMs;
		const task: ScheduledTask = {
			id: request.taskId,
			payload: request.payload,
			scheduledFor,
			createdAt: Date.now(),
		};

		const tasks = await this.getScheduledTasks();
		tasks.push(task);
		await this.saveScheduledTasks(tasks);

		await this.updateAlarmIfNeeded(scheduledFor);
	}

	private async scheduleRecurringTask(request: ScheduleRecurringTaskRequest): Promise<void> {
		const recurringTasks = await this.getRecurringTasks();
		const now = Date.now();
		
		recurringTasks[request.taskId] = {
			payload: request.payload,
			intervalMs: request.intervalMs,
			lastRun: now,
		};

		await this.saveRecurringTasks(recurringTasks);

		const nextRun = now + request.intervalMs;
		await this.updateAlarmIfNeeded(nextRun);
	}

	private async cancelTask(taskId: string): Promise<boolean> {
		const tasks = await this.getScheduledTasks();
		const filtered = tasks.filter((task) => task.id !== taskId);

		if (tasks.length === filtered.length) {
			return false;
		}

		await this.saveScheduledTasks(filtered);
		await this.recalculateAlarm();
		
		return true;
	}

	private async cancelRecurringTask(taskId: string): Promise<boolean> {
		const recurringTasks = await this.getRecurringTasks();

		if (!recurringTasks[taskId]) {
			return false;
		}

		delete recurringTasks[taskId];
		await this.saveRecurringTasks(recurringTasks);
		await this.recalculateAlarm();
		
		return true;
	}

	private async handleAlarm(): Promise<void> {
		const now = Date.now();
		const tasks = await this.getScheduledTasks();
		const recurringTasks = await this.getRecurringTasks();

		const tasksToExecute: ScheduledTask[] = [];
		const remainingTasks: ScheduledTask[] = [];

		for (const task of tasks) {
			if (task.scheduledFor <= now) {
				tasksToExecute.push(task);
			} else {
				remainingTasks.push(task);
			}
		}

		for (const [taskId, recurringTask] of Object.entries(recurringTasks)) {
			const nextRun = (recurringTask.lastRun || now) + recurringTask.intervalMs;

			if (nextRun <= now) {
				tasksToExecute.push({
					id: taskId,
					payload: recurringTask.payload,
					scheduledFor: nextRun,
					createdAt: recurringTask.lastRun || now,
				});

				recurringTask.lastRun = now;
			}
		}

		await this.saveScheduledTasks(remainingTasks);
		await this.saveRecurringTasks(recurringTasks);

		await Promise.allSettled(tasksToExecute.map((task) => this.executeTask(task)));

		await this.recalculateAlarm();
	}

	private async updateAlarmIfNeeded(timestamp: number): Promise<void> {
		const currentAlarm = await this.state.storage.getAlarm();
		if (currentAlarm === null || timestamp < currentAlarm) {
			await this.state.storage.setAlarm(timestamp);
		}
	}

	private async recalculateAlarm(): Promise<void> {
		const tasks = await this.getScheduledTasks();
		const recurringTasks = await this.getRecurringTasks();
		const now = Date.now();
		let nextAlarm: number | null = null;

		for (const task of tasks) {
			if (task.scheduledFor > now && (nextAlarm === null || task.scheduledFor < nextAlarm)) {
				nextAlarm = task.scheduledFor;
			}
		}

		for (const recurringTask of Object.values(recurringTasks)) {
			const nextRun = (recurringTask.lastRun || now) + recurringTask.intervalMs;
			if (nextAlarm === null || nextRun < nextAlarm) {
				nextAlarm = nextRun;
			}
		}

		if (nextAlarm !== null) {
			await this.state.storage.setAlarm(nextAlarm);
		} else {
			await this.state.storage.deleteAlarm();
		}
	}

	private async executeTask(task: ScheduledTask): Promise<void> {
		try {
			await this.onTaskExecute(task);
		} catch (error) {
			console.error(`Failed to execute task ${task.id}:`, error);
			await this.onTaskError(task, error);
		}
	}

	protected async onTaskExecute(task: ScheduledTask): Promise<void> {
		console.log(`Executing task ${task.id}`, task.payload);
	}

	protected async onTaskError(task: ScheduledTask, error: unknown): Promise<void> {
		console.error(`Task ${task.id} failed:`, error);
	}

	private async getScheduledTasks(): Promise<ScheduledTask[]> {
		const stored = await this.state.storage.get<ScheduledTask[]>(TASKS_STORAGE_KEY);
		return stored || [];
	}

	private async saveScheduledTasks(tasks: ScheduledTask[]): Promise<void> {
		await this.state.storage.put(TASKS_STORAGE_KEY, tasks);
	}

	private async getRecurringTasks(): Promise<RecurringTasksMap> {
		const stored = await this.state.storage.get<RecurringTasksMap>(RECURRING_TASKS_STORAGE_KEY);
		return stored || {};
	}

	private async saveRecurringTasks(tasks: RecurringTasksMap): Promise<void> {
		await this.state.storage.put(RECURRING_TASKS_STORAGE_KEY, tasks);
	}
}
