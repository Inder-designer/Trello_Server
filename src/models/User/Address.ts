import mongoose from "mongoose";

// Define the address sub-schema
const AddressSchema = new mongoose.Schema({
    mobile: { type: String, },
    name: { type: String, },
    addressType: { type: String, enum: ['HOME', 'OFFICE'], },
    streetAddress: { type: String, },
    city: { type: String, },
    locality: { type: String, },
    state: { type: String, },
    country: { type: String, },
    pincode: { type: String, },
    notAvailableDays: { type: [String], default: ["SATURDAY", "SUNDAY"] },
    isDefault: { type: Boolean, default: false },
});

// Define the main schema
const UserAddressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
    },
    addresses: { type: [AddressSchema], default: [] }
});

export default mongoose.model('UserAddress', UserAddressSchema)