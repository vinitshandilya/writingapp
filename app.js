const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const Blog = require('./blogModel');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./user');
const UserBlogMetadata = require('./userBlogMetadataModel');

const app = express();
const port = 3000;
const db_uri = 'mongodb+srv://vinitshandilya:CQozNpwwVhUOXSdT@cluster0.mgznywr.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(db_uri);

// Serve static files from the public folder
app.use(express.static('public', { 'extensions': ['html', 'css', 'js'] }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'your-secret-key', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Landing page for user login
app.get('/', (req, res) => {
    const message = req.query.message || null;
    res.render('landingpage', { message }); // Create landingpage.ejs in your views folder
});

// Render user registration page
app.get('/register', (req, res) => {
    res.status(200).render('registerpage');
});

// Register new user
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.redirect('/?message=User already exists with this username. Please login with your username.');
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.redirect('/?message=Account already exists with this email. Please login with your username.');
        }

        // If both checks pass, proceed with user registration
        const user = await User.register(new User({ username, email }), password);
        
        req.login(user, (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            return res.redirect('/?message=Thank you for registering. Please login with your username and password.');
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Log in existing user
app.post('/login', passport.authenticate('local', {
    successRedirect: '/set-username-and-redirect',
    failureRedirect: '/?message=Invalid credentials.',
    failureFlash: true,
}));

app.get('/set-username-and-redirect', (req, res) => {
    // Set the username in the session
    // console.log(req.user);
    req.session.user = req.user;
    req.session.username = req.user.username;
    // Redirect to /index
    res.redirect('/homepage');
});


// Logout
app.get('/logout', (req, res) => {
    // Destroy the session and redirect to the login page
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Define a middleware to check if the user is authenticated before accessing certain routes
const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/?message=Invalid credentials.');
};

// Logged-in user lands here
app.get('/homepage', isLoggedIn, async (req, res) => {
    const loggedinuser = req.session.user;
    try {
        const personalblogs = await Blog.find({
            $or: [
              { userid: loggedinuser._id }, // Blogs by the logged-in user
              { userid: { $in: loggedinuser.following } } // Blogs by users in following list
            ]
          });
        const communityusers = await User.find( { });
        res.status(200).render('homepage', { personalblogs, loggedinuser, communityusers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/index', isLoggedIn, async (req, res) => {
    const user = req.session.user;
    try {
        const blogs = await Blog.find( { userid: user._id });
        const communityusers = await User.find( { });
        res.status(200).render('index', { blogs, user: user, communityusers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// render new blog writing page
app.get('/index/createnew', isLoggedIn, async (req, res) => {
    const loggedinuser = req.session.user;
    if(loggedinuser.firstname === null || loggedinuser.firstname === undefined || loggedinuser.firstname.trim() === '') {
        // Redirect to user profile page to complete user profile
        return res.status(200).render('userprofile', { user: loggedinuser });
    } else {
        return res.status(200).render('createnewblog', { blog: null });
    }
});


// save new blog
app.post('/index/saveblog', isLoggedIn, async (req, res) => {
    const today = new Date();
        const options = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        };
    const formattedDate = today.toLocaleDateString('en-US', options);

    try {
        const newBlog = new Blog({
            userid: req.session.user._id,
            title: req.body.title,
            subtitle: req.body.subtitle,
            body: req.body.body,
            author: req.session.user.firstname.toUpperCase() + ' ' + req.session.user.lastname.toUpperCase(),
            timestamp: Date.now(),
            formatteddate: formattedDate.toUpperCase(), 
            timetoread: calculateReadingTime(req.body.body, 250) + ' MIN READ',
            tags: getTagsListFromString(req.body.tags)
        });

        const savedBlog = await newBlog.save();
        // res.redirect(`/index?id=${savedBlog._id}`);
        res.status(200).json({ savedblogid: savedBlog._id });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// get a blog detail
app.get('/index/blogs/:id', isLoggedIn, async (req, res) => {
    const userid = req.session.user._id;
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).send('Blog not found');
        }

        res.status(200).json({ blog, userid: userid, editing: false });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Edit Blog Route
app.get('/index/blogs/:id/edit', isLoggedIn, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).send('Blog not found');
        }
        
        console.log(blog);
        res.status(200).render('createnewblog', { blog: blog });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// save edited blog
app.post('/index/blogs/:id/edit', isLoggedIn, async (req, res) => {
    const today = new Date();
    const options = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        };
    const formattedDate = today.toLocaleDateString('en-US', options);
    try {
        const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, {
            title: req.body.title,
            subtitle: req.body.subtitle,
            body: req.body.body,
            author: req.session.user.firstname.toUpperCase() + ' ' + req.session.user.lastname.toUpperCase(),
            timestamp: Date.now(),
            formatteddate: formattedDate.toUpperCase(),
            timetoread: calculateReadingTime(req.body.body, 250) + ' MIN READ',
            tags: getTagsListFromString(req.body.tags)
        }, { new: true });

        // res.redirect(`/index/blogs/${updatedBlog._id}`);
        // res.redirect(`/index?id=${updatedBlog._id}`);
        res.status(200).json({ savedblogid: updatedBlog._id });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Blog Route
app.get('/index/blogs/:id/delete', isLoggedIn, async (req, res) => {
    try {
        const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
        if (!deletedBlog) {
            return res.status(404).send('Blog not found');
        }
        res.redirect('/homepage');

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/index/profile', isLoggedIn, async (req, res) => {
    var userid = req.user._id;
    try {
        const user = await User.findById(userid);
        if(user) {
            return res.status(200).render('userprofile', { user });
        }
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }

});

// Update user
app.post('/index/updateuser', isLoggedIn, async (req, res) => {
    console.log(req.body);
    var userid = req.user._id;

    try {
        const user = await User.findById(userid);
        if(user) {
            user.firstname = req.body.firstname;
            user.lastname = req.body.lastname;
            user.bio = req.body.bio;
            await user.save();
            console.log('user updated!');
        }
    } catch(err) {
        res.status(500).send('Internal Server Error');
    }

    console.log(userid);
    res.redirect('/homepage');

})

// Update following and followers
app.post('/index/updatefollowingandfollowers', isLoggedIn, async(req, res) => {
    console.log(req.body);
    console.log('Logged in user: ' + req.body.loggedInUserId);
    console.log('started following: ' + req.body.communityUserId);

    // 1. Search User MongoDB for the logged-in user
    try {
        const loggedInUser = await User.findById(req.body.loggedInUserId);
        if (!loggedInUser) {
            return res.status(400).json({ message: 'User not found' });
        }

        // 2. Check if user already follows the community
        if (loggedInUser.following.includes(req.body.communityUserId)) {
            return res.status(400).json({ message: 'already follows this community user' });
        }

        // 3. Add the communityUserId to the "following" array
        loggedInUser.following.push(req.body.communityUserId);

        // 4. Save the updated user document
        await loggedInUser.save();

        // 5. (Optional) Update Follower list of community user (if needed)
        // ... Add code to update followers list of community user ...

        const communityUser = await User.findById(req.body.communityUserId);

        if (!communityUser.followers.includes(req.body.loggedInUserId)) {
            // Add the logged-in user ID to the `followers` array of the community user:
            communityUser.followers.push(req.body.loggedInUserId);
          
            // Save the updated community user document:
            await communityUser.save();
        }

        return res.json({ message: 'Following added successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }

});

app.post('/index/blogs/updateuserblogmetadata', isLoggedIn, async (req, res) => {
    console.log(req.body.blogusermetadata);
    const { userid, blogid, isFavourite, markedUpDom } = req.body.blogusermetadata;
  
    // Check if required parameters are present
    if (!userid || !blogid || !markedUpDom) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }
  
    try {
      // Find the user document
      const user = await User.findOne({ _id: userid });
  
      if (!user) {
        // User not found, handle as per your needs
        console.error('User not found!');
        return res.status(404).json({ message: 'User not found' });
      } else {
        // User found, initialize/check blogmetadata array
        if (!user.blogmetadata) {
          user.blogmetadata = []; // Initialize empty array if missing
        }
  
        // Find existing blogmetadata object with matching blogid
        const existingBlogData = user.blogmetadata.find(data => data.blogId === blogid);
  
        if (existingBlogData) {
          // Blog metadata already exists, update it
          console.log('Updating blogmetadata for userid: ' + user._id + ' and blogid: ' + blogid);
          existingBlogData.isFavourite = isFavourite;
          existingBlogData.markedUpDom = markedUpDom;
        } else {
          // Create new blogmetadata object with received data
          console.log('Creating new blogmetadata for userid: ' + user._id + ' and blogid: ' + blogid);
          user.blogmetadata.push({
            blogId: blogid,
            isFavourite,
            markedUpDom,
          });
        }
  
        // Save updated user document
        await user.save();
  
        // Return the updated user information
        return res.json({ user });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  

// GET route to fetch userBlogMetadata by userid and blogid
app.get('/index/blogs/getuserblogmetadata/:userid/:blogid', isLoggedIn, async (req, res) => {
    try {
      const { userid, blogid } = req.params;
  
      // Check for required parameters
      if (!userid || !blogid) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
  
      // Find the user document
      const user = await User.findOne({ _id: userid });
  
      if (!user) {
        // User not found, handle as per your needs
        console.error('User not found!');
        return res.status(404).json({ message: 'User not found' });
      } else {
        // User found, check if blogmetadata exists
        if (!user.blogmetadata || user.blogmetadata.length === 0) {
          // No blog metadata available
          return res.status(404).json({ message: 'Blog metadata not found' });
        }
  
        // Find the specific blogmetadata object with matching blogid
        const targetBlogData = user.blogmetadata.find(data => data.blogId === blogid);
  
        if (!targetBlogData) {
          // Specific blog metadata not found for this blogid
          return res.status(404).json({ message: 'Blog metadata not found for this blogid' });
        }
  
        // Found specific blog metadata, return markedUpDom
        return res.json({ markedUpDom: targetBlogData.markedUpDom });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  



function calculateReadingTime(paragraph, wordsPerMinute) {
    // Assuming an average of 200 words per minute
    const defaultWordsPerMinute = 200;
    const wpm = wordsPerMinute || defaultWordsPerMinute;
    const wordCount = paragraph.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / wpm);

    return readingTime;
}

function getTagsListFromString(tagString) {
    const tags = tagString.split(',').map(item => item.trim());
    console.log(tags);
    return tags;
}


app.get('/test', (req, res) => {
    res.render('testpage');
});



app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});