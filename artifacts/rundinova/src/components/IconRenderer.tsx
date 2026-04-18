import { getIconComponent, EMOJI_TO_ICON_MAP } from "@/lib/icons";

interface IconRendererProps {
  name: string;
  className?: string;
}

export function IconRenderer({ name, className = "w-4 h-4" }: IconRendererProps) {
  const resolvedName = EMOJI_TO_ICON_MAP[name] ?? name;
  const Icon = getIconComponent(resolvedName);
  return <Icon className={className} />;
}
