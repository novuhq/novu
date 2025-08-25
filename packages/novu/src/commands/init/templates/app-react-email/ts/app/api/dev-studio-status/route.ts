export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('http://localhost:2022/.well-known/novu', {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.port && data.route) {
        return Response.json({ connected: true, data });
      }
    }

    return Response.json({
      connected: false,
      error: await response.text(),
    });
  } catch (error) {
    return Response.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
