"use client";

interface SkillRadarProps {
  skills: { label: string; value: number; max: number }[];
  size?: number;
}

export function SkillRadar({ skills, size = 240 }: SkillRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 30;
  const levels = 4;
  const n = skills.length;

  // Angle for each axis
  const angleStep = (2 * Math.PI) / n;

  // Get point on axis
  const getPoint = (i: number, r: number) => ({
    x: cx + r * Math.sin(i * angleStep),
    y: cy - r * Math.cos(i * angleStep),
  });

  // Grid rings
  const rings = Array.from({ length: levels }, (_, l) => {
    const r = (maxR / levels) * (l + 1);
    const points = Array.from({ length: n }, (_, i) => getPoint(i, r));
    return points.map((p) => `${p.x},${p.y}`).join(" ");
  });

  // Data polygon
  const dataPoints = skills.map((s, i) => {
    const r = s.max > 0 ? (s.value / s.max) * maxR : 0;
    return getPoint(i, r);
  });
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid rings */}
        {rings.map((pts, i) => (
          <polygon
            key={i}
            points={pts}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.5}
            className="text-gray-200 dark:text-gray-700"
          />
        ))}

        {/* Axis lines */}
        {skills.map((_, i) => {
          const p = getPoint(i, maxR);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="currentColor"
              strokeWidth={0.5}
              className="text-gray-200 dark:text-gray-700"
            />
          );
        })}

        {/* Data fill */}
        <polygon
          points={dataPath}
          fill="url(#radar-fill)"
          stroke="url(#radar-stroke)"
          strokeWidth={2}
          className="transition-all duration-700"
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="white"
            stroke="url(#radar-stroke)"
            strokeWidth={2}
            className="transition-all duration-500"
          />
        ))}

        {/* Labels */}
        {skills.map((s, i) => {
          const p = getPoint(i, maxR + 20);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[11px] font-medium fill-gray-600 dark:fill-gray-400"
            >
              {s.label}
            </text>
          );
        })}

        {/* Gradient defs */}
        <defs>
          <linearGradient id="radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.15} />
          </linearGradient>
          <linearGradient id="radar-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
