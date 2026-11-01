const GOLD = "#F5C84B";
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// Gigi balang: zig-zag selebar tile (120px)
const zigzag = range(21).map((i) => `${i ? "L" : "M"}${i * 6} ${i % 2 ? 56 : 64}`).join("");
// Pucuk rebung: segitiga luar dan dalam
const rebung = range(10).map((i) => `M${i * 12} 120L${i * 12 + 6} 106L${i * 12 + 12} 120`).join("");
const rebungDalam = range(10).map((i) => `M${i * 12 + 3} 120L${i * 12 + 6} 112L${i * 12 + 9} 120`).join("");

export function BatikBetawi() {
  return (
    <svg aria-hidden width="100%" height="100%" className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <g id="batik-kk" fill="none" stroke={GOLD} strokeOpacity={0.55}>
          {range(8).map((i) => (
            <ellipse key={i} cy={-9} rx={3} ry={7.5} transform={`rotate(${i * 45})`} />
          ))}
          <circle r={2.5} fill={GOLD} fillOpacity={0.5} stroke="none" />
          <circle r={14.5} strokeOpacity={0.25} strokeDasharray="1 3" />
        </g>
        <pattern id="batik-pola" width={120} height={120} patternUnits="userSpaceOnUse" patternTransform="scale(.85)">
          <use href="#batik-kk" transform="translate(30 30) scale(1.1)" />
          <use href="#batik-kk" transform="translate(90 90) scale(1.1)" />
          <use href="#batik-kk" transform="translate(90 30) scale(.55)" />
          <use href="#batik-kk" transform="translate(30 90) scale(.55)" />
          <g fill="none" stroke={GOLD} strokeOpacity={0.45} strokeLinejoin="round">
            <path d={zigzag} />
            <path d="M0 51H120M0 69H120" strokeOpacity={0.25} />
            <path d={rebung} />
            <path d={rebungDalam} strokeOpacity={0.3} />
          </g>
          <g fill={GOLD} fillOpacity={0.5}>
            {[[60,30],[60,90],[6,30],[114,30],[6,90],[114,90],[60,8],[60,44]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r={1.1} />
            ))}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#batik-pola)" />
    </svg>
  );
}
