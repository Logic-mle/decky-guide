import { GuideResultContent } from "./GuideResultContent";
import { ArticleReader } from "./ArticleReader";
import type { Article, Chapter, ContentBlock } from "./article-types";
import { readProgress } from "./reading-state";
import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  Router,
  Spinner,
  TextField,
  staticClasses,
} from "@decky/ui";
import { definePlugin, fetchNoCors } from "@decky/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaBookOpen, FaSearch } from "react-icons/fa";

type GuideResult = {
  title: string;
  url: string;
  summary: string;
  date: string;
};

type SearchResponse = {
  query: string;
  appid: string;
  results: GuideResult[];
  cached: boolean;
};

type NameSource = "manual" | "cache" | "steam-cn" | "gamersky" | "steam";

type NameCandidate = {
  name: string;
  source: NameSource;
};

const REQUEST_TIMEOUT_MS = 12000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const ALIAS_KEY = "decky-gamersky-guides.aliases.v1";
const RESOLVED_NAME_KEY = "decky-gamersky-guides.resolved-names.v1";
const RESOLVED_NAME_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const responseCache = new Map<string, { at: number; value: unknown }>();

function safeUrl(value: string, base = "https://www.gamersky.com/") {
  const url = new URL(value, base);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("不支持的链接协议");
  if (host !== "gamersky.com" && !host.endsWith(".gamersky.com")) throw new Error("仅允许游民星空链接");
  url.hash = "";
  return url.toString();
}

function safeFetchUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const isGamersky = host === "gamersky.com" || host.endsWith(".gamersky.com");
  const isSteamStore = host === "store.steampowered.com";
  if (url.protocol !== "https:") throw new Error("远程请求必须使用 HTTPS");
  if (!isGamersky && !isSteamStore) throw new Error("不允许访问该远程地址");
  return url.toString();
}

async function fetchText(url: string, timeout = REQUEST_TIMEOUT_MS) {
  const cleanUrl = safeFetchUrl(url);
  const controller = new AbortController();
  let timer = 0;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => {
      controller.abort();
      reject(new Error(`请求超过 ${Math.round(timeout / 1000)} 秒`));
    }, timeout);
  });
  try {
    const response = await Promise.race([
      fetchNoCors(cleanUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.5",
        },
      }),
      timeoutPromise,
    ]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { text: await response.text(), finalUrl: response.url || cleanUrl, status: response.status };
  } finally {
    window.clearTimeout(timer);
  }
}

function documentFrom(text: string) {
  return new DOMParser().parseFromString(text, "text/html");
}

function guideFromLink(link: HTMLAnchorElement, root: ParentNode): GuideResult | null {
  try {
    const row = link.closest("li") || root;
    return {
      title: (link.textContent || "").trim(),
      url: safeUrl(link.getAttribute("href") || ""),
      summary: (row.querySelector(".con")?.textContent || "").replace(/\s+/g, " ").trim(),
      date: (row.querySelector(".time")?.textContent || "").trim(),
    };
  } catch {
    return null;
  }
}

function parseSearchDocument(text: string, fallback = false) {
  const doc = documentFrom(text);
  const selector = fallback
    ? '[data-search-section="guide"] a[href*="/handbook/"]'
    : 'ul.search-handbook-list .t2 a[href*="/handbook/"]';
  const seen = new Set<string>();
  return Array.from(doc.querySelectorAll<HTMLAnchorElement>(selector))
    .map((link) => guideFromLink(link, doc))
    .filter((item): item is GuideResult => Boolean(item?.title && item.url))
    .filter((item) => !seen.has(item.url) && Boolean(seen.add(item.url)))
    .slice(0, 30);
}

async function searchGuides(query: string, appid: string): Promise<SearchResponse> {
  const clean = query.trim().slice(0, 100);
  if (!clean) throw new Error("请输入游戏名");
  const cacheKey = `search:${clean.toLocaleLowerCase()}`;
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { query: clean, appid, results: cached.value as GuideResult[], cached: true };
  }
  const params = new URLSearchParams({ s: clean, type: "hot", sort: "des", post: "0" });
  const primaryUrl = `https://so.gamersky.com/all/handbook?${params}`;
  const primary = await fetchText(primaryUrl);
  let results = parseSearchDocument(primary.text);
  if (!results.length) {
    const fallback = await fetchText(`https://so.gamersky.com/?${params}`);
    results = parseSearchDocument(fallback.text, true);
  }
  responseCache.set(cacheKey, { at: Date.now(), value: results });
  return { query: clean, appid, results, cached: false };
}

