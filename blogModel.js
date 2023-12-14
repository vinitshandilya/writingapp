const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: String,
    subtitle: String,
    author: String,
    timestamp: { type: Date, default: Date.now },
    body: String,
    images: [String],
    footnotes: [String],
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;