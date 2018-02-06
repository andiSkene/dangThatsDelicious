const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
  //id coming in from the logged in user
  req.body.author = req.user._id;
  //id comes in url sent to this function
  req.body.store = req.params.id;
  //res.json(req.body);
  const newReview = new Review(req.body);
  await newReview.save();
  req.flash('success', 'Review saved!');
  res.redirect('back');
};
