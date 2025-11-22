"use client";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { CheckCircle2, Loader2, Upload } from "@/components/icons";
import { settingsConfig } from "@/config/settings";
import { invalidateAuthSession } from "@/lib/react-query/invalidation";
import { sessionQueryOptions } from "@/lib/react-query/policies";
import { trpc } from "@/lib/trpc/client";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validators/auth";

export default function ProfileSettingsPage() {
  const queryClient = useQueryClient();
  const { data: session, isLoading } = trpc.auth.getSession.useQuery(undefined, {
    ...sessionQueryOptions,
  });

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: {
      name: session?.user.name ?? "",
      bio: undefined,
      country: undefined,
      timezone: undefined,
      avatarUrl: session?.user.avatarUrl ?? undefined,
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(session?.user.avatarUrl ?? null);

  const updateMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: (data) => {
      toast.success("Profile updated", {
        description: data.message,
      });
      invalidateAuthSession(queryClient);
    },
    onError: (error) => {
      toast.error("Failed to update profile", {
        description: error.message,
      });
    },
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Maximum file size is 2MB",
      });
      return;
    }

    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/avatar", { method: "POST", body: formData });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Upload failed");
      }

      const { url } = await res.json();
      form.setValue("avatarUrl", url);
      setPreviewUrl(url);
      toast.success("Avatar uploaded");
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Try again later",
      });
      setPreviewUrl(session?.user.avatarUrl ?? null);
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 animate-fade-in font-mono text-foreground">
        <Skeleton className="h-10 w-64 border-2 border-border" />
        <div className="space-y-3 border-2 border-border bg-card p-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const stats = [
    { label: settingsConfig.profile.stats.handle, value: `@${session.user.handle}` },
    { label: settingsConfig.profile.stats.email, value: session.user.email },
    { label: settingsConfig.profile.stats.role, value: session.user.role },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10 animate-fade-in font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary/80">
              {settingsConfig.profile.marker}
              <span className="inline-flex items-center gap-2 border-2 border-border bg-background px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                {settingsConfig.profile.badge}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {settingsConfig.profile.headline.line1}
              <br />
              {settingsConfig.profile.headline.line2}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {settingsConfig.profile.headline.line3}
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {settingsConfig.profile.description}
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="border-2 border-border bg-background px-4 py-3 text-left"
              >
                <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeader
          marker={settingsConfig.profile.avatar.marker}
          title={settingsConfig.profile.avatar.title}
          description={settingsConfig.profile.avatar.helper}
        />
        <div className="flex flex-col gap-6 border-2 border-border bg-background p-6 md:flex-row md:items-start">
          <div className="relative">
            <Avatar className="h-28 w-28 border-2 border-border bg-background">
              <AvatarImage src={previewUrl ?? undefined} alt={session.user.handle} />
              <AvatarFallback className="bg-primary/10 text-lg font-black text-primary">
                {session.user.handle.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : null}
          </div>
          <div className="flex-1 space-y-3">
            <p className="text-sm text-muted-foreground">{settingsConfig.profile.avatar.helper}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={uploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-11 rounded-none border-2 border-border px-5 text-xs font-bold uppercase"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading
                ? settingsConfig.profile.avatar.uploading
                : settingsConfig.profile.avatar.action}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeader
          marker={settingsConfig.profile.form.marker}
          title={settingsConfig.profile.form.title}
          description={settingsConfig.profile.form.description}
        />
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
            className="space-y-6 border-2 border-border bg-card p-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-bold uppercase tracking-[0.15em]">
                    {settingsConfig.profile.form.nameLabel}
                  </FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    {settingsConfig.profile.form.nameHelper}
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-bold uppercase tracking-[0.15em]">
                    {settingsConfig.profile.form.bioLabel}
                  </FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Tell us about yourself..." {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    {settingsConfig.profile.form.bioHelper}
                  </p>
                </FormItem>
              )}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold uppercase tracking-[0.15em]">
                      {settingsConfig.profile.form.countryLabel}
                    </FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="e.g., US, CA, BG" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      {settingsConfig.profile.form.countryHelper}
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold uppercase tracking-[0.15em]">
                      {settingsConfig.profile.form.timezoneLabel}
                    </FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="e.g., Europe/Sofia" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      {settingsConfig.profile.form.timezoneHelper}
                    </p>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-bold uppercase tracking-[0.15em]">
                    {settingsConfig.profile.form.avatarUrlLabel}
                  </FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    {settingsConfig.profile.form.avatarUrlHelper}
                  </p>
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between border-t-2 border-border pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {updateMutation.isSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-success">{settingsConfig.profile.form.saved}</span>
                  </>
                ) : null}
              </div>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="h-11 rounded-none border-2 border-primary bg-primary px-6 font-mono text-xs font-bold uppercase text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {settingsConfig.profile.form.saveCta}
                  </>
                ) : (
                  settingsConfig.profile.form.saveCta
                )}
              </Button>
            </div>
          </form>
        </Form>
      </section>
    </div>
  );
}

function SectionHeader({
  marker,
  title,
  description,
}: {
  marker: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">{marker}</p>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <h2 className="text-3xl font-black tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground md:max-w-2xl">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
