export const discussionsConfig = {
  global: {
    badge: "COMMUNITY HUB",
    headline: {
      line1: "GLOBAL",
      line2: "DISCUSSIONS",
    },
    description:
      "Share insights, request help, discuss platform strategy. All conversations are indexed and searchable for competitive programming knowledge base.",
    composer: {
      title: "Start a discussion",
      helper: "Ask questions, share solutions, or discuss meta topics",
    },
    tabs: [
      { value: "trending", label: "Trending", description: "Most active discussions" },
      { value: "latest", label: "Latest", description: "Recently created threads" },
      { value: "help", label: "Help", description: "Questions seeking assistance" },
      { value: "meta", label: "Meta", description: "Platform and community discussion" },
    ],
    filters: {
      tags: "Filter by tags",
      difficulty: "Filter by difficulty",
      reset: "Reset filters",
    },
    empty: {
      headline: "No discussions yet",
      description: "Be the first to start a conversation",
      action: "Create thread",
    },
  },
  thread: {
    badge: "DISCUSSION THREAD",
    meta: {
      replies: "replies",
      views: "views",
      created: "created",
    },
    actions: {
      vote: "Vote",
      reply: "Reply",
      report: "Report",
      viewProblem: "View in problem context",
    },
    composer: {
      thread: {
        title: "Thread title",
        content: "Share your question or insight",
        spoiler: "Mark as spoiler",
        category: "Category",
        submit: "Start discussion",
      },
      reply: {
        content: "Add a reply",
        spoiler: "Mark as spoiler",
        submit: "Post reply",
      },
    },
    empty: {
      replies: "No replies yet",
      description: "Be the first to reply",
    },
    auth: {
      headline: "Sign in to join discussions",
      description: "Create an account or sign in to participate in community discussions",
      action: "Sign in",
    },
  },
  categories: [
    { value: "trending", label: "General", description: "General discussion topics" },
    { value: "help", label: "Help", description: "Request assistance" },
    { value: "meta", label: "Meta", description: "Platform discussion" },
  ],
};

export type DiscussionsConfig = typeof discussionsConfig;
