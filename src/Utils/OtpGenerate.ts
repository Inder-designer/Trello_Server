import OTPModel from '../models/User/OtpSchema';
import mongoose from 'mongoose';

// Generate and Save OTP
export const generateOTP = async (userId: mongoose.Types.ObjectId | string): Promise<number> => {
  const otp = Math.floor(100000 + Math.random() * 900000);

  const otpEntry = new OTPModel({
    userId,
    code: otp,
    expiryTime: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
  });

  await otpEntry.save();
  return otp;
};

// Validate OTP
export const validateOTP = async (
  userId: mongoose.Types.ObjectId | string,
  otp: number
): Promise<boolean> => {
  const otpRecord = await OTPModel.findOne({ userId, code: otp }) as {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId | string;
    code: number;
    expiryTime: Date;
  };

  if (!otpRecord || otpRecord.expiryTime < new Date()) {
    return false;
  }

  // OTP is valid, remove it after verification
  await OTPModel.deleteOne({ _id: otpRecord._id });
  return true;
};
