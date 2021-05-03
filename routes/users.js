// require('dotenv');
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { json } = require('body-parser');
const bodyParser = require('body-parser');
const { check, validationResult, body } = require('express-validator');
const jwt = require('jsonwebtoken');
const moment = require('moment');

const User = require('./../models/User');
const token_key = process.env.TOKEN_KEY;


// middleware setup
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


// url: http://localhost:500/api/users/
// default route
router.get(
    '/',
    (req, res) => {
        res.status(200).json(
            {
                "status": true,
                "message": "User default route."
            }
        );
    }
);


// user reg route
// url: http:localhost:500/api/users/register

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

        return res.status(200).json({
            "status": true,
            "data": req.body
        });
    }
);

module.exports = router;