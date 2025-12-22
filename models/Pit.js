import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const pitSchema = new Schema ({
  id: Number,
  pitname: String,
  created_at: Date,
  location: String,
  weatherData: {
    temp: Number,
    humidity: Number,
    windSpeed: Number,
    pressure: Number,
    precipitation: Number,
    cloudCover: Number,
    condition: String,
    precipitationType: String // 'rain', 'snow', 'none'
  }
})

const Pit = model('Pit', pitSchema);
export default Pit;