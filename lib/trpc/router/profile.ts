import { router, publicProcedure, protectedProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { getProfileDetail, updateProfileSettings } from "@/lib/profile/service";
import { profileSettingsSchema } from "@/lib/validators/profile";
import { TRPCError } from "@trpc/server";

export const profileRouter = router({
  detail: publicProcedure
    .input(z.object({ handle: z.string().min(2) }))
    .query(async ({ input, ctx }) => {
      const profile = await getProfileDetail(input.handle, {
        id: ctx.user?.id,
        role: ctx.user?.role ?? null,
      });
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      }
      return profile;
    }),
  updateSettings: protectedProcedure.input(profileSettingsSchema).mutation(async ({ ctx, input }) => {
    await updateProfileSettings(ctx.user.id, input);
    return { success: true };
  }),
});