function parseArticleDocument(text: string, url: string): Article {
  const doc = documentFrom(text);
  const content = doc.querySelector<HTMLElement>(".Mid2L_con");
  if (!content) throw new Error("未识别到攻略正文，页面结构可能已更新");
  const pageTitle = (content.querySelector(".post_ding_top p")?.textContent || "").trim();
  const clone = content.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(
    ".post_ding_top,.referencecontent,.blockreference,.gs_nc_editor,.pagecss,.Content_Paging,script,style",
  ).forEach((node) => node.remove());

  const blocks: ContentBlock[] = [];
  for (const element of Array.from(clone.children)) {
    const tag = element.tagName.toLowerCase();
    if (element.classList.contains("GsWeTxt1") || ["h2", "h3", "h4"].includes(tag)) {
      const value = (element.textContent || "").replace(/\s+/g, " ").trim();
      if (value) blocks.push({ type: "heading", text: value });
      continue;
    }
    if (tag !== "p") continue;
    const value = (element.textContent || "").replace(/[ \t]+/g, " ").trim();
    if (value) blocks.push({ type: "text", text: value });
    for (const image of Array.from(element.querySelectorAll<HTMLImageElement>("img"))) {
      const source = image.dataset.src || image.getAttribute("src") || "";
      if (!source || source.includes("blank.png") || source.includes("loading.gif")) continue;
      try {
        blocks.push({ type: "image", url: safeUrl(source, url).replace(/^http:/, "https:"), alt: image.alt || "攻略图片" });
      } catch { /* ignore off-site advertisements */ }
    }
    if (blocks.length >= 250) break;
  }

  const chapters: Chapter[] = Array.from(doc.querySelectorAll(".Content_Paging li"))
    .map((item) => {
      const link = item.querySelector<HTMLAnchorElement>("a[href]");
      const chapterUrl = link ? safeUrl(link.getAttribute("href") || "", url) : url;
      return { title: (item.textContent || "").trim(), url: chapterUrl, current: chapterUrl === url };
    })
    .filter((item) => item.title)
    .slice(0, 200);

  let previousUrl: string | null = null;
  let nextUrl: string | null = null;
  for (const link of Array.from(doc.querySelectorAll<HTMLAnchorElement>(".page_css a[href]"))) {
    const label = (link.textContent || "").trim();
    if (label === "上一页") previousUrl = safeUrl(link.getAttribute("href") || "", url);
    if (label === "下一页") nextUrl = safeUrl(link.getAttribute("href") || "", url);
  }
  return {
    title: (doc.querySelector("h1")?.textContent || pageTitle || "游民星空攻略").trim(),
    page_title: pageTitle,
    url,
    blocks,
    chapters,
    previous_url: previousUrl,
    next_url: nextUrl,
  };
}

async function loadArticle(url: string): Promise<Article> {
  const clean = safeUrl(url);
  const cacheKey = `article:${clean}`;
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value as Article;
  const response = await fetchText(clean);
  const article = parseArticleDocument(response.text, clean);
  responseCache.set(cacheKey, { at: Date.now(), value: article });
  return article;
}

function readAliases(): Record<string, string> {
  try { return JSON.parse(window.localStorage.getItem(ALIAS_KEY) || "{}"); } catch { return {}; }
}

async function getAlias(appid: string) { return readAliases()[appid] || ""; }
async function saveAlias(appid: string, alias: string) {
  if (!appid) return false;
  const aliases = readAliases();
  aliases[appid] = alias.trim().slice(0, 100);
  window.localStorage.setItem(ALIAS_KEY, JSON.stringify(aliases));
  return true;
}

type ResolvedNameRecord = Record<string, { name: string; at: number }>;

function readResolvedNames(): ResolvedNameRecord {
  try { return JSON.parse(window.localStorage.getItem(RESOLVED_NAME_KEY) || "{}"); } catch { return {}; }
}

function cachedResolvedName(appid: string) {
  const item = readResolvedNames()[appid];
  if (!item || !item.name || Date.now() - item.at > RESOLVED_NAME_TTL_MS) return "";
  return item.name;
}

function saveResolvedName(appid: string, name: string) {
  if (!appid || !name.trim()) return;
  const resolved = readResolvedNames();
  resolved[appid] = { name: name.trim().slice(0, 100), at: Date.now() };
  window.localStorage.setItem(RESOLVED_NAME_KEY, JSON.stringify(resolved));
}

