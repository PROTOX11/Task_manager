import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://prakashjisharma0009_db_user:aV37AsTaKtreKWPY@test.exfzz4h.mongodb.net/?appName=test";

async function test() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected");
  
  const db = mongoose.connection.db;
  const users = await db.collection("users").find({ isTrialAdmin: true }).toArray();
  console.log("Trial Admins in DB:", users);
  
  mongoose.disconnect();
}

test();
