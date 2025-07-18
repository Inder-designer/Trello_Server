import mongoose from "mongoose";

export interface IcategorySchema {
    name: string,
    slug: string,
    orderNo: number,
    parent: mongoose.Types.ObjectId | null;
    level: 0 | 1 | 2
}

const categorySchema = new mongoose.Schema<IcategorySchema>(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        orderNo: { type: Number, default: 0 },
        parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
        level: {
            type: Number,
            enum: [0, 1, 2],
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model<IcategorySchema>("Category", categorySchema);