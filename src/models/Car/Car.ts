import mongoose from 'mongoose';

export interface ICar {
    listedBy: mongoose.Types.ObjectId;
    title: string;
    carNo: string;
    brand: string;
    model: string;
    Variant?: string;
    color?: string;
    carType?: "Hatchback" | "Sedan" | "SUV" | "Luxury" | "MUV" | "Convertible" | "Van";
    year: number;
    transmission?: string;
    fuelType?: string;
    seats: number;
    doors: number;
    category: string;
    condition?: String;
    kmDriven?: number;
    ownership?: number;
    isSold: boolean,


    listingType: "sell" | "rent";
    images?: {
        public_id: string;
        url: string;
    }[];
    thumbnail: string;
    features?: string[];
    price?: number;
    isNegotiable?: boolean;
    description: string;
    rentDetails?: any;
    saleDetails?: any;
    rentPrice?: any;
    ownerName: string,
    ownerEmail: string,
    ownerPhone: string,
    documents?: any;
    views?: number;
    status: 'draft' | 'active' | 'inactive';
    currentStep: string;
}
const carListingSchema = new mongoose.Schema<ICar>(
    {
        listedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        // Car Info
        title: { type: String, required: true },
        carNo: { type: String, required: true, unique: true },
        brand: { type: String, required: true },
        Variant: String,
        model: { type: String, required: true },
        year: { type: Number, required: true, min: 1990, max: new Date().getFullYear() + 1 },
        transmission: { type: String, enum: ["manual", "automatic"] },
        fuelType: { type: String, enum: ["petrol", "diesel", "electric", "hybrid"] },
        seats: { type: Number, required: true, min: 1 },
        doors: { type: Number, required: true, min: 2 },
        category: { type: String, required: true },
        carType: {
            type: String,
            enum: ['Hatchback', 'Sedan', 'SUV', 'Luxury', 'MUV', 'Convertible', 'Van'],
        },
        color: String,
        listingType: {
            type: String,
            enum: ["sell", "rent"],
            required: true
        },
        condition: { type: String, enum: ['new', 'used'] },
        kmDriven: Number,
        ownership: {
            type: Number,
            enum: [1, 2, 3, 4, 5],
        },

        // Images
        images: [
            {
                public_id: String,
                url: String,
            },
        ],
        thumbnail: String,

        // Features
        price: Number,
        isNegotiable: Boolean,
        features: { type: [String] },
        description: String,


        rentDetails: {
            // Location & Availability
            location: String,
            address: String,
            city: String,
            availableFrom: Date,
            availableTo: Date,
            available: Boolean,

            // Pricing & Charges
        },

        rentPrice: {
            price: Number,
            priceUnit: { type: String, enum: ['hour', 'day', 'week'] },
            deposit: Number,
            lateFee: Number,
            milageTypeUnlimited: Boolean,
            kmDrive: Number,
            extraKmFee: Number
        },

        isSold: Boolean,

        // Owner Info
        ownerName: String,
        ownerEmail: String,
        ownerPhone: String,

        // Documents
        documents: {
            carRegistration: {
                url: { type: String },
                publicId: { type: String },
            },
            insuranceDocument: {
                url: { type: String },
                publicId: { type: String },
            },
        },
        views: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['draft', 'active', 'inactive'],
            default: 'draft'
        },
        currentStep: {
            type: String,
            default: "carInfo"
        }

    },
    { timestamps: true }
);

carListingSchema.index({ brand: 1, year: 1, seats: 1, carType: 1, transmission: 1, listingType: 1 });
carListingSchema.index({ "rentPrice.price": 1 });
carListingSchema.index({ price: 1 });

carListingSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        delete ret.saleDetails?.ownerEmail;
        delete ret.saleDetails?.ownerPhone;
        return ret;
    }
});

export default mongoose.model<ICar>("Cars", carListingSchema);
