import mongoose from "mongoose";

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  rating: { type: Number },
  view: { type: Number, default: 0 },
  like: { type: Number, default: 0 },
  dislike: { type: Number, default: 0 },
  previewVideo: { type: String },
});

const movie = mongoose.model("movies", movieSchema);

export default movie;
