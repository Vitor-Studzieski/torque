export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="glass space-y-3 rounded-2xl p-4" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="shimmer h-3 rounded-full bg-muted"
          style={{ width: `${90 - i * 18}%` }}
        />
      ))}
    </div>
  );
}
