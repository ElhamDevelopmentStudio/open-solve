import { describe, expect, beforeEach, vi, it } from "vitest";
import { UserRole, UserStatus } from "@prisma/client";

const leaderEntryMock = vi.fn();
const deltaGroupMock = vi.fn();
const userFindManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    leaderboardEntry: {
      findMany: leaderEntryMock,
    },
    leaderboardRealtimeSolve: {
      groupBy: deltaGroupMock,
    },
    user: {
      findMany: userFindManyMock,
    },
  },
}));

describe("buildRealtimeSnapshotRanking", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/leaderboard/service");
    mod.__resetRealtimeLeaderboardState();
  });

  const baseUser = {
    id: "u1",
    handle: "alice",
    name: null,
    avatarUrl: null,
    country: null,
    role: "USER" as UserRole,
    status: "ACTIVE" as UserStatus,
    showOnLeaderboard: true,
  };

  it("merges snapshot entries with realtime deltas and reorders ranks", async () => {
    const now = new Date();
    leaderEntryMock.mockResolvedValue([
      {
        userId: "u1",
        rank: 2,
        score: 15,
        solved: 6,
        timePenalty: null,
        createdAt: now,
        updatedAt: now,
        user: baseUser,
      },
    ]);
    deltaGroupMock.mockResolvedValue([
      {
        userId: "u1",
        _sum: { score: 5 },
        _count: { _all: 1 },
        _max: { createdAt: now },
      },
      {
        userId: "u2",
        _sum: { score: 25 },
        _count: { _all: 3 },
        _max: { createdAt: now },
      },
    ]);
    userFindManyMock.mockResolvedValue([
      {
        id: "u2",
        handle: "bob",
        name: null,
        avatarUrl: null,
        country: null,
        role: "USER" as UserRole,
        status: "ACTIVE" as UserStatus,
        showOnLeaderboard: true,
      },
    ]);

    const { buildRealtimeSnapshotRanking } = await import("@/lib/leaderboard/service");
    const results = await buildRealtimeSnapshotRanking({
      snapshot: { id: "snap" },
      viewerIsStaff: false,
    });

    expect(results).toHaveLength(2);
    expect(results[0].user.handle).toBe("bob");
    expect(results[0].score).toBe(25);
    expect(results[0].rank).toBe(1);
    expect(results[1].user.handle).toBe("alice");
    expect(results[1].score).toBe(20);
    expect(results[1].rank).toBe(2);
  });

  it("falls back gracefully when realtime table is missing", async () => {
    leaderEntryMock.mockResolvedValue([
      {
        userId: "u1",
        rank: 1,
        score: 10,
        solved: 4,
        timePenalty: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: baseUser,
      },
    ]);
    deltaGroupMock.mockRejectedValue({ code: "P2021" });

    const { buildRealtimeSnapshotRanking } = await import("@/lib/leaderboard/service");
    const results = await buildRealtimeSnapshotRanking({
      snapshot: { id: "snap" },
      viewerIsStaff: false,
    });

    expect(results).toHaveLength(1);
    expect(results[0].user.handle).toBe("alice");
    expect(deltaGroupMock).toHaveBeenCalledTimes(1);
  });
});
