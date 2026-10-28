import { kg, shortDate } from "@/lib/format";

// viewBox ongeveer op de werkelijke kaartbreedte, zodat aslabels leesbaar blijven
const W = 420;
const H = 190;
const PAD = { top: 16, right: 12, bottom: 26, left: 48 };

function niceRange(min: number, max: number) {
  if (min === max) return { lo: min - 1, hi: max + 1 };
  const span = max - min;
  const pad = span * 0.15;
  return { lo: Math.floor(min - pad), hi: Math.ceil(max + pad) };
}

export function LineChart({
  points,
  goal,
  unit = "kg",
  label,
}: {
  points: { date: string; value: number }[];
  goal?: number | null;
  unit?: string;
  label: string;
}) {
  if (points.length === 0) return <div className="empty">Nog geen metingen.</div>;
  const values = points.map((p) => p.value).concat(goal != null ? [goal] : []);
  const { lo, hi } = niceRange(Math.min(...values), Math.max(...values));
  const t0 = new Date(points[0].date).getTime();
  const t1 = new Date(points[points.length - 1].date).getTime();
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (d: string) => PAD.left + (t1 === t0 ? innerW / 2 : ((new Date(d).getTime() - t0) / (t1 - t0)) * innerW);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH;
  const ticks = [lo, lo + (hi - lo) / 2, hi];
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const showDots = points.length <= 40;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <title>{label}</title>
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
          <text className="axis" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">{kg(t, 0)}</text>
        </g>
      ))}
      {goal != null && (
        <g>
          <line className="goal" x1={PAD.left} x2={W - PAD.right} y1={y(goal)} y2={y(goal)} />
          <text className="axis" x={W - PAD.right} y={y(goal) - 6} textAnchor="end" style={{ fill: "var(--positive)" }}>
            doel {kg(goal)} {unit}
          </text>
        </g>
      )}
      <path className="line" d={path} />
      {showDots && points.slice(0, -1).map((p) => <circle key={p.date} className="dot" cx={x(p.date)} cy={y(p.value)} r={3} />)}
      <circle className="dot-last" cx={x(last.date)} cy={y(last.value)} r={6} />
      <text className="axis" x={PAD.left} y={H - 6}>{shortDate(points[0].date)}</text>
      {points.length > 1 && (
        <text className="axis" x={W - PAD.right} y={H - 6} textAnchor="end">{shortDate(last.date)}</text>
      )}
    </svg>
  );
}

export function BarChart({
  bars,
  label,
  format = (v: number) => kg(v, 0),
}: {
  bars: { label: string; value: number; current?: boolean }[];
  label: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / bars.length;
  const bw = Math.min(40, slot * 0.6);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <title>{label}</title>
      <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} />
      <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={PAD.top} y2={PAD.top} />
      <text className="axis" x={PAD.left - 8} y={PAD.top + 4} textAnchor="end">{format(max)}</text>
      <text className="axis" x={PAD.left - 8} y={PAD.top + innerH + 4} textAnchor="end">0</text>
      {bars.map((b, i) => {
        const h = (b.value / max) * innerH;
        const cx = PAD.left + slot * i + slot / 2;
        return (
          <g key={b.label + i}>
            {b.value > 0 && (
              <rect
                className={b.current ? "bar bar-current" : "bar"}
                x={cx - bw / 2}
                y={PAD.top + innerH - h}
                width={bw}
                height={Math.max(h, 2)}
                rx={4}
              />
            )}
            <text className="axis" x={cx} y={H - 6} textAnchor="middle">{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
