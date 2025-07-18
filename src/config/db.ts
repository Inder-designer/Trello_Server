import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const connectDB = async () => {
    try {
        console.log("Connecting to MongoDB...");
        const connection = await mongoose.connect(process.env.MONGO_URI!);
        console.log(`✅ MongoDB connected: ${connection.connection.host}`);
    } catch (error) {
        if (error instanceof Error) {
            console.error("❌ MongoDB connection failed:", error.message);
        } else {
            console.error("❌ MongoDB connection failed:", error);
        }
        process.exit(1); // Exit process on failure
    }
};

export default connectDB;
