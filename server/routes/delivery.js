const express = require('express');
const { SHOP, BASE_FEE, PER_KM, MAX_KM, validCoords, quote } = require('../utils/delivery');

const router = express.Router();

// Shop location and fee rules (the map uses this to centre itself)
router.get('/shop', (req, res) => {
    res.json({ shop: SHOP, base_fee: BASE_FEE, per_km: PER_KM, max_km: MAX_KM });
});

// Fee quote for a chosen drop-off point: GET /api/delivery/quote?lat=-1.29&lng=36.82
router.get('/quote', (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!validCoords(lat, lng))
        return res.status(400).json({ error: 'Choose a valid delivery point on the map.' });
    const q = quote(lat, lng);
    if (!q.deliverable)
        return res.status(422).json({ ...q, error: `Sorry, we deliver within ${MAX_KM} km of our shop.` });
    res.json(q);
});

module.exports = router;