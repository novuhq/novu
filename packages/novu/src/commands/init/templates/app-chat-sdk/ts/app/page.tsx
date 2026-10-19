export default function HomePage() {
  const agentId = process.env.NOVU_AGENT_IDENTIFIER ?? 'not set';

  return (
    <main>
      <h1>Novu Chat SDK</h1>
      <p>
        Your bridge lives at <code>POST /api/webhooks/novu</code>. Novu forwards inbound channel messages here; your
        Chat SDK handlers reply through the Novu API.
      </p>
      <p>
        Agent identifier: <code>{agentId}</code>
      </p>
      <p>
        Try sending <code>whoami</code> or <code>resolve</code> on a connected channel after the dev tunnel is active.
      </p>
    </main>
  );
}
