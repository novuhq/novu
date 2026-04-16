import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Novu Agent</h1>
        <p className={styles.description}>
          Your conversational agent is running at <code className={styles.code}>/api/novu</code>
        </p>

        <div className={styles.steps}>
          <h2>Get started</h2>
          <ol>
            <li>
              Edit your agent in <code className={styles.code}>app/novu/agents/support-agent.tsx</code>
            </li>
            <li>
              Connect a chat platform in the{' '}
              <a href="https://dashboard.novu.co" target="_blank" rel="noopener noreferrer">
                Novu Dashboard
              </a>
            </li>
            <li>Replace the demo handler with your LLM call</li>
          </ol>
        </div>

        <div className={styles.features}>
          <h2>What the demo agent shows</h2>
          <ul>
            <li>
              <strong>Interactive Cards</strong> — buttons and actions rendered natively per platform
            </li>
            <li>
              <strong>onAction handler</strong> — respond to button clicks and selections
            </li>
            <li>
              <strong>Conversation metadata</strong> — track state across messages
            </li>
            <li>
              <strong>Resolve lifecycle</strong> — close conversations and trigger follow-ups
            </li>
            <li>
              <strong>Markdown replies</strong> — rich formatted responses
            </li>
            <li>
              <strong>Conversation history</strong> — multi-turn awareness
            </li>
          </ul>
        </div>

        <div className={styles.links}>
          <a href="https://docs.novu.co/agents" target="_blank" rel="noopener noreferrer">
            Docs
          </a>
          <a href="https://discord.novu.co" target="_blank" rel="noopener noreferrer">
            Discord
          </a>
          <a href="https://github.com/novuhq/novu" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </main>
  );
}
