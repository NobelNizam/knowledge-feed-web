export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  [key: string]: any;
}

export interface CardData {
  id: number;
  title: string;
  content: string;
  domain?: string;
  domainId?: number;
  domainName?: string;
  tags?: string[];
  sourceUrl?: string;
  sourceName?: string;
  viewCount?: number;
  saveCount?: number;
  likeCount?: number;
  dislikeCount?: number;
  shareCount?: number;
  repostCount?: number;
  liked?: boolean;
  disliked?: boolean;
  reposted?: boolean;
  saved?: boolean;
  commentsCount?: number;
  createdAt?: string;
}

export type CardUpdate = Partial<CardData>;

export interface CommentData {
  id: number;
  content: string;
  createdAt: string;
  user?: { id: number; displayName: string };
  replies?: CommentData[];
  parentId?: number;
}

export interface ReportData {
  id: number;
  reportedPostId: number;
  cardTitle?: string;
  reporterName: string;
  reason: string;
  description?: string;
  status: string;
  resolvedAt?: string;
  createdAt: string;
}
