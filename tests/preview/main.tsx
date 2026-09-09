import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { GuideResultContent } from '../../src/GuideResultContent';
import { ArticleReader } from '../../src/ArticleReader';
import { readProgress } from '../../src/reading-state';
import type { Article } from '../../src/article-types';
const base = 'https://www.gamersky.com/handbook/202609/123';
const art = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="500"><rect width="900" height="500" fill="#253e4d"/><path d="M0 430 240 120 400 320 580 70 900 440" fill="#5b858c"/><circle cx="720" cy="120" r="50" fill="#dac497"/><text x="40" y="460" font-size="28" fill="white">Guide image · preview fixture</text></svg>')}`;
const loadArticle = async (url: string): Promise<Article> => {
  const page = Number(url.match(/_(\d+)/)?.[1] || 1);
  const mode = (window as any).testMode;
  await new Promise((resolve) => setTimeout(resolve, mode === 'race' && page === 2 ? 650 : 40));
  if (mode === 'fail' && page === 11) throw Error('测试网络错误');
  return {
    title: '《黑神话：悟空》全流程图文攻略 · 全章节路线与隐藏收集',
    page_title: `第${page}章 · 山路探索与沿途收集`, url,
    chapters: Array.from({ length:120 }, (_, i) => ({ title: `第${i + 1}章 · ${i % 3 === 0 ? '隐藏 Boss 与支线路线' : '山路探索与沿途收集'}`, url:`${base}_${i + 1}.shtml`, current:page === i + 1 })),
    previous_url: page > 1 ? `${base}_${page - 1}.shtml` : null,
    next_url: page < 120 ? `${base}_${page + 1}.shtml` : null,
    blocks: Array.from({ length:28 }, (_, i) => i % 5 === 2 ? { type:'image' as const, url:art, alt:'山路位置示意' } : i % 5 === 0 ? { type:'heading' as const, text:`${i + 1}. 沿山路前进` } : { type:'text' as const, text:'从土地庙出发，沿着右侧山路向前。经过木桥后先探索左边的小路，拾取宝箱中的物品，再返回主路继续前进。\n遇到岔路时可以对照下方图片确认方向。' }),
  };
};
function App() {
 const [open, setOpen] = useState(true);
 const [initialUrl, setInitialUrl] = useState(() => readProgress(localStorage, 'game:preview')?.url || `${base}_1.shtml`);
 useEffect(() => {
   const navigate = (event: Event) => setInitialUrl((event as CustomEvent).detail);
   window.addEventListener('test-navigate', navigate);
   return () => window.removeEventListener('test-navigate', navigate);
 }, []);
 return <div style={{ width: 'min(320px, 100vw)', marginLeft:'auto', background:'#18232f', height:'100vh', overflowY:'auto', padding:'20px 16px', boxSizing:'border-box' }}>
   <div style={{ color:'white', fontSize:20, fontWeight:700, marginBottom:24 }}>Decky Guide</div>
   {location.search === '?results' ? <>
     <style>{`.test-result{display:block;width:100%;padding:12px;background:#293645;color:white;border:0;margin:8px 0;text-align:left}.test-result:focus{background:white;color:#202530}`}</style>
     {[1,2].map((index) => <button className="test-result" key={index}><GuideResultContent result={{ title:'《只狼》全流程图文攻略', summary:'本篇攻略包括全流程路线、战斗技巧与隐藏收集。'.repeat(10), date:'2026-09-07' }} /></button>)}
   </> : open ? <ArticleReader initialUrl={initialUrl} progressKey="game:preview" loadArticle={loadArticle} onBack={() => setOpen(false)} /> : <button onClick={() => { setInitialUrl(readProgress(localStorage, 'game:preview')?.url || `${base}_1.shtml`); setOpen(true); }}>重新打开攻略</button>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<App />);
