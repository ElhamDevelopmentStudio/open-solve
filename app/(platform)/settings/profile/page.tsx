"use client";

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
import { invalidateAuthSession } from "@/lib/react-query/invalidation";
import { sessionQueryOptions } from "@/lib/react-query/policies";
import { trpc } from "@/lib/trpc/client";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validators/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Upload } from "@/components/icons";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
      <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="mt-2 h-4 w-96 rounded-lg" />
        </div>
        <div className="premium-card space-y-6 rounded-2xl p-8">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-base text-muted-foreground">
          Manage your public profile information and avatar
        </p>
      </div>

      <div className="premium-card space-y-8 rounded-2xl p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-border/30 ring-offset-2 ring-offset-background">
              <AvatarImage src={previewUrl ?? undefined} alt={session.user.handle} />
              <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                {session.user.handle.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : null}
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Profile Picture</h3>
              <p className="text-sm text-muted-foreground">
                Upload a new avatar. Max 2MB. PNG or JPEG recommended.
              </p>
            </div>
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
              className="rounded-xl"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Change Avatar"}
            </Button>
          </div>
        </div>

        <div className="h-px bg-border/50" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Display Name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Your full name"
                      className="rounded-xl"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    This is how others will see your name across the platform
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Tell us about yourself..."
                      className="rounded-xl resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Brief description for your profile. Max 500 characters.
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
                    <FormLabel className="text-sm font-semibold">Country</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g., US, CA, BG"
                        className="rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">Two-letter ISO code</p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Timezone</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g., Europe/Sofia"
                        className="rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">IANA timezone identifier</p>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Avatar URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://..."
                      className="rounded-xl"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Direct link to your avatar image (optional)
                  </p>
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {updateMutation.isSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-success">Saved successfully</span>
                  </>
                ) : null}
              </div>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-xl"
                size="lg"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

