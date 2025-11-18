// Simple API for DevisExpress974

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ROUTE TEST
app.get("/", (req, res) => {
  res.json({ status: "API OK", message: "DevisExpress974 backend running" });
});

// DÉMARRAGE SERVEUR
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 API running on port " + PORT);
});
