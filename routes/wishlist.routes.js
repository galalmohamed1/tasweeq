const express = require("express");
const router = express.Router();

const {
    getWishlist,
    addToWishlist,
    removeFromWishlist
} = require("../controllers/wishlist.controller");
const { protect } = require('../middlewares/auth')
const { isAdmin } = require('../middlewares/isAdmin')

router.use(protect);

router.get("/", getWishlist);
router.post("/", addToWishlist);
router.delete("/:productId", removeFromWishlist);

module.exports = router;