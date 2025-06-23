// backend/routes/product.js

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get('/', (req, res) => {

    const filePath = path.join(__dirname, '..', 'data', 'product.json');
    console.log("Attempting to read:", filePath); // ตรวจสอบพาธใน console ของ server

    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
            console.error("Error reading product.json:", err);
            
            return res.status(500).json({ status: "Internal server error", message: "Could not load product data." });
        }

        try {
            const products = JSON.parse(data);
            res.status(200).json(products); // ส่งข้อมูลสินค้าในรูปแบบ JSON กลับไป
        } catch (parseError) {
            console.error("Error parsing product.json:", parseError);
            res.status(500).json({ status: "Internal server error", message: "Product data is corrupted." });
        }
    });
});

module.exports = router;