const slugify = (text) => {
    return text
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFKC")
        .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // يشيل التشكيل والتطويل
        .replace(/\s+/g, "-")
        .replace(/[^\p{L}\p{N}_-]+/gu, "")
        .replace(/-{2,}/g, "-")
        .replace(/^-+|-+$/g, "");
};

module.exports = slugify;