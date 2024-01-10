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
  notifications: [{
    senderuserid: String,
    receiveruserid: String,
    notiftext: String,
  }],
  unreadnotification: Boolean,
  preferences: [{
    theme: String,
  }],
  bookmarks: [
    { blogid: String, highlightes: [ { index: Number, length: Number }] }
  ],
});

userSchema.methods.authenticate = function(password) {
    return bcrypt.compareSync(password, this.password);
};

userSchema.plugin(passportLocalMongoose, { username: 'username' });


module.exports = mongoose.model('User', userSchema);
