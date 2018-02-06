const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You are now logged in.'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', "You are now logged out!");
  res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
  //first check if user is authenticated
  if(req.isAuthenticated()) {
    next(); //carry on
    return;
  }
  req.flash('error', 'Oops, you must be logged in to do that!');
  res.redirect('/login');
}

exports.forgot = async (req, res) => {
  //1. does user exist
  const user = await User.findOne({ email: req.body.email });
  //console.log("forgot " + req.body.email);
  if(!user){
    req.flash('error', "We can't find your account.");
    return res.redirect('/login');
  }
  //2. set reset tokens and expiry on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000; //1 hour from now
  await user.save();
  //3. send them an email with the tokens
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`
  await mail.send({
    user,
    subject: 'Password Reset',
    resetURL,
    filename: 'password-reset'
  })
  req.flash('success', `You have been emailed a password reset.`);
  //4. redirect to login page
  res.redirect('/login');
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  if(!user){
    req.flash('error', 'Password reset is invalid or has expired.');
    return res.redirect('/login');
  }
  //if there is a user, show the reset password form
  res.render('reset', " title: 'Reset Your Password'");
};

exports.confirmedPasswords = (req, res, next) => {
  if(req.body.password === req.body['password-confirm']) {
    next(); //keep it going
    return;
  };
  req.flash('error', 'Passwords do not match!');
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  if(!user){
    req.flash('error', 'Password reset is invalid or has expired.');
    return res.redirect('/login');
  }
  user.setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash('Success', 'Nice! Your password has been reset and you are now logged in!');
  res.redirect('/');
};
