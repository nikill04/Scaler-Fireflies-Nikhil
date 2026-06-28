/**
 * components/ui/Avatar.tsx
 * --------------------------
 * Small circular avatar used for participants and the host. Falls back to
 * initials-on-a-colored-circle when there's no avatar_url (or the image
 * fails to load), so the UI never shows a broken image icon.
 */

import { getInitials } from "@/lib/format";

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}

export default function Avatar({ name, avatarUrl, size = 28 }: AvatarProps) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full shrink-0 bg-surface-sunken"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      title={name}
      className="rounded-full shrink-0 flex items-center justify-center bg-accent-soft text-accent font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {getInitials(name)}
    </div>
  );
}
