export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  [key: string]: any;
}

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
  dislikeCount?: number;
  shareCount?: number;
  liked?: boolean;
  disliked?: boolean;
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

export interface ReportData {
  id: string;
  cardId: string;
  cardTitle: string;
  cardDomain: string;
  cardDislikeCount: number;
  reporterName: string;
  reporterEmail: string;
  reasons: string[];
  createdAt: string;
}
