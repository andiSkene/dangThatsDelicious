const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');

    if(isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed!' }, false)
    }
  }
}

//THIS IS A CAPITAL 'M' METHOD!
exports.homePage = (req, res) => {
  res.render('index');
};

exports.addStore = (req, res) => {
  res.render('editStore', {title: 'Add Store'});
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is a new file to resize
  if(!req.file) {
    next(); // skip to next middleware
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  //console.log(extension);
  req.body.photo = `${uuid.v4()}.${extension}`;
  // now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once we have written the photo to the file system keep going
  next();
}

exports.createStore = async (req, res) => {
  //console.log(req.user._id)
  req.body.author = req.user._id;
  const store = await (new Store(req.body)).save();
  await store.save();
  req.flash('success',`Successfully Created ${store.name}. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 6;
  const skip = (page * limit) - limit;
  //query the data base for all stores and count, fire off both functions at once and wait for both to get back
  const storesPromise = Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });
  const countPromise = Store.count();
  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit);
  if(!stores.length && skip) {
    req.flash('info',  `Hi! You asked for page ${page}. But that doesn't exist. So I put you on page ${pages}.`);
    res.redirect(`/stores/page/${pages}`);
    return;
  }
  //console.log(stores);
  res.render('stores', {title:'Stores', stores, page, pages, count});
};

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)){
    throw Error('You must own a store in order to edit it!');
  };
};

exports.editStore = async (req, res) => {
  //1. Find the store given the id :: findeOne returns a promise
  const store = await Store.findOne({_id:req.params.id});
  //2. Confirm they are the owner of the store
  confirmOwner(store, req.user);
  //3. Render out the edit form so the user can update
  res.render('editStore', {title:`Edit ${store.name}`, store})
};

exports.updateStore = async (req, res) => {
  //set the location data to be a Point
  req.body.location.type = 'Point';
  //find and update the store
  const store = await Store.findOneAndUpdate({_id:req.params.id}, req.body, {
    new:true, //returns the new store and not the old
    runValidators:true
  }).exec();
  req.flash('success', `Succesfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`);
  res.redirect(`/stores/${store._id}/edit`);
  //Redirect them to the store and tell them it worked
};

exports.getStoreBySlug = async (req, res, next) => {
  //console.log(req.params);
  const store = await Store.findOne({slug:req.params.slug}).populate('author reviews');
  if(!store) return next();
  res.render('store', { store, title: store.name })
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };
  const tagsPromise = Store.getTagsList();
  const storePromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storePromise]);
  res.render('tag', { tags, title:'Tags', tag, stores });
};

exports.searchStores = async (req, res) => {
  const stores = await Store
  //first find stores that match
  .find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: { $meta: 'textScore' }
  })
  // sort them
  .sort({
    score: { $meta: 'textScore' }
  })
  // limit to only five results
  .limit(5);
  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates,
        },
        $maxDistance: 10000 //10 km
      }
    }
  };

  const stores = await Store.find(q)
    //send only the data we need
    .select('slug name description location photo')
    //limit to the first 10 stores
    .limit(10);
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', { title:"map" });
};

exports.heartStore = async (req, res) => {
  //turn the array of objects in the user's hearts and make an array of strings
  const hearts = req.user.hearts.map(obj => obj.toString());
  //check if heart is in array. If it is, pull it. If not add it
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User
    .findByIdAndUpdate(req.user._id,
      //tell db: pull the store id if it's in the array, add the id if it's not in the array
    { [operator]: {hearts: req.params.id }},
    //returns the array after it's been updated
    { new: true }
  );

  res.json(user);
};

exports.getHearts = async (req, res) => {
  const stores = await Store.find({
    _id: { $in: req.user.hearts }
  });
  res.render('stores', { title:'Hearted Stores',  stores });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  //res.json(stores);
  res.render('topStores', { stores, title:'Top Stores!'})
}
