/** Link naar de uitlegvideo van een oefening: de vaste video als die is ingesteld, anders YouTube-zoekresultaten. */
export function videoHref(name: string, videoUrl?: string | null) {
  if (videoUrl) return videoUrl;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} oefening uitleg`)}`;
}

/** Alleen http(s)-links; geeft een opgeschoonde URL of null. */
export function cleanVideoUrl(raw: string) {
  const v = raw.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Ingesloten speler voor YouTube/Vimeo-links; null als de link geen herkenbare video is. */
export function embedUrl(videoUrl?: string | null) {
  if (!videoUrl) return null;
  try {
    const u = new URL(videoUrl);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host.endsWith("youtube.com") || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else {
        const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
        id = m?.[1] ?? null;
      }
    }
    if (id && /^[\w-]{6,20}$/.test(id)) {
      const t = u.searchParams.get("t") ?? u.searchParams.get("start");
      const start = t ? parseInt(t, 10) : 0;
      return `https://www.youtube-nocookie.com/embed/${id}?rel=0${start > 0 ? `&start=${start}` : ""}`;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const m = u.pathname.match(/(\d{6,})/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
  } catch {
    /* geen geldige URL */
  }
  return null;
}
