import { env } from "@/lib/env";

type UploadParams = {
  userId: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
};

// Uploads the avatar and returns a public URL if MINIO_PUBLIC_URL is set, otherwise the object key
export async function uploadAvatarToMinio({ userId, filename, contentType, buffer }: UploadParams) {
  if (!env.MINIO_ENDPOINT || !env.MINIO_BUCKET || !env.MINIO_ACCESS_KEY || !env.MINIO_SECRET_KEY) {
    throw new Error("MinIO is not configured");
  }

  // Lazy import to avoid bundling when unused
  let S3Client: any, PutObjectCommand: any;
  try {
    ({ S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3"));
  } catch (e) {
    throw new Error("@aws-sdk/client-s3 is not installed. Please add it to dependencies.");
  }

  const client = new S3Client({
    forcePathStyle: true,
    region: env.MINIO_REGION ?? "us-east-1",
    endpoint: `${env.MINIO_USE_SSL ? "https" : "http"}://${env.MINIO_ENDPOINT}`,
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
    },
  });

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `avatars/${userId}/${Date.now()}-${safeName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    }),
  );

  if (env.MINIO_PUBLIC_URL) {
    const base = env.MINIO_PUBLIC_URL.replace(/\/$/, "");
    return `${base}/${env.MINIO_BUCKET}/${key}`;
  }

  return key;
}

export async function downloadObjectFromMinio(key: string) {
  if (!env.MINIO_ENDPOINT || !env.MINIO_BUCKET || !env.MINIO_ACCESS_KEY || !env.MINIO_SECRET_KEY) {
    throw new Error("MinIO is not configured");
  }

  let S3Client: any, GetObjectCommand: any;
  try {
    ({ S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3"));
  } catch {
    throw new Error("@aws-sdk/client-s3 is not installed. Please add it to dependencies.");
  }

  const client = new S3Client({
    forcePathStyle: true,
    region: env.MINIO_REGION ?? "us-east-1",
    endpoint: `${env.MINIO_USE_SSL ? "https" : "http"}://${env.MINIO_ENDPOINT}`,
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
    },
  });

  const response = await client.send(
    new GetObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
    }),
  );

  if (!response.Body) {
    return null;
  }
  if ("transformToString" in response.Body && typeof response.Body.transformToString === "function") {
    return await response.Body.transformToString("utf-8");
  }

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    response.Body.once("error", reject);
    response.Body.on("data", (chunk: Buffer) => chunks.push(chunk));
    response.Body.once("end", resolve);
  });
  return Buffer.concat(chunks).toString("utf-8");
}
