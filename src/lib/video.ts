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
