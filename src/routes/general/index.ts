import { Router } from 'express';
import { getAllProduct, getProduct } from '../../Controllers/Product/product.controller';
import { getCategories } from '../../Controllers/Product/category.controller';
import upload from '../../middleware/multer';
import { uploadMultipleImages, uploadSingleImage } from '../../Controllers/Upload/upload.controller';
import { addComment, deleteComment, reactToComment } from '../../Controllers/Board/card.controller';
import { isAuthenticated } from '../../middleware/auth';
import { getNotifications, markNotificationAsRead } from '../../Controllers/Notification/notification.controller';
import { getAgoraToken } from '../../Controllers/General/general.controller';
const router = Router();

router.get('/product/:id', getProduct);
router.get('/products', getAllProduct);
router.get('/categories', getCategories)
router.get('/notifications', isAuthenticated, getNotifications)
router.post('/notification/read', isAuthenticated, markNotificationAsRead)
router.get('/agora-token', isAuthenticated, getAgoraToken);

router.post('/add-comment', isAuthenticated, addComment)
router.delete('/delete-comment', isAuthenticated, deleteComment)
router.post('/react-comment', isAuthenticated, reactToComment);

router.post("/upload-single", upload.single("image"), uploadSingleImage);
router.post("/upload-multiple", upload.array("images"), uploadMultipleImages);

export default router;