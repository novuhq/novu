export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch('https://api.novu.co/v1/telemetry/measure', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${process.env.NOVU_SECRET_KEY}`,
      },
      method: 'POST',
      body: JSON.stringify({
        event: body.event,
        data: body.data,
      }),
    });

    if (response.ok) {
      return Response.json({ success: true });
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
