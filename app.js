require('dotenv').config();
const express = require('express');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret:"our little secret",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://sahita2002:Test123@cluster0.daojvr9.mongodb.net/blogDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/blogwebsite"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

const postSchema = {
  title: String,
  content: String
};

const Post = mongoose.model("Post", postSchema);

app.get("/",(req,res)=>{
    res.render("home");
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/blogwebsite', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/timeline');
});

app.get("/timeline",function(req, res){
    //GET request to load the timeline page and find() function to find and render the posts in the database 
    
    Post.find({}).then(function(posts){
        if(req.isAuthenticated()){
            res.render("timeline", {
                posts: posts
            });
        }
        else{
            res.redirect("/");
        }
        
    });
});

app.get("/login",(req,res)=>{
    //get request to load login page where user can put up a new post to the blog
    res.render("login");
});

app.get("/register", (req,res)=>{
    //get request to load register page where user can put up a new post to the blog
    res.render("register");
})

app.get("/compose", function(req, res){
    //get request to load compose page where user can put up a new post to the blog
    res.render("compose");
});

app.get("/logout", (req,res)=>{
    //get request to logout
    req.logout(function(err){
        if(err){
            console.log(err);
        }
    });
    res.redirect("/");
});

app.post("/register", (req,res)=>{
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/timeline");
            });
        }
    })
});

app.post("/login", (req,res)=>{
    const user  = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
            res.redirect("/login");
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/timeline");
            });
        }
    });
});

app.post("/compose", function(req, res){
    //post request to add aand save a new blogpost entered by the user to the database 
    const post = new Post({
        title: req.body.postTitle,
        content: req.body.postBody
    });

    post.save().then(()=>{
        res.redirect("/timeline");
    });
});

app.get("/posts/:postId", function(req, res){
    //get request to open a specific blog post
    const requestedPostId = req.params.postId;
    Post.findOne({_id: requestedPostId}).then(function(post){
        res.render("post", {
        title: post.title,
        content: post.content
        });
    });

});


app.listen(3000, function() {
    //listener to host our application on a server
    console.log("Server started on port 3000");
});