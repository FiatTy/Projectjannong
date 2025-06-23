const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const cartPath = path.join(__dirname, '../data/cart.json');

// GET /api/cart
router.get('/', (req, res) => {
  fs.readFile(cartPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read cart' });
    res.json(JSON.parse(data || '[]'));
  });
});

// POST /api/cart (add or update item)
router.post('/', (req, res) => {
  const newItem = req.body;

  fs.readFile(cartPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read cart' });
    let cart = [];
    try {
      cart = JSON.parse(data);
    } catch (e) {
      cart = [];
    }

    const existing = cart.find(item => item.id === newItem.id);
    if (existing) {
      existing.qty += newItem.qty;
    } else {
      cart.push(newItem);
    }

    fs.writeFile(cartPath, JSON.stringify(cart, null, 2), err => {
      if (err) return res.status(500).json({ error: 'Failed to write cart' });
      res.json({ success: true, cart });
    });
  });
});

// DELETE /api/cart → reset cart
router.delete('/', (req, res) => {
  fs.writeFile(cartPath, '[]', err => {
    if (err) return res.status(500).json({ error: 'Failed to clear cart' });
    res.json({ success: true });
  });
});


module.exports = router;
