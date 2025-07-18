import mongoose from "mongoose";

export interface IWishlistSchema {
    user: mongoose.Types.ObjectId;
    product: mongoose.Types.ObjectId;
}

const WishlistSchema = new mongoose.Schema<IWishlistSchema>({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
});
// unique property
WishlistSchema.index({ userId: 1, propertyId: 1 }, { unique: true });
WishlistSchema.index({ userId: 1 });

export default mongoose.model<IWishlistSchema>("Wishlists", WishlistSchema);