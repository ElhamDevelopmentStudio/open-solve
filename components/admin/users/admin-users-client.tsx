"use client";

import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";
import type { inferRouterOutputs } from "@trpc/server";
import { useEffect, useMemo, useState } from "react";
import type { InfiniteData } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@/components/ui";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2,
  Search,
  UserCog,
  RefreshCw,
  KeyRound,
  UserPlus,
  Trash2,
  type IconComponent,
} from "@/components/icons";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { UserRole, UserStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

type UserListResponse = inferRouterOutputs<AppRouter>["admin"]["users"]["list"];
type UserDetailResponse = inferRouterOutputs<AppRouter>["admin"]["users"]["detail"];

export function AdminUsersClient({ initialList }: { initialList: UserListResponse }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<UserStatus | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const initialInfinite = useMemo<InfiniteData<UserListResponse, string | undefined>>(
    () => ({
      pages: [initialList],
      pageParams: [undefined],
    }),
    [initialList],
  );

  const usersQuery = trpc.admin.users.list.useInfiniteQuery(
    {
      query: debouncedQuery || undefined,
      role: roleFilter,
      status: statusFilter,
      limit: 25,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialData: initialInfinite,
      refetchOnWindowFocus: false,
    },
  );

  const users = usersQuery.data?.pages.flatMap((page) => page.items) ?? initialList.items;
  const hasNextPage = usersQuery.hasNextPage;

  const detailQuery = trpc.admin.users.detail.useQuery(
    { userId: selectedUserId ?? "" },
    { enabled: Boolean(selectedUserId) },
  );

  const updateRole = trpc.admin.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      usersQuery.refetch();
      detailQuery.refetch();
    },
    onError: (error) => toast.error("Failed to update role", { description: error.message }),
  });

  const updateStatus = trpc.admin.users.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      usersQuery.refetch();
      detailQuery.refetch();
    },
    onError: (error) => toast.error("Failed to update status", { description: error.message }),
  });

  const resetTwoFactor = trpc.admin.users.resetTwoFactor.useMutation({
    onSuccess: () => toast.success("Two-factor reset"),
    onError: (error) => toast.error("Failed to reset 2FA", { description: error.message }),
  });

  const revokeSessions = trpc.admin.users.revokeSessions.useMutation({
    onSuccess: () => toast.success("Sessions revoked"),
    onError: (error) => toast.error("Failed to revoke sessions", { description: error.message }),
  });
  const purgeUser = trpc.admin.users.purge.useMutation({
    onSuccess: () => {
      toast.success("User purged");
      setSelectedUserId(null);
      usersQuery.refetch();
    },
    onError: (error) => toast.error("Failed to purge user", { description: error.message }),
  });

  const impersonateMutation = trpc.admin.impersonation.start.useMutation({
    onSuccess: () =>
      toast.success("Impersonation started", { description: "Reload the app to act as the user." }),
    onError: (error) => toast.error("Failed to impersonate", { description: error.message }),
  });

  return (
    <>
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">User intelligence</p>
            <CardTitle className="text-2xl">Users & roles</CardTitle>
            <p className="text-sm text-muted-foreground">
              Search by email, handle, role, or enforce bans/impersonation.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-1.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users…"
                className="border-none bg-transparent p-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <Select
              value={roleFilter ?? "all"}
              onValueChange={(value) =>
                setRoleFilter(value === "all" ? undefined : (value as UserRole))
              }
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="MODERATOR">Moderator</SelectItem>
                <SelectItem value="PROBLEM_CURATOR">Curator</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter ?? "all"}
              onValueChange={(value) =>
                setStatusFilter(value === "all" ? undefined : (value as UserStatus))
              }
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SHADOW_BANNED">Shadow banned</SelectItem>
                <SelectItem value="BANNED">Banned</SelectItem>
                <SelectItem value="DELETED">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {users.map((user) => (
              <button
                type="button"
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border/50">
                    <AvatarFallback className="text-xs font-medium">
                      {user.handle.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.handle}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="hidden flex-1 items-center justify-between text-sm text-muted-foreground sm:flex">
                  <span>{user.role}</span>
                  <span>{user.solved.toLocaleString()} solved</span>
                  <span>{user.submissionCount.toLocaleString()} submissions</span>
                  <span>
                    {user.lastLoginAt
                      ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
                      : "Never"}
                  </span>
                </div>
                <Badge variant={user.status === "ACTIVE" ? "outline" : "destructive"}>
                  {user.status.replace("_", " ")}
                </Badge>
              </button>
            ))}
          </div>
          {hasNextPage ? (
            <div className="flex justify-center border-t border-border/60 p-4">
              <Button
                onClick={() => usersQuery.fetchNextPage()}
                disabled={usersQuery.isFetchingNextPage}
                variant="ghost"
                className="gap-2"
              >
                {usersQuery.isFetchingNextPage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Load more
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <UserDetailSheet
        open={Boolean(selectedUserId)}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
        user={detailQuery.data?.user}
        auditLogs={detailQuery.data?.auditLogs ?? []}
        submissionSummary={detailQuery.data?.submissionSummary ?? []}
        isLoading={detailQuery.isLoading}
        onRoleChange={(role) => {
          if (detailQuery.data?.user) {
            updateRole.mutate({ userId: detailQuery.data.user.id, role });
          }
        }}
        onStatusChange={(status) => {
          if (detailQuery.data?.user) {
            updateStatus.mutate({ userId: detailQuery.data.user.id, status });
          }
        }}
        onResetTwoFactor={() => {
          if (detailQuery.data?.user) {
            resetTwoFactor.mutate({ userId: detailQuery.data.user.id });
          }
        }}
        onRevokeSessions={() => {
          if (detailQuery.data?.user) {
            revokeSessions.mutate({ userId: detailQuery.data.user.id });
          }
        }}
        onImpersonate={() => {
          if (detailQuery.data?.user) {
            impersonateMutation.mutate({ userId: detailQuery.data.user.id });
          }
        }}
        onPurge={() => {
          if (detailQuery.data?.user) {
            if (window.confirm("This will permanently remove this anonymized account. Continue?")) {
              purgeUser.mutate({ userId: detailQuery.data.user.id });
            }
          }
        }}
      />
    </>
  );
}

type UserDetailProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserDetailResponse["user"];
  auditLogs: UserDetailResponse["auditLogs"];
  submissionSummary: UserDetailResponse["submissionSummary"];
  isLoading: boolean;
  onRoleChange: (role: UserRole) => void;
  onStatusChange: (status: UserStatus) => void;
  onResetTwoFactor: () => void;
  onRevokeSessions: () => void;
  onImpersonate: () => void;
  onPurge: () => void;
};

