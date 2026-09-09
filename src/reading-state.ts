export type ReadingPosition = { block: number; fraction: number };
export type ReadingProgress = {
  url: string;
  title: string;
  chapter: string;
  position: ReadingPosition;
  updatedAt: number;
};

const PROGRESS_KEY = "decky-guide.reading.v1";
const FONT_KEY = "decky-guide.font-size.v1";
export const FONT_SIZES = [14, 16, 18] as const;

export function readProgress(storage: Pick<Storage, "getItem">, key: string): ReadingProgress | null {
  try {
    const item = JSON.parse(storage.getItem(PROGRESS_KEY) || "{}")[key];
    if (!item || typeof item.url !== "string" || typeof item.title !== "string" ||
        typeof item.chapter !== "string" || !Number.isFinite(item.updatedAt) ||
        !Number.isInteger(item.position?.block) || item.position.block < 0 ||
        !Number.isFinite(item.position.fraction) || item.position.fraction < 0 || item.position.fraction > 1) return null;
    const url = new URL(item.url);
    if (url.protocol !== "https:" || !/(^|\.)gamersky\.com$/.test(url.hostname)) return null;
    return item;
  } catch { return null; }
}

export function writeProgress(storage: Pick<Storage, "getItem" | "setItem">, key: string, value: ReadingProgress) {
  try {
    let records: Record<string, ReadingProgress> = {};
    try {
      const parsed = JSON.parse(storage.getItem(PROGRESS_KEY) || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) records = parsed;
    } catch { /* replace malformed data */ }
    records[key] = value;
    const recent = Object.entries(records).sort((a, b) => (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0)).slice(0, 100);
    storage.setItem(PROGRESS_KEY, JSON.stringify(Object.fromEntries(recent)));
    return true;
  } catch { return false; }
}

export function readFontSize(storage: Pick<Storage, "getItem">): number {
  try {
    const size = Number(storage.getItem(FONT_KEY));
    return FONT_SIZES.some((value) => value === size) ? size : 14;
  } catch { return 14; }
}

export function writeFontSize(storage: Pick<Storage, "setItem">, size: number) {
  try { storage.setItem(FONT_KEY, String(size)); } catch { /* keep session preference */ }
}

export function filterChapters<T extends { title: string }>(chapters: T[], query: string): T[] {
  const words = query.normalize("NFKC").trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return chapters.filter(({ title }) => words.every((word) => title.normalize("NFKC").toLocaleLowerCase().includes(word)));
}
