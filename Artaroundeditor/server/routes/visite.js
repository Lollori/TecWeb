const express = require('express');
const router = express.Router();
const Visita = require('../models/visita');

// GET tutte le visite (con filtri opzionali)
router.get('/', async (req, res) => {
  try {
    const filtri = {};
    if (req.query.museo) filtri.museo = req.query.museo;
    if (req.query.autore) filtri.autore = req.query.autore;
    if (req.query.pubblica) filtri.pubblica = req.query.pubblica === 'true';

    const visite = await Visita.find(filtri).populate('items.item');
    res.json(visite);
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

// GET singola visita
router.get('/:id', async (req, res) => {
  try {
    const visita = await Visita.findById(req.params.id).populate('items.item');
    if (!visita) return res.status(404).json({ errore: 'Visita non trovata' });
    res.json(visita);
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

// POST crea nuova visita
router.post('/', async (req, res) => {
  try {
    const visita = new Visita(req.body);
    await visita.save();
    res.status(201).json(visita);
  } catch (err) {
    res.status(400).json({ errore: err.message });
  }
});

// PUT modifica visita
router.put('/:id', async (req, res) => {
  try {
    const visita = await Visita.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(visita);
  } catch (err) {
    res.status(400).json({ errore: err.message });
  }
});

// DELETE elimina visita
router.delete('/:id', async (req, res) => {
  try {
    await Visita.findByIdAndDelete(req.params.id);
    res.json({ messaggio: 'Visita eliminata' });
  } catch (err) {
    res.status(500).json({ errore: err.message });
  }
});

module.exports = router;
