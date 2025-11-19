import type { DiscussionCategory, DiscussionState, UserRole, UserStatus } from "@prisma/client";

export type DiscussionSort = "top" | "recent" | "unanswered";
export type DiscussionFeedTab = "trending" | "latest" | "help" | "meta";

export type DiscussionAuthor = {
  id: string;
  handle: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
};

export type DiscussionTag = {
  slug: string;
  name: string;
};

export type DiscussionProblemPreview = {
  slug: string;
  title: string;
  difficulty: string | null;
};

export type DiscussionViewerState = {
  canModerate: boolean;
  canEdit: boolean;
  vote: -1 | 0 | 1;
};

export type DiscussionThread = {
  id: string;
  title: string | null;
  content: string;
  author: DiscussionAuthor;
  score: number;
  replyCount: number;
  containsSpoiler: boolean;
  isPinned: boolean;
  isLocked: boolean;
  state: DiscussionState;
  category: DiscussionCategory | null;
  tags: DiscussionTag[];
  createdAt: Date;
  lastActivityAt: Date;
  problem?: DiscussionProblemPreview | null;
  viewer?: DiscussionViewerState;
};

export type DiscussionReply = {
  id: string;
  parentId: string;
  content: string;
  author: DiscussionAuthor;
  score: number;
  containsSpoiler: boolean;
  state: DiscussionState;
  createdAt: Date;
  viewer?: DiscussionViewerState;
  replies?: DiscussionReply[];
};

export type PaginatedDiscussions = {
  items: DiscussionThread[];
  nextCursor: string | null;
};

export type PaginatedReplies = {
  items: DiscussionReply[];
  nextCursor: string | null;
};

export type DiscussionViewer = {
  id: string;
  role: UserRole;
  status: UserStatus;
};
