// include library
const mongoose = require('mongoose');
const assert = require('assert');
// if need local db like robo t3 
// const db_url = process.env.DB_URL_LOCAL;
// if mongodb atlas like online db
const db_url = process.env.DB_URL;


// db connect systax
mongoose.connect(
    db_url,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: true
    },
    (error, link) => {
        // check db connect error
        // assert.strictEqual(error, null, "Db Connect Fail..");
        console.log(error);

        // database connect success
        // console.log(link);
        console.log("DB connect successfull");
    }
);