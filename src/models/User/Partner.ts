import mongoose from "mongoose";

const PartnerSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        partnerType: {
            type: String,
            enum: ["individual", "business"]
        },
        individualKyc: {
            fullName: {
                type: String,
                required: function (this: any) { return this.partnerType === 'individual'; }
            },
            kycIdType: {
                type: String,
                enum: ['aadhaar', 'passport', 'driving_license', 'voter_id'],
                required: function (this: any) { return this.partnerType === 'individual'; }
            },
            kycIdNumber: {
                type: String,
                required: function (this: any) { return this.partnerType === 'individual'; }
            },
            kycDocument: {
                url: { type: String },
                publicId: { type: String }
            },
        },
        businessDetails: {
            type: new mongoose.Schema({
                listingPreference: {
                    type: String,
                    enum: ['rent', 'sell', 'both'],
                    required: true
                },
                businessName: {
                    type: String,
                    required: true
                },
                yearsOperation: {
                    type: String,
                    required: true
                },
                businessAddress: {
                    type: String,
                    required: true
                },
                city: {
                    type: String,
                    required: true
                },
                state: {
                    type: String,
                    required: true
                },
                postalCode: {
                    type: String,
                    required: true
                },
                country: {
                    type: String,
                    required: true
                },
                contactName: {
                    type: String,
                    required: true
                },
                email: {
                    type: String,
                    required: true
                },
                number: {
                    type: String,
                    required: true
                },
                documents: {
                    type: [
                        {
                            document: {
                                url: { type: String },
                                publicId: { type: String },
                            },
                            idType: String
                        }
                    ],
                    required: true
                },
                users: {
                    type: [
                        {
                            userId: {
                                type: mongoose.Schema.Types.ObjectId,
                                ref: "User",
                            },
                            permissions: {
                                type: [String],
                                enum: ["full", "edit", "view", "manage_vehicles", "manage_response",],
                                default: ["view"]
                            }
                        }
                    ],
                    default: []
                }
            }, { _id: false }),
            required: function (this: any) { return this.partnerType === 'business'; }
        },
        // termsAccepted: {
        //     type: Boolean,
        //     required: true
        // },
        isVerified: {
            type: Boolean,
            default: false
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        }
    },
    { timestamps: true }
)

export default mongoose.model("Partner", PartnerSchema);