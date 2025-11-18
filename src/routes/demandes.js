import express from "express";
const router = express.Router();

// POST /demandes
router.post("/", (req, res) => {
  const { nom, email, description } = req.body;

  if (!nom || !email || !description) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  console.log("Nouvelle demande reçue :", req.body);

  return res.json({
    status: "OK",
    message: "Demande enregistrée (simulation).",
    data: req.body,
  });
});

export default router;
