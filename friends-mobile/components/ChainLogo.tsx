import { Svg, Rect } from 'react-native-svg';

// The FriendZ chain-link mark: two interlocking rounded rects.
// Matches the splash rest pose and the design's app-bar logo.
// connected=false pulls the rings apart (same size, no overlap) to read as
// "not linked" — used on the compare screen when two people aren't connected.
export function ChainLogo({
  size = 30,
  strokeWidth = 8,
  color = '#1B1815',
  connected = true,
}: {
  size?: number;
  strokeWidth?: number;
  color?: string;
  connected?: boolean;
}) {
  // viewBox 110×80 → height = size * 80/110
  const height = (size * 80) / 110;
  const leftX = connected ? 16 : 3;
  const rightX = connected ? 46 : 59;
  return (
    <Svg width={size} height={height} viewBox="0 0 110 80" fill="none">
      <Rect x={leftX} y={24} width={48} height={40} rx={13} stroke={color} strokeWidth={strokeWidth} />
      <Rect x={rightX} y={24} width={48} height={40} rx={13} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}