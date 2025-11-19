import { Scheduler } from './scheduler';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/health') {
			return new Response('OK', { status: 200 });
		}

		const id = env.SCHEDULER.idFromName('scheduler');
		const stub = env.SCHEDULER.get(id);
		
		return stub.fetch(request);
	},
} satisfies ExportedHandler<Env>;

export { Scheduler };
