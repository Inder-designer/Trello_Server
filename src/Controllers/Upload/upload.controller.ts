import { Request, Response, NextFunction } from "express";
import { catchAsyncErrors } from "../../middleware/catchAsyncErrors";
import ErrorHandler from "../../Utils/errorhandler";
import cloudinary from "../../config/cloudinary";
import ResponseHandler from "../../Utils/resHandler";

interface MulterFile extends Express.Multer.File {
  buffer: Buffer;
}
// Upload single image
export const uploadSingleImage = catchAsyncErrors(async (req: Request,
  res: Response,
  next: NextFunction) => {
  const file = req.file as MulterFile;

  if (!file) return next(new ErrorHandler("No file uploaded", 400));

  const folder = req.body.folder ? `car-rental/${req.body.folder}` : "uploads";
  console.log(folder);
  
  const oldImagePublicId = req.body.oldImagePublicId; // Get old image public ID from request

  // Remove old image if exists
  if (oldImagePublicId) {
    try {
      await cloudinary.uploader.destroy(oldImagePublicId);
    } catch (error) {
      console.error("Failed to delete old image:", error);
    }
  }

  // Upload new image
  const result = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(file.buffer);
  });

  return ResponseHandler.send(
    res,
    "Image uploaded successfully",
    { url: result.secure_url, publicId: result.public_id },
    200
  );
});


// Upload multiple images
export const uploadMultipleImages = catchAsyncErrors(async (req, res, next) => {
  const files = req.files as Express.Multer.File[];

  if (!Array.isArray(files) || files.length === 0) {
    return next(new ErrorHandler("No files uploaded", 400));
  }
  const { docType } = req.body

  const folder = req.body.folder || "uploads"; // Default folder

  const results = await Promise.all(
    files.map(
      (file) =>
        new Promise<any>((resolve, reject) => {
          const originalName = file.originalname;
          const stream = cloudinary.uploader.upload_stream(
            {
              folder,
              public_id: originalName.split(".")[0],
              use_filename: true,
              unique_filename: false
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(file.buffer);
        })
    )
  );
  return ResponseHandler.send(
    res,
    "Images uploaded successfully",
    results.map((result) => ({ url: result.secure_url, publicId: result.public_id })),
    200
  );
});
