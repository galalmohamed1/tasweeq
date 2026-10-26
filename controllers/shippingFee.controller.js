const ShippingFee = require("../models/ShippingFee");
 
// GET /api/shipping-fee  (عام - الفرونت بيعرضها للعميل)
exports.getShippingFee = async (req, res) => {
    try {
        const doc = await ShippingFee.findOne({ key: "main" });
        res.json({ success: true, data: { shippingFee: doc ? doc.shippingFee : "0" } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
 
// PUT /api/shipping-fee  (أدمن)   body: { shippingFee: "50" }
// بيعمل السجل لو مش موجود، وبيعدّله لو موجود
exports.setShippingFee = async (req, res) => {
    try {
        const doc = await ShippingFee.findOneAndUpdate(
            { key: "main" },
            { $set: { shippingFee: String(req.body.shippingFee ?? ""), updatedBy: req.user._id } },
            { new: true, upsert: true, runValidators: true }
        );
 
        res.json({
            success: true,
            message: "تم تحديث مصاريف الشحن",
            data: { shippingFee: doc.shippingFee }
        });
    } catch (err) {
        if (err.name === "ValidationError") {
            return res.status(400).json({ success: false, message: err.message });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};