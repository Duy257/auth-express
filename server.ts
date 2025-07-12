import bodyParser from "body-parser";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { routes } from "./src/routes/routes";
import connectDB from "./src/config/database";
dotenv.config();

const app = express();
connectDB();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use("", routes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(4000, '0.0.0.0', () => {
  console.log(`Server đang chạy tại http://0.0.0.0:${4000}`);
});
