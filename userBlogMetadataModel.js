const mongoose = require('mongoose');

const userBlogMetadataSchema = new mongoose.Schema({
  userid: {
    type: String,
    required: true
  },
  blogid: {
    type: String,
    required: true
  },
  isfavourite: {
    type: Boolean,
    default: false // Optional: Sets the default value to false
  },
  markedUpDom: {
    type: String,
  }

});

userBlogMetadataSchema.index({ userid: 1, blogid: 1 }, { unique: true });

const UserBlogMetadata = mongoose.model('UserBlogMetadata', userBlogMetadataSchema);

module.exports = UserBlogMetadata;
