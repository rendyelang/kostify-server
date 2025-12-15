const multer = require('multer')
const path = require('path')
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const cloudinary = require('../config/cloudinary')

const multerMiddleware = (folderName) => {
    return async (req, res, next) => {

        // configure cloudinary storage
        const storage = new CloudinaryStorage({
            cloudinary: cloudinary,
            params: {
                folder: `kostify/${folderName}`,
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif']
            }
        })

        // Filter hanya gambar
        const fileFilter = (req, file, cb) => {
            const allowedTypes = /jpg|jpeg|png|webp|avif/;
            const isMimeType = allowedTypes.test(file.mimetype);
            const isExtName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        
            if (isMimeType && isExtName) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed (jpg, jpeg, png, webp, avif)'));
            }
        };

        const upload = multer({
            storage,
            fileFilter,
            limits: { fileSize: 3 * 1024 * 1024 } // 3MB limit
        }).array('images', 5); // maksimal 5 file

        upload(req, res, async (err) => {
            if (err instanceof multer.MulterError) {
                // Error dari Multer (misalnya, ukuran file terlalu besar)
                return res.status(400).json({ message: err.message });
            } else if (err) {
                return res.status(400).json({ message: err.message });
            }

            // console.log("debug req.files dari middleware", req.files)
        
            next(); // lanjut ke controller
        });
    }
}

module.exports = multerMiddleware