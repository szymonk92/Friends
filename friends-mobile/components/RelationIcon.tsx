import {
  HeartIcon,
  ThumbsDownIcon,
  WarningIcon,
  HandshakeIcon,
  PackageIcon,
  MapPinIcon,
  UserCircleIcon,
  TargetIcon,
  CalendarCheckIcon,
  PulseIcon,
  TrophyIcon,
  TrendDownIcon,
  CakeIcon,
  NotePencilIcon,
  type Icon,
} from 'phosphor-react-native';

// One glyph per relation type — replaces the old emoji map (getRelationEmoji).
const RELATION_ICONS: Record<string, Icon> = {
  LIKES: HeartIcon,
  DISLIKES: ThumbsDownIcon,
  AVOIDS: WarningIcon,
  KNOWS: HandshakeIcon,
  HAS: PackageIcon,
  LIVES_IN: MapPinIcon,
  IS: UserCircleIcon,
  CAN: TargetIcon,
  DID: CalendarCheckIcon,
  DOES: PulseIcon,
  WANTS: TrophyIcon,
  STRUGGLES_WITH: TrendDownIcon,
  HAS_IMPORTANT_DATE: CakeIcon,
};

export function RelationIcon({
  type,
  size = 14,
  color = '#1B1815',
}: {
  type: string;
  size?: number;
  color?: string;
}) {
  const IconComp = RELATION_ICONS[type] ?? NotePencilIcon;
  return <IconComp size={size} color={color} weight="bold" />;
}
