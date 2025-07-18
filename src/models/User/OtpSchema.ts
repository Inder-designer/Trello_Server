import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOTPSchema extends Document {
  userId: mongoose.Types.ObjectId;
  code: number;
  expires: Date;
}

interface IOTPModel extends Model<IOTPSchema> {
  generateOTP(userId: mongoose.Types.ObjectId): Promise<IOTPSchema>;
  verifyOTP(userId: mongoose.Types.ObjectId, enteredOTP: number): Promise<IOTPSchema | null>;
}

const OTPSchema = new Schema<IOTPSchema, IOTPModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    code: {
      type: Number,
      required: true,
      unique: true,
    },
    expires: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// Static method to generate OTP
OTPSchema.statics.generateOTP = async function (
  userId: mongoose.Types.ObjectId
): Promise<IOTPSchema> {
  const otp = Math.floor(100000 + Math.random() * 900000);
  console.log(otp);
  

  const otpDocument = await this.findOneAndUpdate(
    { userId },
    {
      code: otp,
      expires: new Date(Date.now() + 10 * 60 * 1000),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return otpDocument;
};

// Static method to verify OTP
OTPSchema.statics.verifyOTP = async function (
  userId: mongoose.Types.ObjectId,
  enteredOTP: number
): Promise<IOTPSchema | null> {
  const otpDocument = await this.findOne({
    userId,
    code: enteredOTP,
    expires: { $gt: new Date() },
  });

  return otpDocument;
};

export default mongoose.model<IOTPSchema, IOTPModel>("OTP", OTPSchema);