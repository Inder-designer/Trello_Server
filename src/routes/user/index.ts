import { Router } from 'express';
import { addToCart, addWishlist, changePassword, getCart, getProfile, getWishlist, registerPartner, removeFromCart, removeWishlist, updateCartItem, updateProfile } from '../../Controllers/User/user.controller';
import { getLockStatus, setLockPin, changeLockPin, verifyLockPin, disableLockPin } from '../../Controllers/User/lockPanel.controller';
const router = Router();

router.get('/', getProfile);
router.patch('/update', updateProfile)
router.patch('/change-password', changePassword)

// Lock Panel
router.get('/lock-status', getLockStatus);
router.post('/lock-pin/set', setLockPin);
router.post('/lock-pin/change', changeLockPin);
router.post('/lock-pin/verify', verifyLockPin);
router.post('/lock-pin/disable', disableLockPin);

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