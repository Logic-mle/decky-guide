import {
  Focusable, GamepadButton, ModalRoot, Navigation, NavEntryPositionPreferences,
  PanelSection, Spinner, TextField, showModal,
} from "@decky/ui";
import type { GamepadEvent } from "@decky/ui";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Article } from "./article-types";
import {
  FONT_SIZES, filterChapters, readFontSize, readProgress, writeFontSize, writeProgress,
} from "./reading-state";
import { findPageScroller, scrollViewportTop } from "./reader-scroll";
import type { ReadingPosition } from "./reading-state";

export const readerCSS = `
.dg-reader, .dg-reader * { box-sizing: border-box; }
.dg-reader { color: #f1f4f8; font-size: 14px; font-weight:400; line-height: 1.5; overflow-wrap: anywhere; }
.dg-reader .dg-action { display:flex; align-items:center; justify-content:center; gap:6px; min-width:0; min-height:30px; padding:5px 8px; border:1px solid rgba(255,255,255,.13); border-radius:7px; background:#293645; color:#f1f4f8; font:inherit; line-height:1.35; cursor:pointer; white-space:normal; text-align:center; }
.dg-reader .dg-action.dg-focus, .dg-reader .dg-action:focus-visible,
.dg-reader .dg-body.dg-focus, .dg-reader .dg-body:focus-visible { outline:2px solid #8dccff; outline-offset:-2px; background-color:#344b61; }
.dg-reader .dg-body.dg-focus, .dg-reader .dg-body:focus-visible { background-color:transparent; }
.dg-reader .dg-action[aria-disabled="true"] { opacity:.38; cursor:default; }
.dg-reader .dg-action:active:not([aria-disabled="true"]) { background:#405970; }
.dg-reader .dg-action[aria-pressed="true"], .dg-reader .dg-action[aria-current="page"] { background:#214f75; border-color:#63b8f5; }
.dg-reader .dg-muted { color:#aebcca; font-size:12px; line-height:1.5; }
.dg-reader .dg-row { display:flex; gap:6px; min-width:0; }
.dg-reader .dg-row > * { flex:1; min-width:0; }
.dg-reader .dg-body { padding:0; }
.dg-reader .dg-tool-panel { position:absolute; top:100%; left:0; right:0; max-height:60vh; overflow-y:auto; box-shadow:0 8px 18px #0008; }
.dg-reader .dg-block { scroll-margin-top:48px; }
.dg-reader .dg-image-viewport { overflow:auto; overscroll-behavior:contain; border-radius:6px; }
.dg-reader .dg-block.dg-focus, .dg-reader .dg-block:focus-visible { outline:none; box-shadow:inset 2px 0 #8dccff; background:rgba(141,204,255,.06); }
.dg-reader .dg-block { margin:7px 0; white-space:pre-wrap; overflow-wrap:anywhere; }
.dg-reader .dg-heading { margin:14px 0 6px; font-weight:700; line-height:1.5; color:#fff; }
.dg-reader .dg-heading:first-child { margin-top:0; }
.dg-reader .dg-image { display:block; width:100%; padding:0; border:0; border-radius:6px; overflow:hidden; background:#131c26; color:#aebcca; font:inherit; cursor:zoom-in; }
.dg-reader .dg-image img { display:block; width:100%; height:auto; min-height:80px; object-fit:contain; }
.dg-reader .dg-image span { display:block; padding:5px 8px; font-size:11px; }
.dg-reader .dg-chapter { justify-content:flex-start; text-align:left; align-items:flex-start; width:100%; margin-bottom:5px; }
.dg-reader .dg-chapter-number { flex:0 0 26px; font-size:12px; color:#aebcca; padding-top:1px; font-variant-numeric:tabular-nums; }
.dg-reader .dg-error { padding:9px; border-radius:6px; background:#442f34; color:#ffd2cb; font-size:12px; }
`;

