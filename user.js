const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  firstname: String,
  lastname: String,
  bio: String,
  following: [String],
  followers: [String],
  paidsubscribers: [String],
  monthlysubscription: String,
  yearlysubscription: String,
  notificationcount: String,
  bookmarks: [{
    blogid: String,
    startidx: Number,
    endidx: Number,
  }],
});

userSchema.methods.authenticate = function(password) {
    return bcrypt.compareSync(password, this.password);
};

userSchema.plugin(passportLocalMongoose, { username: 'username' });


module.exports = mongoose.model('User', userSchema);
