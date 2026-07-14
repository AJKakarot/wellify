import { Queue } from "bullmq";
import connection from "./redis.js";
import type { FoodLogJobData, LogJobData, VoiceLogJobData } from "../types/index.js";

export const logQueue = new Queue("log-processing", { connection });
export const foodQueue = new Queue("food-processing", { connection });
export const voiceQueue = new Queue("voice-processing", { connection });

export const addLogJob = async (data: LogJobData) => {
  return logQueue.add("process-log", data, {
    attempts: 3,             
    backoff: {
      type: "exponential",
      delay: 1000,           
    },
    removeOnComplete: true,  
  });
};

export const addFoodJob = async (data: FoodLogJobData) => {
  return foodQueue.add("process-food", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
  });
};

export const addVoiceJob = async (data: VoiceLogJobData) => {
  return voiceQueue.add("process-voice", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
  });
};
