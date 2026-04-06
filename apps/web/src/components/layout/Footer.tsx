export function Footer() {
  return (
    <footer>
      <div className="app-main" style={{ paddingTop: 0 }}>
        <p className="muted" style={{ margin: '0 0 24px' }}>
          Local-first editor scaffold. Replace the stubs in `lib/wasmClient.ts` and
          `lib/workerClient.ts` when the shared processor is ready.
        </p>
      </div>
    </footer>
  );
}
