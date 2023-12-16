const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    firstname: String,
    lastname: String,
});

userSchema.methods.authenticate = function(password) {
    return bcrypt.compareSync(password, this.password);
};

userSchema.plugin(passportLocalMongoose, { username: 'username' });


module.exports = mongoose.model('User', userSchema);
