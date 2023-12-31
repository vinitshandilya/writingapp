const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const Blog = require('./blogModel');
const Bank = require('./bankModel');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./user');

const app = express();
const port = 3000;
const db_uri = 'mongodb+srv://vinitshandilya:CQozNpwwVhUOXSdT@cluster0.mgznywr.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(db_uri);

// Serve static files from the public folder
app.use(express.static('public', { 'extensions': ['html', 'css', 'js', 'png'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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


// Landing page
app.get('/', async (req, res) => {
    // featured articles
    try {
        const featuredblogs = await Blog.find({ });
        return res.render('landingpage', { featuredblogs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/gettags', async (req, res) => {
    var tags = [];
    try {
        const featuredblogs = await Blog.find( { });
        const allTags = featuredblogs.reduce((tags, blog) => {
            return tags.concat(blog.tags);
          }, []);
          tags = [...new Set(allTags)];
          return res.status(200).json( { tags: tags});

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})


// Login page for user login
app.get('/login', (req, res) => {
    const message = req.query.message || null;
    res.render('loginpage', { message }); // Create loginpage.ejs in your views folder
});

// Render user registration page
app.get('/register', (req, res) => {
    const message = req.query.message || null;
    res.status(200).render('registerpage', { message });
});

// Register new user
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.redirect('/register/?message=User already exists with this username. Please login with your username.');
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.redirect('/register/?message=Account already exists with this email. Please login with your username.');
        }

        // If both checks pass, proceed with user registration
        const user = await User.register(new User({ username, email }), password);
        
        req.login(user, (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            return res.redirect('/register/?message=Thank you for registering. Please login with your username and password.');
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Log in existing user
app.post('/login', passport.authenticate('local', {
    successRedirect: '/set-username-and-redirect',
    failureRedirect: '/login/?message=Invalid credentials.',
    failureFlash: true,
}));

app.get('/set-username-and-redirect', (req, res) => {
    // Set the username in the session
    // console.log(req.user);
    req.session.user = req.user;
    req.session.username = req.user.username;
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
        const communityusers = await User.find( { _id: { $ne: loggedinuser._id } }); // from community users, remove the loggedin user
        res.status(200).render('homepage', { personalblogs, loggedinuser, communityusers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to get the community users' following status to build UI list
app.get('/homepage/getDiscoverPeople', isLoggedIn, async (req, res) => {
    const loggedinuser = req.session.user;
    try {
        const discoverpeople = await User.find( { _id: { $ne: loggedinuser._id } }); // from community users, remove the loggedin user
        return res.status(200).json({ discoverpeople: discoverpeople, loggedinuser: loggedinuser});
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }

});

// Route to get suggested people
app.get('/homepage/getSuggestedPeople', async (req, res) => {
    try {
        const suggestedpeople = await User.find( {  }); // from community users, remove the loggedin user
        console.log(suggestedpeople);
        return res.status(200).json({ suggestedpeople: suggestedpeople });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }

});

// Route to receive sort request
// app.post('/homepage/sort', isLoggedIn, async (req,res) => {
//     console.log(req.body);

//     const loggedinuser = req.session.user;
//     try {
//         const personalblogs = await Blog.find({
//             $or: [
//               { userid: loggedinuser._id }, // Blogs by the logged-in user
//               { userid: { $in: loggedinuser.following } } // Blogs by users in following list
//             ]
//           })
//           .sort({ title: -1 });
//         res.status(200).json( { personalblogs });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }

// });

// Render blog details page
app.get('/index', isLoggedIn, async (req, res) => {
    const loggedinuser = req.session.user;
    try {
        const blogs = await Blog.find( { userid: loggedinuser._id });
        const communityusers = await User.find( { });
        res.status(200).render('index', { blogs, loggedinuser, communityusers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Render blog public page
app.get('/index/blogs/public/:id', async (req, res) => {
    const blogid = req.params.id;
    try {
        const blog = await Blog.findById(blogid);
        res.status(200).render('publicpage', { blog });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/index/blogs/public/blog/:id', async (req, res) => {
    const blogid = req.params.id;
    try {
        const blog = await Blog.findById(blogid);
        return res.status(200).json({ blog: blog });
    } catch (error) {
        return res.status(500).json({ error: error.message });
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
    const loggedinuserid = req.session.user._id;
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).send('Blog not found');
        }

        res.status(200).json({ blog, loggedinuserid });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update paywall status for a blog
app.get('/index/blogs/:id/updatepaywall', isLoggedIn, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).send('Blog not found');
        }
        // Check if the logged-in user is the owner of the blog
        if (blog.userid.toString() !== req.session.user._id.toString()) {
            return res.status(401).json({ error: 'unauthorized' });
        }
        console.log(`updating paywall status for blogid: ${blog.userid}`);
        blog.paywall = !blog.paywall;
        await blog.save();
        return res.status(200).json({ paywallstatus: blog.paywall });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }

});

// get paywall status. should be public route.
app.get('/index/blogs/blog/:id/paywallstatus', async (req, res) => {
    const blogid = req.params.id;
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).send('Blog not found');
        }
        return res.status(200).json({ paywallstatus: blog.paywall, title: blog.title })

    } catch (error) {
        res.status(500).json({ error: error.message });
    }

});

// Edit Blog Route
app.get('/index/blogs/:id/edit', isLoggedIn, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        console.log(`loggedin userid:       ${req.session.user._id}`);
        console.log(`blog author userid:    ${blog.userid}`);
        if (!blog) {
            return res.status(404).send('Blog not found');
        }
        // logged-in user and blog author can be different.
        if(blog.userid.toString() !== req.session.user._id.toString()) {
            return res.status(401).json({ error: 'unauthorized' });
        }
        
        //console.log(blog);
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

        res.status(200).json({ savedblogid: updatedBlog._id });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Blog Route
app.get('/index/blogs/:id/delete', isLoggedIn, async (req, res) => {
    try {
        const deletedBlog = await Blog.findById(req.params.id);
        if (!deletedBlog) {
            return res.status(404).send('Blog not found');
        }
        // Check if the logged-in user is the owner of the blog
        if (deletedBlog.userid.toString() !== req.session.user._id.toString()) {
            return res.status(401).json({ error: 'unauthorized' });
        }

        // The logged-in user is the owner of the blog, proceed with deletion
        const result = await Blog.findByIdAndDelete(req.params.id);
        if (!result) {
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
    var userid = req.session.user._id;

    try {
        const user = await User.findById(userid);
        if(user) {
            user.firstname = req.body.firstname;
            user.lastname = req.body.lastname;
            user.bio = req.body.bio;
            await user.save();
            console.log('user updated!');
            return res.status(200).json({ loggedinuser: user });
        }
    } catch(err) {
        return res.status(500).send('Internal Server Error');
    }

    console.log(userid);
    res.redirect('/homepage');

});

// Get user details
app.get('/index/getuser/:id', isLoggedIn, async (req, res) => {
    const loggedinuserid = req.params.id;
    try {
        const loggedinuser = await User.findById(loggedinuserid); 
        if(loggedinuser) {
            return res.status(200).json({ loggedinuser: loggedinuser} );
        } else {
            return res.status(404).json({ loggedinuser: null });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    } 
});


// Update following and followers
app.post('/index/toggleFollowingAndFollowers', isLoggedIn, async(req, res) => {
    console.log(req.body);
    console.log('Logged in user: ' + req.body.loggedInUserId);
    console.log('started following: ' + req.body.communityUserId);

    try {
        const loggedInUser = await User.findById(req.body.loggedInUserId);
        const communityUser = await User.findById(req.body.communityUserId);
        if (!loggedInUser) {
          return res.status(400).json({ message: 'User not found' });
        }
      
        if (loggedInUser.following.includes(req.body.communityUserId)) {
          console.log('already follows this community user. Will remove following followers relationship');
          loggedInUser.following.pull(req.body.communityUserId); // Use pull to remove the communityUserId
          await loggedInUser.save();
          communityUser.followers.pull(req.body.loggedInUserId);
          await communityUser.save();
          return res.status(200).json({ message: 'unfollowed' });
        }
      
        loggedInUser.following.push(req.body.communityUserId);
        await loggedInUser.save();
        if (!communityUser.followers.includes(req.body.loggedInUserId)) {
          communityUser.followers.push(req.body.loggedInUserId);
          await communityUser.save();
        }
        return res.status(200).json({ message: 'followed' });
      
      } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Internal server error' });
      }    
});

// Add paid subscribers
app.post('/index/addsubscription', isLoggedIn, async (req, res) => {
    const loggedinuserid = req.body.subscriptioninfo.loggedinuserid;
    const authorid = req.body.subscriptioninfo.authorid;

    try {
        const loggedInUser = await User.findById(loggedinuserid);
        const author = await User.findById(authorid);
        if (!loggedInUser || !author) {
            return res.status(400).json({ message: 'User not found' });
        }
        if(author.paidsubscribers.includes(loggedinuserid)) {
            // already a paid subscriber to author
            // redirect to blog details page for blogid redirectblogid
            // use return statement
            return res.status(200).json({ status: 'subscribed' })
        } else {
            author.paidsubscribers.push(loggedinuserid);
            await author.save();
            // TODO: Add subscription field in loggedInUser too.
            return res.status(200).json({ status: 'subscribed' })
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }

});

// add monthly / yearly subscriber fees
app.post('/homepage/addsubscriptionfees', isLoggedIn, async (req, res) => {
    console.log(JSON.stringify(req.body));
    const loggedinuserid = req.session.user._id; 
    const monthlysubscription = req.body.monthlysubscription;
    const yearlysubscription = req.body.yearlysubscription;

    console.log(monthlysubscription);
    console.log(yearlysubscription);

    try {
        const user = await User.findById(loggedinuserid);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        } else {
            user.monthlysubscription = monthlysubscription;
            user.yearlysubscription = yearlysubscription;

            // Save the updated user
            await user.save();

            console.log('Subscription data saved successfully');
            return res.status(200).json({ message: 'Subscription saved' });
        }
    } catch (error) {
        console.error('Error updating subscription:', error);

        // Handle specific MongoDB validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }

        // Handle other errors
        return res.status(500).json({ message: 'Internal server error' });
    }
});


// get monthly and yearly subscription fees
app.get('/homepage/getsubscriptionfees', isLoggedIn, async (req, res) => {
    console.log(JSON.stringify(req.body));
    const loggedinuser = req.session.user;
    try {
        const user = await User.findById(loggedinuser._id);
        if(!user) {
            console.log('user not found');
            return res.status(404).json('user not found');
        } else {
            const fees = {
                monthlysubscription: user.monthlysubscription || 0,
                yearlysubscription: user.yearlysubscription || 0
            }
            return res.status(200).json({ fees: fees });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error getting subscription details' });
    }

});

// Check subscription status
app.post('/index/checksubscription', isLoggedIn, async (req, res) => {
    const loggedinuserid = req.session.user._id;
    if(loggedinuserid.toString() !== req.body.subscriptioninfo.loggedinuserid) {
        return res.status(500).json({ message: 'Unexpected session error'});
    }

    try {
        const loggedInUser = await User.findById(loggedinuserid);
        const author = await User.findById(req.body.subscriptioninfo.authorid);
        if (!loggedInUser || !author) {
            return res.status(400).json({ message: 'User not found' });
        }
        if(loggedinuserid.toString() === author._id.toString()) { // authors will always be subscribed to their own articles.
            return res.status(200).json({ status: 'subscribed' })
        }
        if(author.paidsubscribers.includes(loggedinuserid)) {
            return res.status(200).json({ status: 'subscribed' })
        }

        return res.status(200).json({ status: 'not subscribed' })

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

app.get('/homepage/dashboard', isLoggedIn, async (req, res) => {
    const loggedinuser = req.session.user;
    try {
        const personalblogs = await Blog.find({ userid: loggedinuser._id });
        res.render('authordashboard', { loggedinuser, personalblogs });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });

    }
})

app.post('/homepage/addbankdetails', isLoggedIn, async (req, res) => {
    const loggedinuser = req.session.user;
    try {
        const bankObj = {
            userid: loggedinuser._id,
            accountname: req.body.accountname,
            accountnumber: req.body.accountnumber,
            accounttype: req.body.accounttype,
            ifsc: req.body.ifsc,
            bankname: req.body.bankname,
            branchname: req.body.branchname,
            address: req.body.address,
            timestamp: Date.now()
        }
    
        const existingBank = await Bank.findOne({ userid: bankObj.userid });
        if (existingBank) {
            await existingBank.updateOne(bankObj);
            return res.status(200).json({ message: 'Bank details updated successfully' });
        } else {
            const newBank = new Bank(bankObj);
            await newBank.save();
            return res.status(201).json({ message: 'Bank details created successfully' });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error saving bank details' });
    }
});

app.get('/homepage/getbankdetails', isLoggedIn, async (req, res) => {
    const loggedinuser = req.session.user;
    try {
        const existingBank = await Bank.findOne({ userid: loggedinuser._id });
        if(existingBank) {
            return res.status(200).json({ existingBank: existingBank })
        } else {
            return res.status(200).json({ existingBank: null })
        }
    } catch (error) {
        console.error('Error in /homepage/getbankdetails:', error);
        return res.status(500).json({ message: 'Error saving bank details' });
    }
})



app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});