export type DeploymentMeta = {
  commit?: string | null;
  branch?: string | null;
  buildId?: string | null;
  deployedAt?: string;
  version?: string;
};

const resolveCommit = () =>
  process.env.NEXT_PUBLIC_RELEASE_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  process.env.COMMIT_SHA ??
  null;

const resolveBranch = () =>
  process.env.NEXT_PUBLIC_RELEASE_BRANCH ??
  process.env.VERCEL_GIT_COMMIT_REF ??
  process.env.GITHUB_REF_NAME ??
  process.env.BRANCH_NAME ??
  null;

const resolveBuildId = () =>
  process.env.VERCEL_BUILD_ID ?? process.env.BUILD_ID ?? process.env.GITHUB_RUN_ID ?? null;

export const getDeploymentMeta = (): DeploymentMeta => {
  return {
    commit: resolveCommit(),
    branch: resolveBranch(),
    buildId: resolveBuildId(),
    deployedAt: process.env.DEPLOYED_AT ?? new Date().toISOString(),
    version: process.env.npm_package_version ?? undefined,
  };
};
