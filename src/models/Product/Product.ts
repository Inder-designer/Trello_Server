import mongoose from "mongoose";

export interface IProduct {
    name: string;
    description: string;
    images: {
        public_id: string;
        url: string;
    }[];
    brand: string;
    slug: string;
    tags: string[];
    avgRatings: number;
    price: number;
    discount: number;
    Stock: number;
    orderLimit: number;
    attributes: {
        name: string;
        values: string[];
    }[];
    sku: string;
    variants: mongoose.Types.ObjectId[];
    isActive?: boolean;
}

const productSchema = new mongoose.Schema<IProduct>(
    {
        name: {
            type: String,
            required: [true, "Please Enter product Name"],
            trim: true,
        },
        description: String,
        images: [
            {
                public_id: String,
                url: String,
            },
        ],
        brand: String,
        slug: String,
        tags: [
            {
                type: String,
                default: null
            }
        ],
        avgRatings: {
            type: Number,
            default: 0,
        },
        price: {
            type: Number,
            required: [true, "Please Enter product Price"],
        },
        discount: {
            type: Number,
            default: 0,
        },
        Stock: {
            type: Number,
            required: [true, "Please Enter product Stock"],
            default: 1,
        },
        orderLimit: {
            type: Number,
            default: 1,
        },
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
        sku: {
            type: String,
        },
        variants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Variant",
            }
        ],
        isActive: Boolean
    },
    { timestamps: true }
);

export default mongoose.model<IProduct>("Product", productSchema);