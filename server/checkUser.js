const mongoose = require('mongoose');
const User = require('./models/User');
const Admin = require('./models/Admin');
require('dotenv').config();

console.log('Starting checkUser script...');
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);

const check = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB successfully');
        
        const mob = '8879753917';
        console.log(`Searching for mob_num: ${mob}`);
        
        const user = await User.findOne({ mob_num: mob });
        const admin = await Admin.findOne({ mob_num: mob });
        
        if (user) {
            console.log('User found in Users collection:', JSON.stringify({ 
                user_name: user.user_name,
                mob_num: user.mob_num, 
                role: user.role, 
                status: user.status 
            }, null, 2));
        } else {
            console.log('User not found in Users collection');
        }
        
        if (admin) {
            console.log('Admin found in Admins collection:', JSON.stringify({ 
                user_name: admin.user_name,
                mob_num: admin.mob_num, 
                role: admin.role 
            }, null, 2));
        } else {
            console.log('Admin not found in Admins collection');
        }
        
        const allUsers = await User.find({}, 'user_name mob_num role status');
        console.log('Total users in DB:', allUsers.length);
        console.log('All Users:', JSON.stringify(allUsers, null, 2));

        const allAdmins = await Admin.find({}, 'user_name mob_num role');
        console.log('Total admins in DB:', allAdmins.length);
        console.log('All Admins:', JSON.stringify(allAdmins, null, 2));

        process.exit();
    } catch (err) {
        console.error('Error in checkUser script:', err);
        process.exit(1);
    }
};

check();
