import multer from "multer";
import { Request } from "express";
import { FileFilterCallback } from "multer";

const storage = multer.memoryStorage();

interface MulterFile {
  mimetype: string;
}

const fileFilter = (req: Request, file: MulterFile, cb: FileFilterCallback): void => {
  if (!file.mimetype.startsWith("image/") && file.mimetype !== "application/pdf") {
    return cb(new Error("Only image and PDF files are allowed!") as any, false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

export default upload;
