const multer = require('multer');
const path = require('path');


const fileFilter = (req,file,cb)=>{
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedImages = ['.png','.jpg','.jpeg'];
    const allowedVideos = ['.mp4','.webm','.mov'];

    if(file.fieldname === 'videos'){
        if(!allowedVideos.includes(ext)){
            return cb(new Error('Only videos allowed .mp4,.webm,.mov'),false)
        }
    } else {
        if(!allowedFiles(ext, allowedImages)){
            return cb(new Error('Only images allowed .png,.jpg,.jpeg'),false)
        }
    }
    cb(null, true);
}

const allowedFiles = (ext, list) => list.includes(ext);

const storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'uploads')
    },
    filename:(req,file,cb)=>{
        cb(null, Date.now() + '_' + file.originalname);
    }
})
const MB = 1024 * 1024
const upload = multer({
    storage,
    fileFilter,
    limits:{fileSize: 50 * MB}
});

const uploadProductMedia = upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 3 }
]);

module.exports = {upload, uploadProductMedia};