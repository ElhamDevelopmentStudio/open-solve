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

  let S3ClientCtor: typeof import("@aws-sdk/client-s3").S3Client;
  let PutObjectCommandCtor: typeof import("@aws-sdk/client-s3").PutObjectCommand;
  try {
    const s3Module = await import("@aws-sdk/client-s3");
    S3ClientCtor = s3Module.S3Client;
    PutObjectCommandCtor = s3Module.PutObjectCommand;
  } catch {
    throw new Error("@aws-sdk/client-s3 is not installed. Please add it to dependencies.");
  }

  const client = new S3ClientCtor({
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
    new PutObjectCommandCtor({
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

  let S3ClientCtor: typeof import("@aws-sdk/client-s3").S3Client;
  let GetObjectCommandCtor: typeof import("@aws-sdk/client-s3").GetObjectCommand;
  try {
    const s3Module = await import("@aws-sdk/client-s3");
    S3ClientCtor = s3Module.S3Client;
    GetObjectCommandCtor = s3Module.GetObjectCommand;
  } catch {
    throw new Error("@aws-sdk/client-s3 is not installed. Please add it to dependencies.");
  }

  const client = new S3ClientCtor({
    forcePathStyle: true,
    region: env.MINIO_REGION ?? "us-east-1",
    endpoint: `${env.MINIO_USE_SSL ? "https" : "http"}://${env.MINIO_ENDPOINT}`,
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
    },
  });

  const response = await client.send(
    new GetObjectCommandCtor({
      Bucket: env.MINIO_BUCKET,
      Key: key,
    }),
  );

  const body = response.Body;
  if (!body) {
    return null;
  }
  if ("transformToString" in body && typeof body.transformToString === "function") {
    return await body.transformToString("utf-8");
  }
  if ("on" in body && typeof (body as NodeJS.EventEmitter).on === "function") {
    const streamBody = body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      streamBody.once("error", reject);
      streamBody.on("data", (chunk: Buffer) => chunks.push(chunk));
      streamBody.once("end", resolve);
    });
    return Buffer.concat(chunks).toString("utf-8");
  }
  const arrayBuffer = await (body as Blob).arrayBuffer();
  return Buffer.from(arrayBuffer).toString("utf-8");
}
