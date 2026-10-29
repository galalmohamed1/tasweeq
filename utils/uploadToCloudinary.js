const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = (buffer, folder = "ecommerce") => {
    return new Promise((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(
            {
                folder
            },
            (error, result) => {

                if (error) {
                    return reject(error);
                }

                resolve({
                    public_id: result.public_id,
                    secure_url: result.secure_url
                });
            }
        );

        stream.end(buffer);
    });
};

module.exports = uploadToCloudinary;