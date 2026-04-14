const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/urlshortener').then(async () => {
  const urls = await mongoose.connection.db.collection('urls').find({}).toArray();
  console.log(JSON.stringify(urls));
  process.exit();
});