function UserDetailSheet({
  open,
  onOpenChange,
  user,
  auditLogs,
  submissionSummary,
  isLoading,
  onRoleChange,
  onStatusChange,
  onResetTwoFactor,
  onRevokeSessions,
  onImpersonate,
  onPurge,
}: UserDetailProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-hidden border-l border-border/40 bg-card/90 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>User detail</SheetTitle>
        </SheetHeader>
        {isLoading || !user ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-6 pr-4">
              <Card className="border-border/60 bg-card/80">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border/60">
                    <AvatarFallback className="text-lg font-semibold">
                      {user.handle.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-semibold">{user.handle}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Role</span>
                    <Select
                      defaultValue={user.role}
                      onValueChange={(value) => onRoleChange(value as UserRole)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="MODERATOR">Moderator</SelectItem>
                        <SelectItem value="PROBLEM_CURATOR">Curator</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <Select
                      defaultValue={user.status}
                      onValueChange={(value) => onStatusChange(value as UserStatus)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="SHADOW_BANNED">Shadow banned</SelectItem>
                        <SelectItem value="BANNED">Banned</SelectItem>
                        <SelectItem value="DELETED">Deleted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created</span>
                    <span>
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2">
                <ActionButton icon={KeyRound} label="Reset 2FA" onClick={onResetTwoFactor} subtle />
                <ActionButton icon={RefreshCw} label="Revoke sessions" onClick={onRevokeSessions} />
                <ActionButton icon={UserCog} label="Impersonate" onClick={onImpersonate} />
                <ActionButton
                  icon={UserPlus}
                  label="Promote to staff"
                  onClick={() => onRoleChange("PROBLEM_CURATOR")}
                  subtle
                />
                {user.status === "DELETED" ? (
                  <ActionButton icon={Trash2} label="Purge account" onClick={onPurge} destructive />
                ) : null}
              </div>

              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base">Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {submissionSummary.map((summary) => (
                    <div key={summary.status} className="flex items-center justify-between">
                      <span>{summary.status}</span>
                      <span>{summary._count.toLocaleString()}</span>
                    </div>
                  ))}
                  {submissionSummary.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No submissions on record.</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base">Recent audit events</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {auditLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No audit log entries.</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border border-border/60 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{log.action}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        {log.metadata ? (
                          <p className="text-xs text-muted-foreground">
                            {JSON.stringify(log.metadata)}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  subtle,
  destructive,
}: {
  icon: IconComponent;
  label: string;
  onClick: () => void;
  subtle?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition hover:shadow-sm",
        destructive
          ? "border-destructive/50 bg-destructive/10 text-destructive hover:border-destructive hover:bg-destructive/15"
          : subtle
            ? "border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-primary"
            : "border-border/60 bg-card text-foreground hover:border-primary/40",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
