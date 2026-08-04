"use client";

import { useState } from "react";
import { FolderKanban } from "lucide-react";

export default function ProjectThumbnail({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  const canRender = Boolean(
    src &&
      (src.startsWith("http://") ||
        src.startsWith("https://") ||
        src.startsWith("data:image/") ||
        src.startsWith("/images/") ||
        src.startsWith("/uploads/")),
  );
  const imageSrc = canRender ? src ?? undefined : undefined;

  if (!imageSrc || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-emerald-50 text-emerald-700 ${className}`}
        aria-label={`${name} project image unavailable`}
      >
        <FolderKanban size={24} />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={imageSrc}
      alt=""
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