function Action({ children, onClick, disabled, style, ...rest }: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  "aria-pressed"?: boolean;
  "aria-expanded"?: boolean;
  "aria-label"?: string;
}) {
  return <Focusable
    role="button" tabIndex={disabled ? -1 : 0} className="dg-action" focusClassName="dg-focus"
    aria-disabled={disabled || undefined} style={style} onOKActionDescription="选择"
    onActivate={() => { if (!disabled) onClick(); }}
    {...rest}
  >{children}</Focusable>;
}

function stop(event: GamepadEvent | CustomEvent) {
  event.preventDefault();
  event.stopPropagation();
}

function focusElement(element: HTMLElement | null) {
  element?.focus({ preventScroll: true });
}

function ImageViewer({ url, alt, closeModal, onClosed }: { url: string; alt: string; closeModal?: () => void; onClosed: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const close = () => { closeModal?.(); requestAnimationFrame(onClosed); };
  useEffect(() => { focusElement(viewport.current); }, []);
  return <ModalRoot onCancel={close} closeModal={close} onEscKeypress={close} bAllowFullSize>
    <style>{readerCSS}</style>
    <div className="dg-reader" style={{ width: "min(880px, 88vw)", maxWidth: "100%", padding: 8 }}>
      <div style={{ fontWeight: 650, marginBottom: 8 }}>攻略图片</div>
      <Focusable flow-children="row" className="dg-row" style={{ marginBottom: 10 }}>
        <Action onClick={() => setZoom((value) => value === 1 ? 2 : 1)}>{zoom === 1 ? "放大至 200%" : "适应窗口"}</Action>
        <Action onClick={close}>返回正文</Action>
      </Focusable>
      {failed && <div className="dg-error">图片加载失败。<Action onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>重新加载图片</Action></div>}
      <Focusable
        ref={viewport} tabIndex={0} className="dg-image-viewport" focusClassName="dg-focus"
        style={{ height: "55vh", background: "#0d141c" }}
        onOKActionDescription={failed ? "重新加载图片" : "缩放"} onCancelActionDescription="返回正文"
        onActivate={() => {
          if (failed) { setFailed(false); setAttempt((value) => value + 1); }
          else setZoom((value) => value === 1 ? 2 : 1);
        }}

      >
        <img key={attempt} src={url} alt={alt} referrerPolicy="no-referrer" onError={() => setFailed(true)}
          style={{ display: failed ? "none" : "block", width: `${zoom * 100}%`, maxWidth: "none", height: zoom === 1 ? "100%" : "auto", objectFit: "contain" }} />
      </Focusable>
      {zoom > 1 && <Focusable flow-children="row" className="dg-row" style={{ marginTop: 8 }}>
        <Action aria-label="图片向左移动" onClick={() => viewport.current?.scrollBy(-160, 0)}>←</Action>
        <Action aria-label="图片向上移动" onClick={() => viewport.current?.scrollBy(0, -160)}>↑</Action>
        <Action aria-label="图片向下移动" onClick={() => viewport.current?.scrollBy(0, 160)}>↓</Action>
        <Action aria-label="图片向右移动" onClick={() => viewport.current?.scrollBy(160, 0)}>→</Action>
      </Focusable>}
    </div>
  </ModalRoot>;
}

function GuideImage({ url, alt, onOpen }: { url: string; alt: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <Focusable role="button" className="dg-image dg-block" focusClassName="dg-focus" tabIndex={0} onOKActionDescription={failed ? "重试图片" : "放大图片"} aria-label={failed ? "图片加载失败，点击重试" : `放大图片：${alt}`}
    onActivate={() => {
      if (failed) { setFailed(false); setAttempt((value) => value + 1); }
      else onOpen();
    }}>
    {failed ? <span>图片加载失败 · 点击重试</span> : <>
      <img key={attempt} src={url} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      <span>点击放大</span>
    </>}
  </Focusable>;
}

export function ArticleReader({ initialUrl, progressKey, loadArticle, onBack }: {
  initialUrl: string;
  progressKey: string;
  loadArticle: (url: string) => Promise<Article>;
  onBack: () => void;
}) {
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chapterQuery, setChapterQuery] = useState("");
  const [fontSize, setFontSize] = useState(() => readFontSize(window.localStorage));
  const [storageFailed, setStorageFailed] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const bodyContent = useRef<HTMLDivElement>(null);
  const pageScroller = useRef<HTMLElement | null>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const readingTools = useRef<HTMLDivElement>(null);
  const toolFocus = useRef<{ tool: "chapters" | "settings"; opening: boolean } | null>(null);
  const request = useRef(0);
  const failedUrl = useRef(initialUrl);
  const position = useRef<ReadingPosition>({ block: 0, fraction: 0 });
  const restoring = useRef(false);
  const pendingRestore = useRef<ReadingPosition | null>(null);
  const activeArticle = useRef<Article | null>(null);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modal = useRef<ReturnType<typeof showModal> | null>(null);
  const scrollFrame = useRef(0);
  const heldShoulder = useRef(0);
  const stopScrolling = useCallback(() => {
    heldShoulder.current = 0;
    cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = 0;
  }, []);
  useEffect(() => {
    window.addEventListener("blur", stopScrolling);
    document.addEventListener("visibilitychange", stopScrolling);
    return () => {
      stopScrolling();
      window.removeEventListener("blur", stopScrolling);
      document.removeEventListener("visibilitychange", stopScrolling);
    };
  }, [stopScrolling]);

  const save = useCallback(() => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    const current = activeArticle.current;
    if (!current) return;
    const ok = writeProgress(window.localStorage, progressKey, {
      url: current.url, title: current.title, chapter: current.page_title,
      position: position.current, updatedAt: Date.now(),
    });
    if (!ok) setStorageFailed(true);
  }, [progressKey]);

  const capture = useCallback(() => {
    if (restoring.current || !body.current || !bodyContent.current || body.current.clientHeight === 0) return;
    const elements = Array.from(bodyContent.current.children) as HTMLElement[];
    const top = pageScroller.current ? scrollViewportTop(pageScroller.current) + (readingTools.current?.offsetHeight || 0) : 0;
    const index = elements.findIndex((element) => element.getBoundingClientRect().bottom > top);
    const element = elements[index];
    if (element) {
      const rect = element.getBoundingClientRect();
      position.current = { block: index, fraction: Math.max(0, Math.min(1, (top - rect.top) / Math.max(1, rect.height))) };
    }
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(save, 350);
  }, [save]);

  const restore = useCallback(() => {
    const target = pendingRestore.current;
    const viewport = pageScroller.current;
    if (!target || !viewport || !bodyContent.current || !viewport.clientHeight) return;

    if (target.block === 0 && target.fraction === 0) {
      const reader = body.current?.closest<HTMLElement>(".dg-reader");
      if (reader) viewport.scrollTop += reader.getBoundingClientRect().top - scrollViewportTop(viewport);
      return;
    }
    const blocks = bodyContent.current.children;
    const element = blocks[Math.min(target.block, blocks.length - 1)] as HTMLElement | undefined;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    viewport.scrollTop += rect.top - scrollViewportTop(viewport) - (readingTools.current?.offsetHeight || 0) + rect.height * target.fraction;
  }, []);

  const interact = useCallback(() => { restoring.current = false; pendingRestore.current = null; }, []);

  const open = useCallback(async (url: string, resume = false) => {
    stopScrolling();
    save();
    const id = ++request.current;
    failedUrl.current = url;
    setChaptersOpen(false);
    setSettingsOpen(false);
    setLoading(true);
    setError("");
    try {
      const next = await loadArticle(url);
      if (id !== request.current) return;
      const saved = resume ? readProgress(window.localStorage, progressKey) : null;
      position.current = saved?.url === next.url ? saved.position : { block: 0, fraction: 0 };
      pendingRestore.current = position.current;
      restoring.current = true;
      activeArticle.current = next;
      setArticle(next);
      setChapterQuery("");
      save();
    } catch (e) {
      if (id === request.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [loadArticle, progressKey, save, stopScrolling]);

  useEffect(() => {
    void open(initialUrl, true);
    const persist = () => save();
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", persist);
    return () => {
      ++request.current;
      save();
      modal.current?.Close();
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", persist);
    };
  }, [initialUrl, open, save]);

  useLayoutEffect(() => {
    if (loading || !article) return;
    const scroller = findPageScroller(body.current!);
    pageScroller.current = scroller;
    const target = bodyContent.current?.children[position.current.block] as HTMLElement | undefined;
    focusElement(target?.querySelector<HTMLElement>("[tabindex]") || target || null);
    restore();
    const scrollTarget = scroller === document.scrollingElement ? window : scroller;
    scrollTarget.addEventListener("scroll", capture);
    const inputs = ["wheel", "touchstart", "pointerdown", "keydown"];
    inputs.forEach((name) => scroller.addEventListener(name, interact, { passive: true }));
    const observer = new ResizeObserver(restore);
    if (bodyContent.current) observer.observe(bodyContent.current);
    return () => { observer.disconnect(); scrollTarget.removeEventListener("scroll", capture); inputs.forEach((name) => scroller.removeEventListener(name, interact)); };
  }, [article, loading, restore, capture, interact]);

  useLayoutEffect(() => { restore(); }, [fontSize, chaptersOpen, settingsOpen, restore]);

  const closeDirectory = () => {
    setChaptersOpen(false);
    requestAnimationFrame(() => focusElement(toolbar.current?.querySelector<HTMLElement>("[role=button]") || null));
  };
  const back = () => { save(); onBack(); };
  const viewImage = (url: string, alt: string) => {
    stopScrolling();
    save();
    const returnFocus = document.activeElement as HTMLElement | null;
    modal.current = showModal(<ImageViewer url={url} alt={alt} onClosed={() => focusElement(returnFocus?.isConnected ? returnFocus : toolbar.current?.querySelector<HTMLElement>("[role=button]") || null)} />, undefined, {
      strTitle: "Decky Guide · 攻略图片", bNeverPopOut: true,
    });
  };
  const changeFont = (size: number) => {
    capture();
    pendingRestore.current = position.current;
    restoring.current = true;
    setFontSize(size);
    writeFontSize(window.localStorage, size);
  };
  const toggleTool = (tool: "chapters" | "settings", moveFocus = false) => {
    if (loading || !article || (tool === "chapters" && article.chapters.length <= 1)) return;
    stopScrolling();
    capture();
    const opening = tool === "chapters" ? !chaptersOpen : !settingsOpen;
    setChaptersOpen(tool === "chapters" && opening);
    setSettingsOpen(tool === "settings" && opening);
    if (moveFocus) toolFocus.current = { tool, opening };
  };
  useLayoutEffect(() => {
      if (!toolFocus.current) return;
      const { tool, opening } = toolFocus.current;
      toolFocus.current = null;
      const panel = readingTools.current?.querySelector<HTMLElement>(".dg-tool-panel");
      const target = opening
        ? panel?.querySelector<HTMLElement>('[aria-current="page"], [aria-pressed="true"]') || panel?.querySelector<HTMLElement>('[role="button"], input')
        : toolbar.current?.querySelectorAll<HTMLElement>('[role="button"]')[tool === "chapters" ? 0 : 1];
      focusElement(target || null);
  }, [chaptersOpen, settingsOpen]);
  const filtered = filterChapters(article?.chapters || [], chapterQuery);
  const chapterIndex = article?.chapters.findIndex((chapter) => chapter.current) ?? -1;

  return <PanelSection>
    <style>{readerCSS}</style>
    <Focusable className="dg-reader" flow-children="column" style={{ minWidth: 0 }}
      onWheel={interact} onTouchStart={interact} onPointerDown={interact} onKeyDown={interact}
      onCancel={(event) => { stop(event); if (chaptersOpen) closeDirectory(); else if (settingsOpen) { setSettingsOpen(false); requestAnimationFrame(() => focusElement(toolbar.current?.querySelectorAll<HTMLElement>("[role=button]")[1] || null)); } else back(); }}
      onCancelActionDescription={chaptersOpen ? "收起目录" : settingsOpen ? "收起设置" : "返回结果"}
      onSecondaryActionDescription={chaptersOpen ? "收起目录" : "章节目录"}
      onOptionsActionDescription={settingsOpen ? "收起设置" : "阅读设置"}
      onButtonDown={(event) => {
        interact();
        if (event.detail.button === GamepadButton.SECONDARY || event.detail.button === GamepadButton.OPTIONS) {
          stop(event);
          if (!event.detail.is_repeat) toggleTool(event.detail.button === GamepadButton.SECONDARY ? "chapters" : "settings", true);
          return;
        }
        const direction = event.detail.button === GamepadButton.BUMPER_LEFT ? -1 : event.detail.button === GamepadButton.BUMPER_RIGHT ? 1 : 0;
        if (!direction) return;
        stop(event);
        if (loading || chaptersOpen || settingsOpen || !article) return;
        const scroller = pageScroller.current;
        if (!scroller) return;
        heldShoulder.current = direction;
        if (scrollFrame.current) return;
        let previousTime = performance.now();
        const tick = (time: number) => {
          const elapsed = Math.min(50, time - previousTime);
          previousTime = time;
          scroller.scrollTop += heldShoulder.current * 360 * elapsed / 1000;
          if (heldShoulder.current) scrollFrame.current = requestAnimationFrame(tick);
          else scrollFrame.current = 0;
        };
        scrollFrame.current = requestAnimationFrame(tick);
      }}
      onButtonUp={(event) => {
        const direction = event.detail.button === GamepadButton.BUMPER_LEFT ? -1 : event.detail.button === GamepadButton.BUMPER_RIGHT ? 1 : 0;
        if (!direction) return;
        stop(event);
        if (direction !== heldShoulder.current) return;
        stopScrolling();
        capture();

      }}
    >
      <Action onClick={back} style={{ minHeight: 32, justifyContent: "flex-start", background: "transparent" }}>‹ 返回搜索结果</Action>
      {article && <header style={{ margin: "8px 0" }}>
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4 }} title={article.title}>{article.title}</div>
        <div className="dg-muted" style={{ marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {chapterIndex >= 0 && <span style={{ color: "#8dccff", fontVariantNumeric: "tabular-nums" }}>{chapterIndex + 1} / {article.chapters.length} · </span>}{article.page_title || "攻略正文"}
        </div>
      </header>}
      {article && <div ref={readingTools} className="dg-reading-tools" style={{ position: "sticky", top: 0, zIndex: 5, background: "#18232f", padding: "5px 0", margin: "8px 0" }}>
      <Focusable ref={toolbar} flow-children="row" className="dg-row">
        <Action disabled={loading || article.chapters.length <= 1} aria-expanded={chaptersOpen} onClick={() => toggleTool("chapters")}>{chaptersOpen ? "收起目录" : "章节目录"}</Action>
        <Action disabled={loading} aria-expanded={settingsOpen} onClick={() => toggleTool("settings")}>阅读设置</Action>
      </Focusable>
      {settingsOpen && <div className="dg-tool-panel" style={{ background: "#202d3a", padding: 9, borderRadius: 7 }}>
        <div className="dg-muted" style={{ marginBottom: 6 }}>正文字号</div>
        <Focusable flow-children="row" className="dg-row">{FONT_SIZES.map((size, index) => <Action key={size} aria-pressed={fontSize === size} onClick={() => changeFont(size)}>{["标准", "舒适", "大"][index]}</Action>)}</Focusable>
        <Action style={{ marginTop: 7 }} onClick={() => article && Navigation.NavigateToExternalWeb(article.url)}>在浏览器打开原文 ↗</Action>
      </div>}
      {chaptersOpen && <div className="dg-tool-panel" style={{ display: "flex", flexDirection: "column", gap: 7, margin: "8px 0", padding: 8, background: "#202d3a", borderRadius: 6 }}>
        <TextField label="搜索章节" value={chapterQuery} bShowClearAction
          onChange={(event) => setChapterQuery(event.target.value)} />
        <div className="dg-muted">{chapterQuery.trim() ? `找到 ${filtered.length} 个章节` : `共 ${filtered.length} 个章节 · 选择后自动收起`}</div>
        <Focusable flow-children="column" navEntryPreferPosition={NavEntryPositionPreferences.PREFERRED_CHILD} style={{ overflowY: "auto", maxHeight: 240, padding: 2, overscrollBehavior: "contain" }}>
          {filtered.map((chapter) => <Focusable key={chapter.url} role="button" tabIndex={0}
            className="dg-action dg-chapter" focusClassName="dg-focus" preferredFocus={chapter.current} aria-current={chapter.current ? "page" : undefined}
            onOKActionDescription="阅读章节" onActivate={() => {
              if (chapter.current) { setChaptersOpen(false); requestAnimationFrame(() => focusElement(toolbar.current?.querySelector<HTMLElement>("[role=button]") || null)); }
              else void open(chapter.url);
            }}>
            <span className="dg-chapter-number">{article!.chapters.indexOf(chapter) + 1}</span>
            <span>{chapter.title}{chapter.current && <span style={{ color: "#8dccff", fontSize: 11, marginLeft: 6 }}>正在阅读</span>}</span>
          </Focusable>)}
          {!filtered.length && <div className="dg-muted" style={{ padding: 12 }}>没有匹配章节，试试更短的关键词。</div>}
        </Focusable>
      </div>}
      </div>}
      {error && <div className="dg-error" role="alert">
        <div style={{ marginBottom: 6 }}>读取失败：{error}{article ? "。下方仍为上一章节。" : ""}</div>
        <Action onClick={() => void open(failedUrl.current, !article)}>重试</Action>
      </div>}
      {loading && <div role="status" style={{ display: "flex", gap: 8, alignItems: "center", padding: 12 }}><Spinner />正在读取攻略…</div>}
      {article && <div ref={body} className="dg-body" style={{ fontSize, lineHeight: 1.65 }}>
        <div ref={bodyContent}>
          {article.blocks.map((block, index) => <Focusable tabIndex={block.type === "image" ? undefined : 0} focusClassName="dg-focus" key={`${article.url}-${index}`} className={`dg-block${block.type === "heading" ? " dg-heading" : ""}`} style={block.type === "heading" ? { fontSize: fontSize + 2 } : undefined}>
            {block.type === "image" ? <GuideImage url={block.url} alt={block.alt} onOpen={() => viewImage(block.url, block.alt)} /> : block.text}
          </Focusable>)}
          {!article.blocks.length && <div className="dg-muted">此页没有可显示的正文，请在阅读设置中打开原文。</div>}
        </div>
      </div>}
      {article && !chaptersOpen && <>
        <Focusable flow-children="row" className="dg-row" style={{ marginTop: 12 }}>
          <Action disabled={loading || !article.previous_url} onClick={() => article.previous_url && void open(article.previous_url)}>‹ 上一页</Action>
          <Action disabled={loading || !article.next_url} onClick={() => article.next_url && void open(article.next_url)}>下一页 ›</Action>
        </Focusable>
      </>}
      {storageFailed && <div className="dg-error">本地存储不可用，阅读进度暂时无法保存。</div>}
    </Focusable>
  </PanelSection>;
}
