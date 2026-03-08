const express = require('express');
const router = express.Router();
const Item = require('../models/item');

// GET /api/items?museo=Pinacoteca
router.get('/', async (req, res) => {
    try {
        const { museo } = req.query;
        const filter = museo ? { museo } : {};
        const items = await Item.find(filter).sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/items
router.post('/', async (req, res) => {
    try {
        const item = new Item(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/items/:id
router.put('/:id', async (req, res) => {
    try {
        const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!item) return res.status(404).json({ error: 'Item non trovato' });
        res.json(item);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
    try {
        const item = await Item.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ error: 'Item non trovato' });
        res.json({ message: 'Item eliminato' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;


