import mongoose from "mongoose";
import movie from "./movie";
import category from "./category";

const movieCategorySchema = new mongoose.Schema({
  movie: { type: mongoose.Schema.Types.ObjectId, ref: movie },
  category: { type: mongoose.Schema.Types.ObjectId, ref: category },
});

const movieCategory = mongoose.model("movie_category", movieCategorySchema);

export default movieCategory;
