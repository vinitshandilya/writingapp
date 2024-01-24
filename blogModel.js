const mongoose = require('mongoose');

const reply2ReplySchema = new mongoose.Schema({
    commentedbyuserid: String,
    displayname: String,
    comment: String,
    timestamp: String,
    likedby: [String],
});

const replySchema = new mongoose.Schema({
    commentedbyuserid: String,
    displayname: String,
    comment: String,
    timestamp: String,
    reply2Replies: [reply2ReplySchema],
    likedby: [String],
});

const commentSchema = new mongoose.Schema({
    commentedbyuserid: String,
    displayname: String,
    comment: String,
    timestamp: String,
    replies: [replySchema],
    likedby: [String],
});

const blogSchema = new mongoose.Schema({
    userid: String,
    title: String,
    subtitle: String,
    author: { type: String, default: 'Anonymous' },
    timestamp: { type: Date, default: Date.now },
    formatteddate: String,
    body: String,
    previewtext: String,
    timetoread: String,
    tags: [String],
    paywall: Boolean,
    comments: [commentSchema],
    likedby: [String],
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;