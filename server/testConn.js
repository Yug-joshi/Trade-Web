const mongoose = require('mongoose');
require('dotenv').config();

console.log('Testing DB connection...');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('SUCCESS: Connected to MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILURE: Could not connect to MongoDB', err);
    process.exit(1);
  });
