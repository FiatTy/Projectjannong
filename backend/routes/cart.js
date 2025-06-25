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
    req.userEmail = userEmail; 
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

// POST /api/cart (เพิ่มหรืออัปเดตสินค้าในตะกร้าของ user)
router.post('/', authenticateUser, (req, res) => {
    const { id, name, price, qty } = req.body; // newItem ตอนนี้ถูกแยกออกมา
    const newItem = { id, name, price, qty }; // สร้าง newItem object ขึ้นมาใหม่

    const userCartFilePath = getUserCartFilePath(req.userEmail);

    fs.readFile(userCartFilePath, 'utf8', (err, data) => {
        let cart = [];
        if (!err) { // ถ้าอ่านไฟล์ได้สำเร็จและไม่มี error
            try {
                cart = JSON.parse(data);
            } catch (e) {
                console.error(`Error parsing existing cart for ${req.userEmail} on POST:`, e);
                // ถ้าไฟล์เสีย ก็เริ่มต้นตะกร้าใหม่
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

    fs.writeFile(userCartFilePath, '[]', err => { // เขียน array ว่างลงไปในไฟล์ของผู้ใช้
        if (err) {
            console.error(`Failed to clear cart for ${req.userEmail}:`, err);
            return res.status(500).json({ error: 'Failed to clear cart.' });
        }
        res.json({ success: true, message: 'Cart cleared successfully.' });
    });
});


module.exports = router;