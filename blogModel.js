const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    userid: String,
    title: String,
    subtitle: String,
    author: { type: String, default: 'Anonymous' },
    timestamp: { type: Date, default: Date.now },
    body: String,
    // images: [String],
    // footnotes: [String],
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;