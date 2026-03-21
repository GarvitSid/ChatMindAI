import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    
    if(!mongoUri){
     throw new Error('FATAL: Mongo_API_key is not present')
    }

    console.log('[Seed] Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);

    const adminEmail = process.env.ADMIN_EMAIL;
    if(!adminEmail){
     throw new Error('FATAL: adminEmail is not present')
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if(!adminPassword){
     throw new Error('FATAL: adminPassword is not present')
    }

    const adminName = process.env.ADMIN_NAME;
    if(!adminName){
     throw new Error('FATAL: adminName is not present')
    }

    let admin = await User.findOne({ email: adminEmail.toLowerCase() });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    if (admin) {
      admin.password = hashedPassword;
      admin.role = 'admin';
      admin.name = adminName;
      await admin.save();
      console.log(`[Seed] Existing Admin user updated: ${adminEmail}`);
    } else {
      admin = await User.create({
        name: adminName,
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        role: 'admin',
      });
      console.log(`[Seed] New Admin user created successfully: ${adminEmail}`);
    }

    console.log('----------------------------------------------------');
    console.log('Admin Credentials for Login:');
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('Role:     admin');
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

seedAdmin();
