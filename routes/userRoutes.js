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
        check('username').not().isEmpty().withMessage("validation.username_empty").trim().escape(),
        check('password').not().isEmpty().withMessage("validation.password_empty").trim().escape(),
        check('password2').not().isEmpty().withMessage("validation.password2_empty").trim().escape(),

        // check email
        check('email').isEmail().normalizeEmail().withMessage("validation.invalid_email")
    ],
    (req, res) => {
        const errors = validationResult(req);

        // check error is not empty
        if(!errors.isEmpty()){

            let error = {}

            for (index = 0; index < errors.array().length; index++){
                error = {
                    ...error,
                    [errors.array()[index].param] : errors.array()[index].msg
                }
            }
            return res.status(400).json({
                "status": false,
                "error": error,
                "message": "Form validation error.."
            });
        }

        // check passwor = retype password
        if (req.body.password != req.body.password2){
            return res.status(400).json({
                "status": false,
                "error": {
                    "password2": "validation.password2_not_same"
                },
                "message": "Form validation error.."
            });
        }

        // check email exist or not
        User.findOne({ email: req.body.email }).then(user => {
            
            if (user) {
                return res.status(409).json({
                    "status": false,
                    error: {
                        "email": "validation.email_exists"
                    },
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
                        "error": {
                            "db_error": "validation.db_error"
                        }
                    });
                });
            }
        }).catch(error => {
            return res.status(502).json({
                "status": false,
                "error": {
                    "db_error": "validation.db_error"
                }
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
                    "error": {
                        "profile_pic": "validation.profile_pic_empty"
                    },
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
                        "error": {
                            "db_error": "validation.db_error"
                        },
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
        check('email').isEmail().normalizeEmail().withMessage("validation.invalid_email"),
        // check empty field
        check('password').not().isEmpty().withMessage("validation.password_empty").trim().escape()

        
    ],
    (req, res) => {
        const errors = validationResult(req);

        // check error isnot empty
        if(!errors.isEmpty()){

            let error = {}

            for (index = 0; index < errors.array().length; index++){
                error = {
                    ...error,
                    [errors.array()[index].param] : errors.array()[index].msg
                }
            }

            return res.status(400).json({
                "status": false,
                "error": error,
                "message": "Form validation error.."
            });
        }

        User.findOne({ email: req.body.email })
            .then((user) => {
                // if user dont exist
                if (!user) {
                    return res.status(404).json({
                        "status": false,
                        "error": {
                            "email": "validation.email_not_exists"
                        },
                        "message": "User don't exists"
                    });
                } else{
                    // match user password
                    let isPasswordMatch = bcrypt.compareSync(req.body.password, user.password);

                    // check password not match
                    if (!isPasswordMatch){
                        return res.status(401).json({
                            "status": false,
                            "error": {
                                "password": "validation.password_not_match"
                            },
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
                    "error": {
                        "db_error": "validation.db_error"
                    },
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


// user change password route
// url: http:localhost:500/api/user/change_password

router.put(
    '/change_password',
    verifyToken,
    [
        // check empty field
        check('username').not().isEmpty().withMessage("validation.username_empty").trim().escape(),
        check('newPassword').not().isEmpty().withMessage("validation.password_empty").trim().escape(),
        check('newPassword2').not().isEmpty().withMessage("validation.password2_empty").trim().escape(),
        check('oldPassword').not().isEmpty().withMessage("validation.password_empty").trim().escape()
    ],
    (req, res) => {
        const errors = validationResult(req);

        // check error is not empty
        if(!errors.isEmpty()){

            let error = {}

            for (index = 0; index < errors.array().length; index++){
                error = {
                    ...error,
                    [errors.array()[index].param] : errors.array()[index].msg
                }
            }
            return res.status(400).json({
                "status": false,
                "error": error,
                "message": "Form validation error.."
            });
        }

        // check passwor = retype password
        if (req.body.newPassword != req.body.newPassword2){
            return res.status(400).json({
                "status": false,
                "error": {
                    "newPassword2": "validation.password2_not_same"
                },
                "message": "Form validation error.."
            });
        }

        // check email exist or not
        User.findOne({ _id: req.user.id }).then(user => {

            // check old password match with password in database
            const isMatch = bcrypt.compareSync(req.body.oldPassword, user.password);

            if (!isMatch){
                return res.status(400).json({
                    "status": false,
                    error: {
                        "oldPassword": "validation.oldPassword_not_match"
                    },
                    "message": "Old password not match in db."
                });
            }

            // hash new password
            const salt = bcrypt.genSaltSync(10)
            const hashedPassword = bcrypt.hashSync(req.body.newPassword, salt);
            // update new password
            const newData = {
                username: req.body.username,
                password: hashedPassword,
                updatedAt: moment().format("DD/MM/YYYY") + ";"+ moment().format("hh:mm:ss")
            }

            User.findOneAndUpdate({_id: req.user.id}, { $set: newData }, { new: true }).then(user => {
                return res.status(200).json({
                    "status": true,
                    "user": {
                        "username": user.username
                    }
                });
            }).catch(error => {
                return res.status(502).json({
                    "status": false,
                    "error": {
                        "db_error": "validation.db_error"
                    }
                });
            })
            
        }).catch(error => {
            return res.status(502).json({
                "status": false,
                "error": {
                    "db_error": "validation.db_error"
                }
            });
        });
    }
);

module.exports = router;