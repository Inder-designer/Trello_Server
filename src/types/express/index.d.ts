import mongoose from "mongoose";
import { ICar } from "../../models/Car/Car";
import { IProduct } from "../../models/Product/Product";
import { IVariantSchema } from "../../models/Product/VariantSchema";
import { IUser } from "../IUser";

declare global {
    namespace Express {
        interface User extends IUser {
            _id: mongoose.Types.ObjectId | undefined
        }
        interface Request {
            user?: IUser;
            product?: IProduct;
            variant?: IVariantSchema;
            car?: ICar
        }
    }
}