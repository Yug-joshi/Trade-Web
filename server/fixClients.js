const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const fixClients = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trade_app_db');
    console.log('Connected to DB');
    
    const users = await User.find({ $or: [{ client_id: { $exists: false } }, { client_id: null }, { client_id: '' }] });
    console.log(`Found ${users.length} users needing a client_id`);
    
    for (const user of users) {
      if (user.role !== 'admin') {
         user.client_id = "CID" + Math.floor(100000 + Math.random() * 900000);
         await user.save();
         console.log(`Updated user ${user.user_name} with client_id: ${user.client_id}`);
      }
    }
    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

fixClients();
