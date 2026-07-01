export interface UserPreferences {
  domains: string[];
  readingLevel?: string;
}

export interface CardData {
  id: string;
  title: string;
  content: string;
  domain: string;
  tags?: string[];
  sourceUrl?: string;
  sourceName?: string;
  viewCount?: number;
  saveCount?: number;
  likeCount?: number;
  shareCount?: number;
  liked?: boolean;
  saved?: boolean;
  commentsCount?: number;
  createdAt?: string;
}

export type CardUpdate = Partial<CardData>;

export interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  user?: { name: string };
  replies?: CommentData[];
  parentId?: string;
}
