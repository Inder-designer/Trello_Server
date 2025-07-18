import mongoose from "mongoose";

interface IcartItem {
    product: mongoose.Types.ObjectId;
    variant?: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
    subtotal: number;
}

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    variant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variant",
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
    price: {
        type: Number,
    },
    subtotal: {
        type: Number,
    },
});

export interface IcartSchema {
    user: mongoose.Types.ObjectId;
    items: IcartItem[];
    totalPrice: number;
}

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true, // One cart per user
        },
        items: [cartItemSchema],
        totalPrice: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// calculate subtotal
cartItemSchema.pre("save", function (next) {
    this.subtotal = (this.price ?? 0) * this.quantity;
    next();
})

// Optional: Middleware to recalculate total price before saving
cartSchema.pre("save", function (next) {
    this.totalPrice = this.items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);
    next();
});

export default mongoose.model("Cart", cartSchema);
