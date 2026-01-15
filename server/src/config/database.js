const mongoose = require('mongoose');

const connectDatabase = async (uri) => {
  const connectionString = uri || process.env.MONGODB_URI;
  if (!connectionString) {
    throw new Error('Missing MongoDB connection string. Set MONGODB_URI in environment variables.');
  }

  mongoose.set('strictQuery', false);

  await mongoose.connect(connectionString, {
    dbName: process.env.MONGODB_DB || undefined
  });

  return mongoose.connection;
};

module.exports = {
  connectDatabase
};
