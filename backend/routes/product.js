// D:\ProjectAss2\Projecturuguay-main\Projectjannong\backend\routes\product.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// แก้ไข filePath ให้ชี้ไปที่ D:\ProjectAss2\Projecturuguay-main\Projectjannong\backend\data\product.json
const productsPath = path.join(__dirname, '..', 'data', 'product.json'); // ใช้ product.json ตามที่คุณแจ้งมา

// Helper function to read products from file
const readProducts = () => {
    try {
        // console.log(`Reading from: ${productsPath}`); // Debugging line
        const data = fs.readFileSync(productsPath, 'utf8');
        return JSON.parse(data || '[]'); // If file is empty, parse as empty array
    } catch (err) {
        if (err.code === 'ENOENT') { // If file not found, return empty array
            console.warn(`Product data file not found at ${productsPath}. Returning empty array.`);
            return [];
        }
        console.error("Error reading or parsing products file:", err);
        return []; // Return empty array on other errors to prevent crashing
    }
};

// Helper function to write products to file
const writeProducts = (products) => {
    try {
        fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf8');
        // console.log(`Products written to: ${productsPath}`); // Debugging line
    } catch (err) {
        console.error("Error writing products file:", err);
        throw new Error("Failed to save product data."); // Propagate error
    }
};

// Middleware for basic authentication (for admin/staff page)
// MUST match the key set in your admin.html (e.g., 'myAdminSecretKey123')
const authenticateAdmin = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'];
    // console.log("Received X-Admin-Key:", adminKey); // Debugging line
    if (adminKey === 'myAdminSecretKey123') { // <-- ตรวจสอบว่าตรงกับใน admin.html
        next();
    } else {
        res.status(403).json({ error: 'Access Denied: Admin privileges required. Invalid Admin Key.' });
    }
};

// --- API Endpoints for Product Management (CRUD) ---

// GET /api/products - Get all products (can be public)
router.get('/', (req, res) => {
    const products = readProducts();
    res.json(products);
});

// GET /api/products/:id - Get product by ID
router.get('/:id', (req, res) => {
    const products = readProducts();
    const productId = req.params.id;
    const product = products.find(p => p.id === productId);
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ error: 'Product not found' });
    }
});

// POST /api/products - Add a new product (requires admin)
router.post('/', authenticateAdmin, (req, res) => {
    const products = readProducts();
    const newProduct = req.body;

    // Ensure 'img' is an array, even if empty or single string
    if (newProduct.img && typeof newProduct.img === 'string') {
        newProduct.img = newProduct.img.split(',').map(s => s.trim()).filter(s => s);
    } else if (!newProduct.img) {
        newProduct.img = [];
    }
    // Ensure price is a number
    if (newProduct.price) {
        newProduct.price = parseFloat(newProduct.price);
    }

    // Basic validation
    if (!newProduct.id || !newProduct.name || newProduct.price === undefined || !newProduct.type) {
        return res.status(400).json({ error: 'Missing required product fields (id, name, price, type)' });
    }
    if (products.some(p => p.id === newProduct.id)) {
        return res.status(409).json({ error: 'Product with this ID already exists.' });
    }

    products.push(newProduct);
    try {
        writeProducts(products);
        res.status(201).json({ success: true, product: newProduct });
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).json({ error: 'Failed to add product due to server error.' });
    }
});

// PUT /api/products/:id - Update an existing product (requires admin)
router.put('/:id', authenticateAdmin, (req, res) => {
    let products = readProducts();
    const productId = req.params.id;
    const updatedProduct = req.body;

    // Ensure 'img' is handled as an array
    if (updatedProduct.img && typeof updatedProduct.img === 'string') {
        updatedProduct.img = updatedProduct.img.split(',').map(s => s.trim()).filter(s => s);
    } else if (!updatedProduct.img) {
        updatedProduct.img = [];
    }
    // Ensure price is a number
    if (updatedProduct.price) {
        updatedProduct.price = parseFloat(updatedProduct.price);
    }

    const index = products.findIndex(p => p.id === productId);
    if (index !== -1) {
        // Merge existing product with updated fields, keep original ID
        products[index] = { ...products[index], ...updatedProduct, id: productId };
        try {
            writeProducts(products);
            res.json({ success: true, product: products[index] });
        } catch (error) {
            console.error("Error updating product:", error);
            res.status(500).json({ error: 'Failed to update product due to server error.' });
        }
    } else {
        res.status(404).json({ error: 'Product not found.' });
    }
});

// DELETE /api/products/:id - Delete a product (requires admin)
router.delete('/:id', authenticateAdmin, (req, res) => {
    let products = readProducts();
    const productId = req.params.id;

    const initialLength = products.length;
    products = products.filter(p => p.id !== productId);

    if (products.length < initialLength) {
        try {
            writeProducts(products);
            res.json({ success: true, message: 'Product deleted successfully.' });
        } catch (error) {
            console.error("Error deleting product:", error);
            res.status(500).json({ error: 'Failed to delete product due to server error.' });
        }
    } else {
        res.status(404).json({ error: 'Product not found.' });
    }
});

module.exports = router;