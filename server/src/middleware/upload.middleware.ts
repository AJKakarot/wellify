import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { AppError } from "../utils/errors.js";

export const FOOD_UPLOAD_DIR = path.join(process.cwd(), "uploads", "food");

fs.mkdirSync(FOOD_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, FOOD_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || ".jpg";
    const safeBaseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .slice(0, 50);

    cb(null, `${Date.now()}-${safeBaseName}${extension.toLowerCase()}`);
  },
});

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const foodUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new AppError("Only JPEG, PNG, and WebP images are allowed", 400, "INVALID_FILE_TYPE"));
      return;
    }

    cb(null, true);
  },
});
