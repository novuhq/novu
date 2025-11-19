import { createClerkClient } from '@clerk/backend';

export async function verifyM2MToken(authHeader: string | null, env: Env): Promise<boolean> {
	if (!authHeader) {
		return false;
	}

	const token = authHeader.replace('Bearer ', '');

	if (!token || !env.CLERK_MACHINE_SECRET_KEY) {
		return false;
	}

	try {
		const clerkClient = createClerkClient({
			secretKey: env.CLERK_MACHINE_SECRET_KEY,
		});

		await clerkClient.m2m.verifyToken({ token });

		return true;
	} catch {
		return false;
	}
}
