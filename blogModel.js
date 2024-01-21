const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    commentedbyuserid: String,
    displayname: String,
    comment: String,
    timestamp: String,
    thread: [this]
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
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;