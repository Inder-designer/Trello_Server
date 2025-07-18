import mongoose from "mongoose";

export interface IVariantSchema {
    _id: mongoose.Types.ObjectId;
    sku: string;
    price: number;
    discount: number;
    images: {
        public_id: string;
        url: string;
    }[];
    attributes: {
        name: string | null;
        values: string[];
    }[];
    Stock: number;
    orderLimit: number;
    isActive?: boolean;
}

const VariantSchema = new mongoose.Schema<IVariantSchema>(
    {
        sku: {
            type: String,
        },
        price: {
            type: Number,
            required: [true, "Please Enter product Price"],
        },
        discount: {
            type: Number,
            default: 0,
        },
        images: [
            {
                public_id: String,
                url: String,
            },
        ],
        attributes: [
            {
                name: {
                    type: String,
                    default: null,
                },
                values: [
                    {
                        type: String,
                        default: null,
                    }
                ],
            }
        ],
        Stock: {
            type: Number,
            required: [true, "Please Enter product Stock"],
            default: 1,
        },
        orderLimit: {
            type: Number,
            default: 1,
        },
        isActive: Boolean
    },
    { timestamps: true }
);

export default mongoose.model<IVariantSchema>("Variant", VariantSchema);