export default function BlockedPage() {
  return (
    <div className="min-h-screen bg-arena-bg flex items-center justify-center p-6">
      <div className="glass rounded-xl border border-arena-border p-8 max-w-md text-center space-y-4">
        <p className="font-terminal text-2xl text-arena-red font-bold">ACCESS RESTRICTED</p>
        <p className="font-terminal text-sm text-arena-muted">
          Turena Arena is not available in your region due to local regulations
          regarding prediction markets and financial instruments.
        </p>
        <p className="font-terminal text-xs text-arena-muted/60">
          US · UK residents are unable to participate.
        </p>
      </div>
    </div>
  );
}
