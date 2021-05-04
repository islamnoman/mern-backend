// require('dotenv');
const router = require('express').Router();
const bcrypt = require('bcryptjs');
// const { json } = require('body-parser');
const bodyParser = require('body-parser');
const { check, validationResult, body } = require('express-validator');
const jwt = require('jsonwebtoken');
const moment = require('moment');

const User = require('./../models/User');
const token_key = process.env.TOKEN_KEY;

const verifyToken = require('./../middleware/verify_token');

const storage = require('./strorage');


// middleware setup
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


// url: http://localhost:500/api/user/
// default route
router.get('/', (req, res) => {
        return res.status(200).json(
            {
                "status": true,
                "message": "User default route."
            }
        );
    }
);


// user reg route
// url: http:localhost:500/api/user/register

router.post(
    '/register',
    [
        // check empty field
        check('username').not().isEmpty().trim().escape(),
        check('password').not().isEmpty().trim().escape(),

        // check email
        check('email').isEmail().normalizeEmail()
    ],
    (req, res) => {
        const errors = validationResult(req);

        // check error isnot empty
        if(!errors.isEmpty()){
            return res.status(400).json({
                "status": false,
                "errors": errors.array(),
                "message": "Form validation error.."
            });
        }

        // check email exist or not
        User.findOne({ email: req.body.email }).then(user => {
            
            if (user) {
                return res.status(409).json({
                    "status": false,
                    "message": "User email already exists"
                });
            } else {
                const salt = bcrypt.genSaltSync(10)
                const hashedPassword = bcrypt.hashSync(req.body.password, salt);

                // create user obj from user Schema
                const newUser = new User({
                    email: req.body.email,
                    username: req.body.username,
                    password: hashedPassword
                });

                // insert new user
                newUser.save().then(result => {
                    return res.status(200).json({
                        "status": true,
                        "user": result
                    });
                }).catch(error => {
                    return res.status(502).json({
                        "status": false,
                        "error": error
                    });
                });
            }
        }).catch(error => {
            return res.status(502).json({
                "status": false,
                "error": error
            });
        });


        // return res.status(200).json({
        //     "status": true,
        //     "data": req.body,
        //     "hashedPassword" : hashedPassword
        // });
    }
);

// user profile file upload route
// url: http:localhost:500/api/user/uploadProfilePic
// access: Private
// method: POST
router.post(
    '/uploadProfilePic',
    verifyToken,
    (req, res) => {
        let upload = storage.getProfilePicUpload();

        upload(req, res, (error) => {

            // if profile pic upload errors
            if (error) {
                return res.status(400).json({
                    "status": false,
                    "error": error,
                    "message": "File upload fail.."
                });
            }
                
            if (!req.file) {
                return res.status(400).json({
                    "status": false,
                    "message": "Please Upload Profile pic.."
                });
            }
            

            let temp = {
                profile_pic: req.file.filename,
                updatedAt: moment().format("DD/MM/YYYY") + ";"+ moment().format("hh:mm:ss")
            };

            // store new profile pic name to user document
            User.findOneAndUpdate({ _id: req.user.id }, { $set: temp })
                .then(user => {
                    return res.status(200).json({
                        "status": true,
                        "message": "File upload success",
                        "profile_pic": "http://localhost:500/profile_pic/" + req.file.filename
                    });
                })
                .catch(error => {
                    return res.status(502).json({
                        "status": false,
                        "message": "Database error.."
                    });
                });
        });
    }
);


// user login route
// url: http:localhost:500/api/users/login
// method: POST
router.post(
    '/login',
    [
        // check email
        check('email').isEmail().normalizeEmail(),
        // check empty field
        check('password').not().isEmpty().trim().escape()

        
    ],
    (req, res) => {
        const errors = validationResult(req);

        // check error isnot empty
        if(!errors.isEmpty()){
            return res.status(400).json({
                "status": false,
                "errors": errors.array(),
                "message": "Form validation error.."
            });
        }

        User.findOne({ email: req.body.email })
            .then((user) => {
                // if user dont exist
                if (!user) {
                    return res.status(404).json({
                        "status": false,
                        "message": "User don't exists"
                    });
                } else{
                    // match user password
                    let isPasswordMatch = bcrypt.compareSync(req.body.password, user.password);

                    // check password not match
                    if (!isPasswordMatch){
                        return res.status(401).json({
                            "status": false,
                            "message": "Password don't match.."
                        });
                    }

                    // json web token generate
                    let token = jwt.sign(
                        {
                            id: user._id,
                            email: user.email
                        },
                        token_key,
                        {
                            expiresIn: 3600
                        }
                    );

                    // if login success
                    return res.status(200).json({
                        "status": true,
                        "message": "User login success..",
                        "token": token,
                        "user": user
                    });
                }
            }).catch((error) => {
                return res.status(502).json({
                    "status": false,
                    "message": "Database error.."
                });
            });
    }
);

// router.get('/testJWT', verifyToken, (req, res) => {
//     console.log(req.user);
//     return res.status(200).json({
//         "status": true,
//         "message": "json web token working"
//     });
// });

module.exports = router;