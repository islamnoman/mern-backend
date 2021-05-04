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
                "errors": errors.array()
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

// user reg route
// url: http:localhost:500/api/user/uploadProfilePic
// method: POST
router.post(
    '/uploadProfilePic',
    (req, res) => {
        let upload = storage.getProfilePicUpload();

        upload(req, res, (error) => {
            console.log(req.file);

            return res.status(200).json({
                "status": true,
                "error": error,
                "message": "File upload success"
            });
        });
    }
);


module.exports = router;