function containsChinese(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
}

async function steamChineseName(appid: string) {
  if (!/^\d+$/.test(appid)) return "";
  const params = new URLSearchParams({ appids: appid, l: "schinese", cc: "cn" });
  const response = await fetchText(`https://store.steampowered.com/api/appdetails?${params}`, 8000);
  const payload = JSON.parse(response.text) as Record<string, { success?: boolean; data?: { name?: string } }>;
  const name = payload[appid]?.data?.name?.trim() || "";
  return containsChinese(name) ? name.slice(0, 100) : "";
}

async function gamerskyChineseName(name: string) {
  const params = new URLSearchParams({ s: name.trim().slice(0, 100), type: "hot", sort: "des", post: "0" });
  const response = await fetchText(`https://so.gamersky.com/?${params}`, 8000);
  const doc = documentFrom(response.text);
  const images = doc.querySelectorAll<HTMLImageElement>(
    '[data-search-section="zone"] img[title], ul.search-game-grid img[title]',
  );
  for (const image of Array.from(images)) {
    const title = (image.getAttribute("title") || "").replace(/\s+/g, " ").trim();
    if (containsChinese(title)) return title.slice(0, 100);
  }
  return "";
}

function sourceLabel(source: NameSource) {
  switch (source) {
    case "manual": return "手动记忆名称";
    case "cache": return "已缓存的中文匹配";
    case "steam-cn": return "Steam 商店简中名";
    case "gamersky": return "游民星空名称匹配";
    default: return "Steam 当前名称";
  }
}

const muted = { color: "rgba(255,255,255,.62)", fontSize: 12, lineHeight: 1.35 };
const card = {
  background: "rgba(255,255,255,.055)",
  borderRadius: 8,
  padding: "10px 11px",
  marginBottom: 8,
} as const;

function currentGame(): { appid: string; name: string } | null {
  const app = Router.MainRunningApp;
  if (!app) return null;
  return { appid: String(app.appid), name: app.display_name || app.sort_as || "" };
}

function useRunningGame() {
  const [game, setGame] = useState(currentGame);
  useEffect(() => {
    const update = () => {
      const next = currentGame();
      setGame((old) =>
        old?.appid === next?.appid && old?.name === next?.name ? old : next,
      );
    };
    update();
    const timer = window.setInterval(update, 1500);
    return () => window.clearInterval(timer);
  }, []);
  return game;
}

