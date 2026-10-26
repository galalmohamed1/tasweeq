const express = require("express");
const router = express.Router();
 
const {
    getCart,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart
} = require("../controllers/cart.controller");
 
const { protect } = require("../middlewares/auth");
 
// كل الـ routes هنا محتاجة تسجيل دخول
router.use(protect);
 
router.get("/", getCart);
router.post("/", addToCart);
router.put("/:id", updateCartItemQuantity);       // :id = cart id
router.delete("/clear/:id", clearCart);           // لازم قبل /:productId
router.delete("/:productId", removeFromCart);     
 
module.exports = router;