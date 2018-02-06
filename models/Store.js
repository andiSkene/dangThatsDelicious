const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

//Strict Schema, any data not part of the defined schema will be ignored
const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a cool store name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [
      {
        type: Number,
        required: 'You must provide coordinates!'
      }
    ],
    address: {
      type: String,
      required: 'You must provide an address!'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must provide and author!'
  }
},
{
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
}
);

// Define our indexes
storeSchema.index({
  name: 'text',
  description: 'text'
});

storeSchema.index({
  location: '2dsphere'
})

storeSchema.pre('save', async function(next) {
  if(!this.isModified('name')) {
    next(); //skip it
    return; //stop this function from running
  }
  this.slug = slug(this.name);
  //find other stores that have the same slug
  //this regex is looking for a slug that begins with the same letters in the newly generated slug and possibly ends with a number also all this is case insensitive
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  //store hasn't been generated as a variable yet, so 'this.constructor' will fill in
  const storesWithSlug = await this.constructor.find({slug:slugRegEx});
  if(storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
  //TO DO make more resilient so slugs are unique
});

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id:'$tags', count: { $sum: 1} } },
    { $sort: { count: -1 }}
  ]);
};

storeSchema.statics.getTopStores = function () {
  return this.aggregate([
    //lookup stores and populate their reviews
    //Look at the category "reviews" in the db, check the store id against the store value in reviews and then create a new object in the JSON and name the result 'reviews'
    { $lookup: {from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews' } },
    //filter for only items that have 2 or more reviews/ below: is there a second review in an array?
    { $match: { 'reviews.1': { $exists: true } } },
    //project = what will these new review objects include? add the average reviews field
    { $project: {
      photo: '$$ROOT.photo',
      name: '$$ROOT.name',
      reviews: '$$ROOT.reviews',
      slug: '$$ROOT.slug',
      averageRating: { $avg: '$reviews.rating' }
    }},
    //sort it by our new field, highest reviews first
    { $sort: { averageRating: -1 } },
    //limit to 10
    { $limit: 10 }
  ]);
};

//this goes through the reviews to check if any are associated with this store
//check local field against foreignField, in this case the store id against the store field in review
storeSchema.virtual('reviews', {
  ref: 'Review', //what model to link
  localField: '_id', //which field on this store
  foreignField: 'store' //which field on the review (what's referenced)
});

function autopopulate(next) {
  this.populate('reviews');
  next();
};

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
