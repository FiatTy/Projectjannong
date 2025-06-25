// backend/routes/checkout.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const checkoutsDirectory = path.join(__dirname, '../data/checkouts');
// ADMIN_KEY สำหรับการยืนยันตัวตน
const ADMIN_KEY = 'myAdminSecretKey123'; // คีย์นี้ต้องตรงกับที่อยู่ใน admin.html

// ตรวจสอบให้แน่ใจว่าโฟลเดอร์มีอยู่
if (!fs.existsSync(checkoutsDirectory)) {
    fs.mkdirSync(checkoutsDirectory, { recursive: true });
    console.log(`Created directory: ${checkoutsDirectory}`);
}

// ฟังก์ชันช่วยเหลือในการรับพาธไฟล์ checkout
const getUserCheckoutFilePath = (userEmail) => {
    // แทนที่อักขระที่ไม่ใช่ตัวอักษรและตัวเลขด้วยเครื่องหมายขีดล่างสำหรับชื่อไฟล์ที่ถูกต้อง
    return path.join(checkoutsDirectory, `${userEmail.replace(/[^a-z0-9.]/gi, '_')}.json`); // รวมจุดสำหรับอีเมล
};

// Middleware สำหรับการยืนยันตัวตนขั้นพื้นฐาน (สำหรับการเข้าถึงของแอดมิน)
const authenticateAdmin = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey === ADMIN_KEY) {
        next();
    } else {
        res.status(403).json({ error: 'Access Denied: Admin privileges required. Invalid Admin Key.' });
    }
};

// POST /api/checkout (บันทึกข้อมูลการ Checkout เมื่อผู้ใช้กด "Proceed to Checkout")
router.post('/', (req, res) => {
    const { email, cart, totalAmount } = req.body; // รับตะกร้าและยอดรวมจาก Frontend

    if (!email || !cart || !Array.isArray(cart) || typeof totalAmount === 'undefined') {
        return res.status(400).json({ message: 'Missing required checkout data (email, cart, or totalAmount).' });
    }

    const checkoutFilePath = getUserCheckoutFilePath(email);

    // โครงสร้างข้อมูล Checkout ที่ต้องการบันทึก
    const checkoutData = {
        timestamp: new Date().toISOString(),
        userEmail: email,
        items: cart,
        totalAmount: totalAmount
    };

    // อ่านข้อมูลเดิม (ถ้ามี) แล้วเพิ่มข้อมูลใหม่เข้าไป
    fs.readFile(checkoutFilePath, 'utf8', (err, data) => {
        let allCheckouts = [];
        if (!err && data) {
            try {
                allCheckouts = JSON.parse(data);
            } catch (e) {
                console.error('Error parsing existing checkout data for ' + email + ':', e);
                // หากเสียหาย อาจต้องสำรองข้อมูลหรือเขียนทับ สำหรับตอนนี้ ให้ถือว่าเป็นข้อมูลว่าง
                allCheckouts = [];
            }
        }
        allCheckouts.push(checkoutData);

        fs.writeFile(checkoutFilePath, JSON.stringify(allCheckouts, null, 2), err => {
            if (err) {
                console.error('Failed to save checkout data for ' + email + ':', err);
                return res.status(500).json({ error: 'Failed to save checkout data.' });
            }
            res.json({ success: true, message: 'Checkout data saved successfully.' });
        });
    });
});

// GET /api/admin/checkouts?email=user@example.com (สำหรับ Admin ดึงข้อมูล Checkout ของ user คนเดียว)
// ปลายทางนี้ได้รับการป้องกันด้วย middleware authenticateAdmin
router.get('/checkouts', authenticateAdmin, (req, res) => {
    const targetEmail = req.query.email; // Email ที่ Admin ต้องการดูข้อมูล

    if (!targetEmail) {
        return res.status(400).json({ error: 'Email parameter is required.' });
    }

    const checkoutFilePath = getUserCheckoutFilePath(targetEmail);

    fs.readFile(checkoutFilePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.json([]); // ถ้าไม่มีข้อมูลสำหรับ Email นั้น
            }
            console.error(`Failed to read checkout data for ${targetEmail}:`, err);
            return res.status(500).json({ error: 'Failed to retrieve checkout data.' });
        }
        try {
            res.json(JSON.parse(data));
        } catch (e) {
            console.error(`Error parsing checkout data for ${targetEmail}:`, e);
            return res.status(500).json({ error: 'Checkout data corrupted.' });
        }
    });
});

// NEW: GET /api/admin/all-checkouts (สำหรับ Admin ดึงข้อมูล Checkout ทั้งหมด)
router.get('/all-checkouts', authenticateAdmin, (req, res) => {
    fs.readdir(checkoutsDirectory, (err, files) => {
        if (err) {
            console.error("Error reading checkouts directory:", err);
            return res.status(500).json({ error: 'Failed to retrieve all checkout data.' });
        }

        let allCheckoutsData = [];
        let filesProcessed = 0;

        if (files.length === 0) {
            return res.json([]);
        }

        files.forEach(file => {
            if (path.extname(file) === '.json') {
                const filePath = path.join(checkoutsDirectory, file);
                fs.readFile(filePath, 'utf8', (readErr, data) => {
                    filesProcessed++;
                    if (!readErr && data) {
                        try {
                            const fileCheckouts = JSON.parse(data);
                            allCheckoutsData = allCheckoutsData.concat(fileCheckouts);
                        } catch (parseErr) {
                            console.error(`Error parsing checkout file ${file}:`, parseErr);
                        }
                    } else if (readErr) {
                        console.error(`Error reading checkout file ${file}:`, readErr);
                    }

                    if (filesProcessed === files.length) {
                        // เรียงลำดับตาม timestamp หากต้องการ
                        allCheckoutsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        res.json(allCheckoutsData);
                    }
                });
            } else {
                filesProcessed++;
                if (filesProcessed === files.length) {
                    allCheckoutsData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    res.json(allCheckoutsData);
                }
            }
        });
    });
});

module.exports = router;
