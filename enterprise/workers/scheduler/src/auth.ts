export async function verifyM2MToken(authHeader: string | null, env: Env): Promise<boolean> {
	if (!authHeader) {
		return false;
	}

	const token = authHeader.replace('Bearer ', '');

	if (!token || !env.API_KEY) {
		return false;
	}

	return token === env.API_KEY;
}
