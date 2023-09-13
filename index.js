if(process.env.NODE_ENV !== "production"){
  require('dotenv').config();
}
const express = require('express');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const session = require('express-session');
const path = require('path');
const ejsMate = require('ejs-mate');
const homeRoute = require('./routes/homeRoute');
const app = express();
const port = 3001;


app.engine('ejs', ejsMate);
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.set(path.join(__dirname, 'views'));
// Use sessions to persist login sessions
app.use(session({ secret: 'your-secret-key', resave: true, saveUninitialized: true }));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Define the Facebook Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.APP_ID,
  clientSecret: process.env.APP_SECRET,
  callbackURL: 'http://localhost:3001/home'
}, (accessToken, refreshToken, profile, done) => {
  console.log(accessToken);
  const user = { id: profile.id, displayName: profile.displayName };
  return done(null, user);
}));
// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});
// Deserialize user from session
passport.deserializeUser((id, done) => {

  const user = { id: id, displayName: 'User' };
  done(null, user);
});
// ...

app.get('/auth/facebook', passport.authenticate('facebook'));

// Callback route to handle the Facebook login response
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/home' }),
  (req, res) => {
    // Successful authentication, redirect to a different page or respond with a message
    res.redirect('/profile');
  }
);
app.use(homeRoute);

// Start the server 
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
