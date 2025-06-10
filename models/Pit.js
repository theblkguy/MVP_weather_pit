import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const pitSchema = new Schema ({
  id: Number,
  pitname: String,
  created_at: Date,
  forecast: String,
  temp: Number
})

const Pit = model('Pit', userSchema);
export default Pit;