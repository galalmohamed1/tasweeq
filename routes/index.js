const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth.routes"));

router.use("/users", require("./user.routes"));

router.use("/products", require("./product.routes"));

router.use("/contact", require("./contact.routes"));

router.use("/coupons", require("./coupon.routes"));

router.use("/categories", require("./category.routes"));

router.use("/details-subcategories", require("./detailsSubCategory.routes"));

router.use("/sub-categories", require("./subCategory.routes"));

router.use("/wishlist", require("./wishlist.routes"));

router.use("/shipping-fee", require("./shippingFee.routes"));

router.use("/cart", require("./cart.routes"));

router.use("/orders", require("./order.routes"));

// router.use("/banner", require("./banner.routes"));
// router.use("/faqs", require("./faq.routes"));
// router.use("/testimonials", require("./testimonial.routes"));
// router.use("/store", require("./store.routes"));


module.exports = router;