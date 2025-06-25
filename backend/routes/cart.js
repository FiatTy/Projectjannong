const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();


const userCartsDirectory = path.join(__dirname, '../data/userCarts'); // เปลี่ยนจาก cart.json เป็น userCarts/


if (!fs.existsSync(userCartsDirectory)) {
    fs.mkdirSync(userCartsDirectory, { recursive: true });
    console.log(`Created directory: ${userCartsDirectory}`);
}

//Newfile email
const getUserCartFilePath = (userEmail) => {
    return path.join(userCartsDirectory, `${userEmail.replace(/[^a-z0-9]/gi, '_')}.json`);
};

const authenticateUser = (req, res, next) => {

    const userEmail = req.query.email || req.body.email;

    if (!userEmail) {
        return res.status(401).json({ error: 'Authentication required: User email is missing.' });
    }
    req.userEmail = userEmail; // เก็บ email ไว้ใน req object เพื่อให้ route อื่นใช้ต่อได้
    next();
};


// GET /api/cart?email=user@example.com (ดึงตะกร้าของ user)
router.get('/', authenticateUser, (req, res) => {
    const userCartFilePath = getUserCartFilePath(req.userEmail);

    fs.readFile(userCartFilePath, 'utf8', (err, data) => {
        if (err) {
            // ถ้าไฟล์ไม่มี (ยังไม่เคยมีตะกร้า) ให้คืนค่าเป็น Array ว่าง
            if (err.code === 'ENOENT') {
                return res.json([]);
            }
            console.error(`Failed to read cart for ${req.userEmail}:`, err);
            return res.status(500).json({ error: 'Failed to read cart for this user.' });
        }
        try {
            res.json(JSON.parse(data));
        } catch (e) {
            console.error(`Error parsing cart for ${req.userEmail}:`, e);
            // ถ้าไฟล์เสีย ก็คืนค่าเป็น Array ว่าง และแจ้ง error
            return res.status(500).json({ error: 'User cart data is corrupted.' });
        }
    });
});

router.post('/update-quantity', authenticateUser, (req, res) => {
    const { id, itemName, newQty } = req.body;

    // ตรวจสอบว่าได้รับข้อมูลที่จำเป็นครบถ้วน
    if (!req.userEmail || (!id && !itemName) || typeof newQty === 'undefined' || newQty < 0) {
        return res.status(400).json({ message: 'Missing required fields or invalid quantity.' });
    }

    const userCartFilePath = getUserCartFilePath(req.userEmail);

    fs.readFile(userCartFilePath, 'utf8', (err, data) => {
        let cart = [];
        if (!err && data) {
            try {
                cart = JSON.parse(data);
            } catch (e) {
                console.error(`Error parsing existing cart for ${req.userEmail} on UPDATE_QTY:`, e);
                cart = [];
            }
        }

        let itemFound = false;
        if (newQty === 0) {
            const initialLength = cart.length;
            cart = cart.filter(item => {
                const matchById = id && item.id === id;
                const matchByName = itemName && item.name === itemName;
                return !(matchById || matchByName);
            });
            if (cart.length < initialLength) {
                itemFound = true;
            }
        } else {
            const existingItemIndex = cart.findIndex(item => {
                const matchById = id && item.id === id;
                const matchByName = itemName && item.name === itemName;
                return matchById || matchByName;
            });

            if (existingItemIndex !== -1) {
                cart[existingItemIndex].qty = newQty;
                itemFound = true;
            }
        }

        if (!itemFound && newQty > 0) {
            return res.status(404).json({ message: 'Item not found in cart for update.' });
        } else if (!itemFound && newQty === 0) {
            return res.json({ message: 'Item not found in cart to remove (might be already removed).' });
        }

        fs.writeFile(userCartFilePath, JSON.stringify(cart, null, 2), err => {
            if (err) {
                console.error(`Failed to write cart for ${req.userEmail} on UPDATE_QTY:`, err);
                return res.status(500).json({ error: 'Failed to update cart.' });
            }
            res.json({ success: true, message: 'Cart updated successfully.', cart });
        });
    });
});

// POST /api/cart (เพิ่มหรืออัปเดตสินค้าในตะกร้าของ user)
router.post('/', authenticateUser, (req, res) => {
    const { id, name, price, qty } = req.body;
    const newItem = { id, name, price, qty };

    const userCartFilePath = getUserCartFilePath(req.userEmail);

    fs.readFile(userCartFilePath, 'utf8', (err, data) => {
        let cart = [];
        if (!err) {
            try {
                cart = JSON.parse(data);
            } catch (e) {
                console.error(`Error parsing existing cart for ${req.userEmail} on POST:`, e);
                cart = [];
            }
        }

        const existing = cart.find(item => item.id === newItem.id);
        if (existing) {
            existing.qty += newItem.qty;
        } else {
            cart.push(newItem);
        }

        fs.writeFile(userCartFilePath, JSON.stringify(cart, null, 2), err => {
            if (err) {
                console.error(`Failed to write cart for ${req.userEmail}:`, err);
                return res.status(500).json({ error: 'Failed to update cart.' });
            }
            res.json({ success: true, cart });
        });
    });
});

// DELETE /api/cart (ล้างตะกร้าของ user)
router.delete('/', authenticateUser, (req, res) => {
    const userCartFilePath = getUserCartFilePath(req.userEmail);

    fs.writeFile(userCartFilePath, '[]', err => {
        if (err) {
            console.error(`Failed to clear cart for ${req.userEmail}:`, err);
            return res.status(500).json({ error: 'Failed to clear cart.' });
        }
        res.json({ success: true, message: 'Cart cleared successfully.' });
    });
});


module.exports = router;