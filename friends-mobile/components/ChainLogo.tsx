import { Svg, Rect } from 'react-native-svg';

export type ChainLogoVariant = 'linked' | 'apart' | 'partner';

// Partner heart: two rounded rects tilted ±45° so their lowest corners meet.
// Must be taller than wide — at ±45° two near-squares collapse into the same
// diamond. Centres sit 0.707·(H−W) apart horizontally; tune W/H/RX here.
const HEART_W = 32;
const HEART_H = 56;
const HEART_RX = 14;
const HEART_DX = (Math.SQRT1_2 * (HEART_H - HEART_W)) / 2;

// The FriendZ chain-link mark: two interlocking rounded rects.
// Matches the splash rest pose and the design's app-bar logo.
// 'apart' pulls the rings apart (same size, no overlap) to read as "not linked";
// 'partner' crosses them into a heart. Used on the compare screen.
export function ChainLogo({
  size = 30,
  strokeWidth = 8,
  color = '#1B1815',
  connected = true,
  variant = connected ? 'linked' : 'apart',
}: {
  size?: number;
  strokeWidth?: number;
  color?: string;
  connected?: boolean;
  variant?: ChainLogoVariant;
}) {
  // viewBox 110×80 → height = size * 80/110
  const height = (size * 80) / 110;

  if (variant === 'partner') {
    const leftCx = 55 - HEART_DX;
    const rightCx = 55 + HEART_DX;
    const rect = (cx: number, angle: number) => (
      <Rect
        x={cx - HEART_W / 2}
        y={40 - HEART_H / 2}
        width={HEART_W}
        height={HEART_H}
        rx={HEART_RX}
        stroke={color}
        strokeWidth={strokeWidth}
        transform={`rotate(${angle} ${cx} 40)`}
      />
    );
    return (
      <Svg width={size} height={height} viewBox="0 0 110 80" fill="none">
        {rect(leftCx, -45)}
        {rect(rightCx, 45)}
      </Svg>
    );
  }

  const leftX = variant === 'linked' ? 16 : 3;
  const rightX = variant === 'linked' ? 46 : 59;
  return (
    <Svg width={size} height={height} viewBox="0 0 110 80" fill="none">
      <Rect x={leftX} y={24} width={48} height={40} rx={13} stroke={color} strokeWidth={strokeWidth} />
      <Rect x={rightX} y={24} width={48} height={40} rx={13} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}
