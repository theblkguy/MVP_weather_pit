import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const userSchema = new Schema ({
  id: Number,
  username: String
})

const User = model('User', userSchema);
export default User;