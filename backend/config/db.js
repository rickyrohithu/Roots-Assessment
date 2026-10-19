const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoUri = (
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      process.env.MONGODB_URL ||
      process.env.DATABASE_URL ||
      ''
    ).trim();

    // Strip accidental quotes if wrapped in quotes
    if ((mongoUri.startsWith('"') && mongoUri.endsWith('"')) || (mongoUri.startsWith("'") && mongoUri.endsWith("'"))) {
      mongoUri = mongoUri.slice(1, -1).trim();
    }

    if (!mongoUri) {
      if (process.env.NODE_ENV === 'production') {
        console.error('CRITICAL: MONGODB_URI environment variable is not set in Render Environment tab!');
        process.exit(1);
      }
      mongoUri = 'mongodb://127.0.0.1:27017/roots_management';
    }

    const hostDisplay = mongoUri.includes('@') ? mongoUri.split('@')[1].split('/')[0] : 'localhost';
    console.log(`Connecting to MongoDB host: ${hostDisplay}...`);

    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
