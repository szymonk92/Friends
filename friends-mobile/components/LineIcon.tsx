import { Svg, G, Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import type { ReactNode } from 'react';

// Line-icon set matching the FriendZ design (24×24, round caps, stroke ~2.2–2.6).
// stroke = currentColor equivalent (passed as prop).
const P = (d: string) => <Path d={d} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />;

const ICONS: Record<string, { sw: number; body: ReactNode }> = {
  search: { sw: 2.2, body: (<><Circle cx={11} cy={11} r={7} stroke="currentColor" fill="none" /><Line x1={21} y1={21} x2={16.5} y2={16.5} stroke="currentColor" strokeLinecap="round" /></>) },
  back: { sw: 2.4, body: <Polyline points="15 18 9 12 15 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /> },
  heart: { sw: 2.2, body: P('M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z') },
  more: { sw: 2.6, body: (<><Circle cx={12} cy={5} r={1} fill="currentColor" /><Circle cx={12} cy={12} r={1} fill="currentColor" /><Circle cx={12} cy={19} r={1} fill="currentColor" /></>) },
  plus: { sw: 2.4, body: (<><Line x1={12} y1={5} x2={12} y2={19} stroke="currentColor" strokeLinecap="round" /><Line x1={5} y1={12} x2={19} y2={12} stroke="currentColor" strokeLinecap="round" /></>) },
  close: { sw: 2.6, body: (<><Line x1={6} y1={6} x2={18} y2={18} stroke="currentColor" strokeLinecap="round" /><Line x1={18} y1={6} x2={6} y2={18} stroke="currentColor" strokeLinecap="round" /></>) },
  clock: { sw: 2.2, body: (<><Circle cx={12} cy={12} r={9} stroke="currentColor" fill="none" /><Polyline points="12 7 12 12 15.5 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /></>) },
  mic: { sw: 2.2, body: (<><Rect x={9} y={3} width={6} height={12} rx={3} stroke="currentColor" fill="none" /><Path d="M5 11a7 7 0 0 0 14 0" fill="none" stroke="currentColor" strokeLinecap="round" /><Line x1={12} y1={18} x2={12} y2={21} stroke="currentColor" strokeLinecap="round" /></>) },
  check: { sw: 3, body: <Polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /> },
  arrowLeft: { sw: 2.4, body: (<><Line x1={19} y1={12} x2={5} y2={12} stroke="currentColor" strokeLinecap="round" /><Polyline points="11 6 5 12 11 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /></>) },
  arrowRight: { sw: 2.4, body: (<><Line x1={5} y1={12} x2={19} y2={12} stroke="currentColor" strokeLinecap="round" /><Polyline points="13 6 19 12 13 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /></>) },
  network: { sw: 2.2, body: (<><Circle cx={12} cy={12} r={3} stroke="currentColor" fill="none" /><Circle cx={5} cy={6} r={2} stroke="currentColor" fill="none" /><Circle cx={19} cy={6} r={2} stroke="currentColor" fill="none" /><Path d="M7 17a5 5 0 0 1 10 0" fill="none" stroke="currentColor" strokeLinecap="round" /></>) },
  book: { sw: 2.2, body: P('M4 4h11a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z') },
  users: { sw: 2.2, body: (<><Circle cx={9} cy={8} r={3.2} stroke="currentColor" fill="none" /><Path d="M3 20a6 6 0 0 1 12 0" fill="none" stroke="currentColor" strokeLinecap="round" /><Path d="M16 5.5a3 3 0 0 1 0 5.5" fill="none" stroke="currentColor" strokeLinecap="round" /><Path d="M17 20a6 6 0 0 0-3-5.2" fill="none" stroke="currentColor" strokeLinecap="round" /></>) },
  settings: { sw: 2.2, body: (<><Circle cx={12} cy={12} r={3} stroke="currentColor" fill="none" /><Path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7 5.6 5.6" stroke="currentColor" strokeLinecap="round" /></>) },
  sort: { sw: 2.2, body: (<><Line x1={4} y1={7} x2={14} y2={7} stroke="currentColor" strokeLinecap="round" /><Line x1={4} y1={12} x2={11} y2={12} stroke="currentColor" strokeLinecap="round" /><Line x1={4} y1={17} x2={8} y2={17} stroke="currentColor" strokeLinecap="round" /><Polyline points="17 9 20 6 17 3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /><Line x1={20} y1={6} x2={20} y2={18} stroke="currentColor" strokeLinecap="round" /></>) },
  filter: { sw: 2.2, body: P('M3 5h18l-7 8v6l-4-2v-4z') },
  filterRemove: { sw: 2.2, body: (<><Path d="M3 5h18l-7 8v6l-4-2v-4z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /><Line x1={4} y1={4} x2={20} y2={20} stroke="currentColor" strokeLinecap="round" /></>) },
  eye: { sw: 2.2, body: (<><Path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /><Circle cx={12} cy={12} r={3} stroke="currentColor" fill="none" /></>) },
  eyeOff: { sw: 2.2, body: (<><Path d="M3 3l18 18" stroke="currentColor" strokeLinecap="round" /><Path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" fill="none" stroke="currentColor" strokeLinecap="round" /><Path d="M9.4 5.2A10.9 10.9 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3.2 4M6.2 6.2A18 18 0 0 0 2 12s4 7 10 7a10.9 10.9 0 0 0 3-.4" fill="none" stroke="currentColor" strokeLinecap="round" /></>) },
  tag: { sw: 2.2, body: P('M3 12l9-9 9 9-9 9zM12 7v.01') },
  dotsH: { sw: 2.6, body: (<><Circle cx={5} cy={12} r={1} fill="currentColor" /><Circle cx={12} cy={12} r={1} fill="currentColor" /><Circle cx={19} cy={12} r={1} fill="currentColor" /></>) },
  accountPlus: { sw: 2.2, body: (<><Circle cx={9} cy={8} r={3.2} stroke="currentColor" fill="none" /><Path d="M3 20a6 6 0 0 1 12 0" fill="none" stroke="currentColor" strokeLinecap="round" /><Line x1={19} y1={8} x2={19} y2={14} stroke="currentColor" strokeLinecap="round" /><Line x1={16} y1={11} x2={22} y2={11} stroke="currentColor" strokeLinecap="round" /></>) },
  checkCircle: { sw: 2.2, body: (<><Circle cx={12} cy={12} r={9} stroke="currentColor" fill="none" /><Polyline points="12 7 12 12 15.5 14" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /></>) },
  phone: { sw: 2.2, body: P('M5 4h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z') },
  email: { sw: 2.2, body: P('M3 6h18v12H3z M3 6l9 6 9-6') },
  message: { sw: 2.2, body: P('M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z') },
  camera: { sw: 2.2, body: P('M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z M12 11.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z') },
  pencil: { sw: 2.2, body: P('M4 20h4L19 9l-4-4L4 16zM14 6l4 4') },
  trash: { sw: 2.2, body: P('M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13') },
  bell: { sw: 2.2, body: P('M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 19a2 2 0 0 0 4 0') },
  star: { sw: 2.2, body: P('M12 4l2.5 5.5L20 10l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z') },
  gift: { sw: 2.2, body: P('M4 11h16v9H4zM4 7h16v4H4zM12 7v13M12 7C12 5 10 3 8 4s1 3 4 3zM12 7c0-2 2-4 4-3s-1 3-4 3z') },
  cake: { sw: 2.2, body: P('M5 21V11h14v10M5 11c0-2 2-3 4-3h6c2 0 4 1 4 3M12 8V5M12 5l-.5-1.5a1 1 0 1 1 1 0z') },
};

export type LineIconName = keyof typeof ICONS;

export function LineIcon({
  name,
  size = 18,
  color = '#1B1815',
  strokeWidth,
}: {
  name: LineIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const def = ICONS[name];
  if (!def) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" color={color}>
      <G
        stroke={color}
        strokeWidth={strokeWidth ?? def.sw}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {def.body}
      </G>
    </Svg>
  );
}