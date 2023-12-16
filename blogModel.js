const mongoose = require('mongoose');

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
    // images: [String],
    // footnotes: [String],
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;