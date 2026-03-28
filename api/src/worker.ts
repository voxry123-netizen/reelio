import { Worker } from "bullmq";
import { prisma } from "./lib/prisma.js";
import { presignGet } from "./lib/s3.js";
import { env } from "./lib/env.js";
import { s3 } from "./lib/s3.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const connection = env.REDIS_URL
  ? ({ url: env.REDIS_URL, maxRetriesPerRequest: null as any } as any)
  : ({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      maxRetriesPerRequest: null as any,
    } as any);

new Worker("transcode", async (job) => {
  const { mediaId } = job.data as { mediaId: string };
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) return;
  // MVP "mock transcode": create a rendition pointing to same key
  await prisma.mediaRendition.create({
    data: {
      mediaId,
      storageKey: media.storageKeyOriginal,
      bitrate: 0,
      width: media.width ?? null,
      height: media.height ?? null,
    },
  });
  // mark post as published (if processing)
  await prisma.post.updateMany({ where: { id: media.postId, status: "processing" }, data: { status: "published" } });
}, { connection });

new Worker("export", async (job) => {
  const { exportId } = job.data as { exportId: string };
  const exp = await prisma.dataExport.findUnique({ where: { id: exportId } });
  if (!exp) return;

  const user = await prisma.user.findUnique({ where: { id: exp.userId } });
  const posts = await prisma.post.findMany({ where: { authorId: exp.userId }, include: { media: true } });
  const follows = await prisma.follow.findMany({ where: { followerId: exp.userId } });
  const payload = { user, posts, follows };

  const key = `exports/${exp.userId}/${exportId}.json`;
  await s3.send(new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    Body: JSON.stringify(payload, null, 2),
    ContentType: "application/json",
  }));

  await prisma.dataExport.update({
    where: { id: exportId },
    data: { status: "completed", storageKey: key, completedAt: new Date() },
  });
}, { connection });

console.log("Worker started");