function Busy({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

function Content() {
  const game = useRunningGame();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GuideResult[]>([]);
  const [searchedFor, setSearchedFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [articleUrl, setArticleUrl] = useState<string | null>(null);
  const [matchedBy, setMatchedBy] = useState("");
  const searchRequest = useRef(0);
  const progressKey = game?.appid ? `game:${game.appid}` : "manual";
  const progress = readProgress(window.localStorage, progressKey);

  const runSearch = useCallback(async (keyword: string, appid = "", remember = false) => {
    const clean = keyword.trim();
    if (!clean) return;
    const request = ++searchRequest.current;
    setLoading(true);
    setError("");
    setArticleUrl(null);
    try {
      if (remember && appid) await saveAlias(appid, clean);
      const response = await searchGuides(clean, appid);
      if (request !== searchRequest.current) return;
      setResults(response.results);
      setSearchedFor(response.query);
      setMatchedBy(remember ? sourceLabel("manual") : "");
    } catch (e) {
      if (request !== searchRequest.current) return;
      setError(e instanceof Error ? e.message : String(e));
      setResults([]);
    } finally {
      if (request === searchRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const request = ++searchRequest.current;
    setArticleUrl(null);
    if (!game) {
      setLoading(false);
      setError("");
      setQuery("");
      setResults([]);
      setSearchedFor("");
      setMatchedBy("");
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      setArticleUrl(null);
      setResults([]);
      setSearchedFor("");
      setMatchedBy("");

      const alias = await getAlias(game.appid);
      const attemptedNames = new Set<string>();
      const outcome: {
        response: SearchResponse | null;
        candidate: NameCandidate | null;
        error: string;
      } = { response: null, candidate: null, error: "" };

      const attempt = async (name: string, source: NameSource) => {
        const clean = name.trim().slice(0, 100);
        const key = clean.toLocaleLowerCase();
        if (!clean || attemptedNames.has(key)) return false;
        attemptedNames.add(key);
        const candidate = { name: clean, source } satisfies NameCandidate;
        try {
          const response = await searchGuides(candidate.name, game.appid);
          outcome.response = response;
          outcome.candidate = candidate;
          if (!response.results.length) return false;
          if (cancelled || request !== searchRequest.current) return true;
          setQuery(candidate.name);
          setResults(response.results);
          setSearchedFor(response.query);
          setMatchedBy(sourceLabel(candidate.source));
          if (candidate.source !== "manual" && candidate.source !== "steam") {
            saveResolvedName(game.appid, candidate.name);
          }
          setLoading(false);
          return true;
        } catch (e) {
          outcome.error = e instanceof Error ? e.message : String(e);
          return false;
        }
      };

      if (alias) {
        await attempt(alias, "manual");
      } else {
        if (await attempt(cachedResolvedName(game.appid), "cache")) return;
        if (cancelled || request !== searchRequest.current) return;
        try {
          if (await attempt(await steamChineseName(game.appid), "steam-cn")) return;
        } catch { /* continue with other sources */ }
        if (cancelled || request !== searchRequest.current) return;
        try {
          if (await attempt(await gamerskyChineseName(game.name), "gamersky")) return;
        } catch { /* continue with Steam name */ }
        if (cancelled || request !== searchRequest.current) return;
        await attempt(game.name, "steam");
      }

      if (cancelled || request !== searchRequest.current) return;
      const fallbackName = outcome.response?.query || game.name;
      setQuery(fallbackName);
      setResults(outcome.response?.results || []);
      setSearchedFor(fallbackName);
      setMatchedBy(sourceLabel(outcome.candidate?.source || "steam"));
      if (!outcome.response && outcome.error) setError(outcome.error);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [game?.appid, game?.name]);

  const status = useMemo(() => {
    if (!game) return "未检测到正在运行的游戏，可手动输入游戏名搜索。";
    return `当前游戏：${game.name}  ·  AppID ${game.appid}`;
  }, [game]);

  if (articleUrl) return <ArticleReader key={progressKey} initialUrl={articleUrl} progressKey={progressKey} loadArticle={loadArticle} onBack={() => setArticleUrl(null)} />;

  return (
    <PanelSection title="当前游戏攻略">
      <div style={{ ...muted, padding: "0 4px 9px" }}>{status}</div>
      {progress && <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => setArticleUrl(progress.url)}>
          <div style={{ textAlign: "left", whiteSpace: "normal", overflowWrap: "anywhere" }}>
            <div style={{ color: "inherit", opacity: .8, fontSize: 12, marginBottom: 5 }}>继续阅读</div>
            <div style={{ fontWeight: 650, lineHeight: 1.45 }}>{progress.title}</div>
            <div style={{ color: "inherit", opacity: .75, fontSize: 12, lineHeight: 1.4, marginTop: 5 }}>{progress.chapter || "已保存上次阅读位置"}</div>
          </div>
        </ButtonItem>
      </PanelSectionRow>}
      <PanelSectionRow>
        <TextField
          label="搜索关键词 / 中文游戏名"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setMatchedBy("");
          }}
        />
      </PanelSectionRow>
      {matchedBy && (
        <div style={{ ...muted, padding: "0 4px 7px" }}>名称来源：{matchedBy}</div>
      )}
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={() => void runSearch(query, game?.appid || "", Boolean(game))}
        >
          <FaSearch style={{ marginRight: 8 }} /> 搜索并记住匹配
        </ButtonItem>
      </PanelSectionRow>

      {loading && <Busy label="正在搜索游民星空…" />}
      {error && <div style={{ ...card, color: "#ffb4ab" }}>搜索失败：{error}</div>}
      {!loading && searchedFor && (
        <div style={{ ...muted, padding: "5px 4px 9px" }}>
          “{searchedFor}”找到 {results.length} 篇攻略
        </div>
      )}
      {!loading && results.map((guide) => (
        <PanelSectionRow key={guide.url}>
          <ButtonItem layout="below" onClick={() => setArticleUrl(guide.url)}>
            <GuideResultContent result={guide} />
          </ButtonItem>
        </PanelSectionRow>
      ))}
    </PanelSection>
  );
}

export default definePlugin(() => ({
  name: "Decky Guide",
  titleView: <div className={staticClasses.Title}>Decky Guide</div>,
  content: <Content />,
  icon: <FaBookOpen />,
  alwaysRender: true,
  onDismount() {},
}));
