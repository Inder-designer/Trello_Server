import { Router } from 'express';
import { addToCart, addWishlist, changePassword, getCart, getProfile, getWishlist, registerPartner, removeFromCart, removeWishlist, updateCartItem, updateProfile } from '../../Controllers/User/user.controller';
import { getLockStatus, setLockPin, changeLockPin, verifyLockPin, disableLockPin } from '../../Controllers/User/lockPanel.controller';
import { setup2FA, enable2FA, disable2FA, get2FAStatus, verify2FAToken } from '../../Controllers/User/twoFactor.controller';
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

// Two-Factor Authentication
router.get('/2fa/status', get2FAStatus);
router.post('/2fa/setup', setup2FA);
router.post('/2fa/enable', enable2FA);
router.post('/2fa/disable', disable2FA);
router.post('/2fa/verify', verify2FAToken);

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