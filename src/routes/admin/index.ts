import { Router } from 'express';
import { addProduct, updateProduct } from '../../Controllers/Product/product.controller';
import { addCategory, editCategory, getCategories } from '../../Controllers/Product/category.controller';
const router = Router();

router.post('/add-product', addProduct);
router.patch('/product/:id', updateProduct);

router.post('/add-category', addCategory)
router.patch('/category/:id', editCategory)
router.get('/categories', getCategories)
export default router;