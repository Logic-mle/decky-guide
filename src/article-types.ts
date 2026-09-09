export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "heading"; text: string }
  | { type: "image"; url: string; alt: string };

export type Chapter = { title: string; url: string; current: boolean };

export type Article = {
  title: string;
  page_title: string;
  url: string;
  blocks: ContentBlock[];
  chapters: Chapter[];
  previous_url: string | null;
  next_url: string | null;
};
