const multer = require('multer');
const randomString = require('randomstring');
const path = require('path');

function checkFileType(file, cb){
    const allowedType = /jpeg|png|jpg|gif/;

    const isMatchExt = allowedType.test((path.extname(file.originalname)).toLowerCase());
    
    const isMIMEMatch = allowedType.test(file.mimetype);

    if ( isMatchExt && isMIMEMatch ) {
        cb(null, true);
    } else {
        cb("Error: File Type Not Supported");
    }
}


function getProfilePicUpload(){
    let storage = multer.diskStorage({
        destination: function(req, file, cb){
            cb(null, './public/profile_pic');
        },
        filename: function(req, file, cb){
            let p1 = randomString.generate(5);
            let p2 = randomString.generate(5);
            let ext = (path.extname(file.originalname)).toLowerCase();

            cb(null, p1 + "_" + p2 + ext);
        }
    });

    return multer({
        storage: storage,
        limits: {
            fileSize: 1000000
        },
        fileFilter: function(req, file, cb){
            checkFileType(file, cb);
        }
    }).single('profile_pic');
}


module.exports = {
    getProfilePicUpload
}