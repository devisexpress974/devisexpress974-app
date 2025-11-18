import express from "express";
const router = express.Router();

// POST /vendeurs
router.post("/", (req, res) => {
  const { nom, email, domaine } = req.body;

  if (!nom || !email || !domaine) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  console.log("Nouveau vendeur inscrit :", req.body);

  return res.json({
    status: "OK",
    message: "Vendeur enregistré (simulation).",
    data: req.body,
  });
});

export default router;
