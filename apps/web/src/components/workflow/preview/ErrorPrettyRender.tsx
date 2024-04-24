export function ErrorPrettyRender({ error }) {
  return (
    <div style={{ padding: 20, background: '#990000', borderRadius: 10 }}>
      <h3 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>Error while rendering</h3>
      <div>{error.message}</div> <br />
      {error.data ? (
        <pre style={{ overflow: 'auto', background: 'rgb(19 19 19)', padding: 15 }}>
          {JSON.stringify(error.data, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
