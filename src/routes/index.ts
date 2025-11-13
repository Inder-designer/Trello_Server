import { Router } from 'express';
import authRoutes from "./auth/index";
import boardRoutes from "./board/index";
import userRoutes from "./user/index";
import adminRoutes from "./admin/index";
import generalRoutes from "./general/index";
import carRoutes from "./car/index";
import { isAuthenticated } from '../middleware/auth';
const router = Router();

router.use("/auth", authRoutes);
router.use("/user", isAuthenticated, userRoutes);
router.use("/board", isAuthenticated, boardRoutes);
router.use("/car", carRoutes);
router.use("/admin", adminRoutes);
router.use("/", generalRoutes);

export default router;