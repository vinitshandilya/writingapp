const mongoose = require('mongoose');

const userBlogMetadataSchema = new mongoose.Schema({
  userid: {
    type: String,
    required: true,
    unique: true
  },
  blogid: {
    type: String,
    required: true,
    unique: true
  },
  isfavourite: {
    type: Boolean,
    default: false // Optional: Sets the default value to false
  },
  markedUpDom: {
    type: String,
  }

});

const UserBlogMetadata = mongoose.model('UserBlogMetadata', userBlogMetadataSchema);

module.exports = UserBlogMetadata;
