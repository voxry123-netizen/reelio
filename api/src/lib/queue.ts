import { Queue } from "bullmq";
import { env } from "./env.js";

const connection = env.REDIS_URL
  ? ({ url: env.REDIS_URL, maxRetriesPerRequest: null as any } as any)
  : ({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      maxRetriesPerRequest: null as any,
    } as any);

export const transcodeQueue = new Queue("transcode", { connection });
export const exportQueue = new Queue("export", { connection });
