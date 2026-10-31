/** Logo resmi SMK Negeri 11 Jakarta. Dekoratif (alt kosong) karena selalu berdampingan dengan nama sekolah. */
export function Logo({ size = 40 }: { size?: number }) {
  // Avoid Next Image's inline color style so strict CSP can block style attributes.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo-smkn11-transparent.webp" alt="" width={size} height={size} className="shrink-0 object-contain" />;
}
