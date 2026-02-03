require('dotenv').config();

const bcrypt = require('bcryptjs');
const { connectDatabase } = require('../src/config/database');
const User = require('../src/models/User');

const ADMIN_EMAIL = 'admin@relishfoodmemories.app';
const ADMIN_PASSWORD = 'admin';

const seedAdmin = async () => {
  await connectDatabase();

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  if (existing) {
    existing.name = 'Workshop Admin';
    existing.role = 'admin';
    existing.workshopId = null;
    existing.passwordHash = passwordHash;
    existing.emailVerified = true;
    await existing.save();
    console.log('Admin user updated.');
    process.exit(0);
  }

  await User.create({
    name: 'Workshop Admin',
    email: ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    role: 'admin',
    emailVerified: true,
    workshopId: null
  });

  console.log('Admin user created.');
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error('Failed to seed admin user:', error);
  process.exit(1);
});
