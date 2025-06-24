const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// กำหนดโฟลเดอร์สำหรับเก็บตะกร้าของผู้ใช้แต่ละคน
const userCartsDirectory = path.join(__dirname, '../data/userCarts'); // เปลี่ยนจาก cart.json เป็น userCarts/

// ตรวจสอบว่าโฟลเดอร์ userCartsDirectory มีอยู่หรือไม่ ถ้าไม่มีให้สร้าง
if (!fs.existsSync(userCartsDirectory)) {
    fs.mkdirSync(userCartsDirectory, { recursive: true });
    console.log(`Created directory: ${userCartsDirectory}`);
}

// Helper function to get the cart file path for a specific user
const getUserCartFilePath = (userEmail) => {
    // ใช้ email เป็นชื่อไฟล์ (ในระบบจริงควรใช้ UID)
    return path.join(userCartsDirectory, `${userEmail.replace(/[^a-z0-9]/gi, '_')}.json`);
    // .replace(/[^a-z0-9]/gi, '_') ใช้เพื่อแทนที่อักขระพิเศษใน email ด้วย underscore
    // เพื่อให้ชื่อไฟล์เป็นชื่อที่ถูกต้องตามระบบปฏิบัติการ
};

// --- Middleware สำหรับตรวจสอบ Login และดึง email (ใช้ซ้ำได้) ---
// เราจะใช้ email ที่เก็บไว้ใน localStorage/sessionStorage ของ frontend
// แล้วส่งมาใน req.headers.authorization หรือ req.body
// เพื่อความง่ายในตัวอย่างนี้ เราจะรับ email ผ่าน req.query (GET) หรือ req.body (POST/DELETE)
// และถือว่า email ที่ส่งมาถูกต้องแล้ว (ในระบบจริงต้องมีการตรวจสอบ token/session)
const authenticateUser = (req, res, next) => {
    // สำหรับ GET, DELETE: คาดว่า email จะมาใน req.query.email (e.g., /api/cart?email=user@example.com)
    // สำหรับ POST: คาดว่า email จะมาใน req.body.email
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