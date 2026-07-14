import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { AppError } from "../utils/errors.js";

export const VOICE_UPLOAD_DIR = path.join(process.cwd(), "uploads", "voice");

fs.mkdirSync(VOICE_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, VOICE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || ".webm";
    const safeBaseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .slice(0, 50);

    cb(null, `${Date.now()}-${safeBaseName}${extension.toLowerCase()}`);
  },
});

const allowedMimeTypes = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
]);

export const voiceUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new AppError("Only MP3, MP4, WAV, WebM, and OGG audio files are allowed", 400, "INVALID_AUDIO_TYPE"));
      return;
    }

    cb(null, true);
  },
});
