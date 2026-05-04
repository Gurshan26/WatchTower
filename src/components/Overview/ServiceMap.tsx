export default function ServiceMap() {
  return (
    <svg width="100%" height="260" viewBox="0 0 560 260" role="img" aria-label="Service map">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
        </marker>
      </defs>
      <rect x="20" y="30" width="160" height="70" rx="6" fill="#111827" stroke="#1e293b" />
      <text x="100" y="62" textAnchor="middle" fill="#f0f6ff" fontSize="12" fontFamily="Geist Mono">
        Dashboard UI
      </text>

      <rect x="210" y="30" width="160" height="70" rx="6" fill="#111827" stroke="#1e293b" />
      <text x="290" y="62" textAnchor="middle" fill="#f0f6ff" fontSize="12" fontFamily="Geist Mono">
        API Routes
      </text>

      <rect x="400" y="30" width="140" height="70" rx="6" fill="#111827" stroke="#1e293b" />
      <text x="470" y="62" textAnchor="middle" fill="#f0f6ff" fontSize="12" fontFamily="Geist Mono">
        OTLP Ingest
      </text>

      <rect x="210" y="150" width="160" height="70" rx="6" fill="#111827" stroke="#1e293b" />
      <text x="290" y="182" textAnchor="middle" fill="#f0f6ff" fontSize="12" fontFamily="Geist Mono">
        SQLite
      </text>

      <line x1="180" y1="65" x2="210" y2="65" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow)" />
      <line x1="370" y1="65" x2="400" y2="65" stroke="#8b5cf6" strokeWidth="2" markerEnd="url(#arrow)" />
      <line x1="470" y1="100" x2="330" y2="150" stroke="#06b6d4" strokeWidth="2" markerEnd="url(#arrow)" />
      <line x1="290" y1="150" x2="290" y2="100" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow)" />

      <text x="86" y="120" fill="#94a3b8" fontSize="11">
        self-observing loop
      </text>
    </svg>
  );
}
