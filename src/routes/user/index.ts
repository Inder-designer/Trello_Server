import { Router } from 'express';
import { addToCart, addWishlist, changePassword, getCart, getProfile, getWishlist, registerPartner, removeFromCart, removeWishlist, updateCartItem, updateProfile } from '../../Controllers/User/user.controller';
const router = Router();

router.get('/', getProfile);
router.patch('/update', updateProfile)
router.patch('/change-password', changePassword)

// Wishlist
router.get('/wishlist', getWishlist);
router.post('/register-partner', registerPartner);

router.route('/wishlist/:id')
    .put(addWishlist)
    .delete(removeWishlist)

// Cart
router.route('/cart')
    .get(getCart)
    .put(addToCart)
    .patch(updateCartItem)
    .delete(removeFromCart)

// Partner
export default router;