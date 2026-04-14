const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/urlshortener').then(async () => {
  await mongoose.connection.db.collection('urls').deleteMany({});
  console.log('All URLs deleted!');
  process.exit();
});