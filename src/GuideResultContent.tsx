export function GuideResultContent({ result }: { result: { title: string; summary: string; date: string } }) {
  return (
            <div style={{ textAlign: "left", whiteSpace: "normal", overflowWrap: "anywhere" }}>
              <div style={{ fontWeight: 650, lineHeight: 1.35 }}>{result.title}</div>
              {result.summary && <div style={{ color: "inherit", opacity: .8, fontSize: 12, lineHeight: 1.4, marginTop: 5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{result.summary}</div>}
              {result.date && <div style={{ color: "inherit", opacity: .7, fontSize: 12, marginTop: 4 }}>{result.date}</div>}
            </div>
  );
}
