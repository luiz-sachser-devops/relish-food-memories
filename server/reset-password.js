const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connection string to your Remote VM DB
const uri = 'mongodb://admin:adminpassword@34.31.87.142:27017/food-memories?authSource=admin';

async function reset() {
  try {
    console.log('Connecting to remote MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected!');

    // Generate new hash for password "admin"
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin', salt);

    console.log('New Hash generated. Updating user...');

    const res = await mongoose.connection.collection('users').updateOne(
      { email: 'admin@relishfoodmemories.app' },
      { $set: { passwordHash: hash } }
    );

    console.log('Update result:', res);
    
    if (res.matchedCount === 0) {
      console.error('User not found!');
    } else {
      console.log('Password reset successfully to "admin"');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

reset();
