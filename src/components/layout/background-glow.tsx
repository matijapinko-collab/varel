/**
 * Subtle premium background glow behind the hero.
 * Pure CSS (see globals.css `.varel-glow-*`): animated on desktop, static on
 * mobile, and fully disabled under prefers-reduced-motion. Animates transform
 * and opacity only — no continuous blur/filter animation.
 */
export function BackgroundGlow() {
  return (
    <div
      aria-hidden
      className="varel-hero-glow pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="varel-glow-blob varel-glow-blob-1" />
      <div className="varel-glow-blob varel-glow-blob-2" />
    </div>
  );
}
