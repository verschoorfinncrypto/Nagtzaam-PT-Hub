"use client";

import { useState } from "react";
import { embedUrl, videoHref } from "@/lib/video";

/** ▶ Uitlegvideo: speelt een vaste YouTube/Vimeo-video direct af in de pagina; anders opent hij YouTube-zoekresultaten. */
export function VideoButton({ name, videoUrl }: { name: string; videoUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  const embed = embedUrl(videoUrl);
  if (!embed) {
    return (
      <a className="video-link" href={videoHref(name, videoUrl)} target="_blank" rel="noopener noreferrer">
        ▶ Uitlegvideo{videoUrl ? "" : " zoeken"}
      </a>
    );
  }
  return (
    <span className="video-wrap">
      <button type="button" className="video-link video-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "■ Video sluiten" : "▶ Bekijk video"}
      </button>
      {open && (
        <span className="video-frame">
          <iframe
            src={embed}
            title={`Uitlegvideo ${name}`}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </span>
      )}
    </span>
  );
}
