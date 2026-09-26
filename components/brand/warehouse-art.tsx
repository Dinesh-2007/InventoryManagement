/** Decorative warehouse racking illustration for the auth screens. */
export function WarehouseArt() {
  const racks = [0, 1, 2];
  const levels = [0, 1, 2, 3];
  const colors = ["#e8b27a", "#d99a5b", "#f0c48f", "#c98a4b", "#e3a86a"];
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200">
      <svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#cbd5e1" />
            <stop offset="1" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="light" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="400" height="520" fill="#e2e8f0" />
        {[60, 200, 340].map((x) => (
          <rect key={x} x={x - 30} y="0" width="60" height="6" rx="3" fill="#fff" />
        ))}
        <polygon points="0,420 400,420 400,520 0,520" fill="url(#floor)" />
        {racks.map((r) => {
          const x = 20 + r * 128;
          return (
            <g key={r}>
              {levels.map((l) => {
                const y = 80 + l * 85;
                return (
                  <g key={l}>
                    {[0, 1, 2].map((b) => (
                      <rect
                        key={b}
                        x={x + 8 + b * 34}
                        y={y + 22 - ((r + l + b) % 3) * 6}
                        width="30"
                        height={40 + ((r + l + b) % 3) * 6}
                        rx="2"
                        fill={colors[(r * 3 + l + b) % colors.length]}
                        stroke="#b07a45"
                        strokeWidth="0.8"
                      />
                    ))}
                    <rect x={x} y={y + 62} width="112" height="7" fill="#f97316" />
                  </g>
                );
              })}
              <rect x={x} y="70" width="6" height="355" fill="#1e3a8a" />
              <rect x={x + 106} y="70" width="6" height="355" fill="#1e3a8a" />
            </g>
          );
        })}
        <rect width="400" height="200" fill="url(#light)" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-8 text-white">
        <p className="text-lg font-semibold">Every movement, accounted for.</p>
        <p className="text-sm text-white/80">Receipts, deliveries, transfers and adjustments in one ledger.</p>
      </div>
    </div>
  );
}
