const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Cloud Keys
const IMGBB_API_KEY = 'cdabfaa89107b44968bae0f2a2a588b9';
const JSONBIN_BIN_ID = '6a0fdc51ee5a733b12fd322a';
const JSONBIN_MASTER_KEY = '$2a$10$iZi0.TclWJkY5UWVUVWPB.osC9zq1AVfJkR0fsf22gpnzvPJT0ktS';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '')));

// Use memory storage for Multer instead of disk
const upload = multer({ storage: multer.memoryStorage() });

// In-Memory Database Cache (populated on boot)
let dbCache = { photos: [], bookings: [], availability: {}, aboutPhotos: {} };

// Helper to fetch DB from JSONBin
async function fetchDBFromCloud() {
    try {
        console.log("Fetching database from JSONBin...");
        const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.record) {
                dbCache = { ...dbCache, ...data.record };
                console.log("Database successfully loaded into memory.");
            }
        } else {
            console.error("Failed to load DB from JSONBin. Status:", res.status);
        }
    } catch (e) {
        console.error("Error fetching from JSONBin:", e);
    }
}

// Helper to save DB to JSONBin
async function saveDBToCloud() {
    try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_MASTER_KEY
            },
            body: JSON.stringify(dbCache)
        });
        if (!res.ok) console.error("Failed to save DB to JSONBin. Status:", res.status);
    } catch (e) {
        console.error("Error saving to JSONBin:", e);
    }
}

// Helper to upload image to ImgBB
async function uploadToImgBB(buffer) {
    const params = new URLSearchParams();
    params.append('image', buffer.toString('base64'));
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: params
    });
    const data = await res.json();
    if (data.success) {
        return data.data.url;
    } else {
        throw new Error(data.error.message || 'Failed to upload to ImgBB');
    }
}

function readDB() {
    return dbCache; // Return in-memory instantly, no API calls needed
}

function writeDB(data) {
    dbCache = data; // Update memory instantly
    saveDBToCloud(); // Save to cloud in the background
}

// Boot up sequence: Load DB first
fetchDBFromCloud();


// Admin login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ success: true, token: 'demo-token-123' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Middleware
function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.includes('demo-token-123')) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
}

// Bookings endpoints
app.post('/api/bookings', (req, res) => {
    const db = readDB();
    const newBooking = {
        id: uuidv4(),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    db.bookings.push(newBooking);
    
    if (newBooking.date) {
        db.availability[newBooking.date] = 'booked';
    }
    
    writeDB(db);
    res.json({ success: true, booking: newBooking });
});

app.get('/api/bookings', authMiddleware, (req, res) => {
    const db = readDB();
    const sorted = [...db.bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, bookings: sorted });
});

// Availability endpoints
app.get('/api/availability', (req, res) => {
    const db = readDB();
    res.json({ success: true, availability: db.availability || {} });
});

app.post('/api/availability', authMiddleware, (req, res) => {
    const db = readDB();
    const { date, status } = req.body;
    if (!date) return res.status(400).json({ success: false, message: 'Date is required' });
    
    if (status === 'available') {
        delete db.availability[date];
    } else {
        db.availability[date] = status;
    }
    
    writeDB(db);
    res.json({ success: true, availability: db.availability });
});

// Photos endpoints
app.post('/api/photos', authMiddleware, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'imageBack', maxCount: 1 }]), async (req, res) => {
    if (!req.files || !req.files['image']) return res.status(400).json({ success: false, message: 'No front image uploaded' });

    try {
        const frontUrl = await uploadToImgBB(req.files['image'][0].buffer);
        let backUrl = null;
        if (req.files['imageBack']) {
            backUrl = await uploadToImgBB(req.files['imageBack'][0].buffer);
        }

        const db = readDB();
        const newPhoto = {
            id: Date.now(),
            serviceId: req.body.serviceId,
            filename: frontUrl,
            back_filename: backUrl,
            uploadedAt: new Date().toISOString()
        };
        db.photos.push(newPhoto);
        writeDB(db);
        res.json({ success: true, photo: newPhoto });
    } catch (error) {
        console.error("ImgBB Upload Error:", error);
        res.status(500).json({ success: false, message: 'Image cloud upload failed: ' + error.message });
    }
});

app.get('/api/photos/:serviceId', (req, res) => {
    const db = readDB();
    const filtered = db.photos.filter(p => p.serviceId === req.params.serviceId);
    // The URLs are now absolute http strings from ImgBB
    const returnPhotos = filtered.map(p => ({
        id: p.id,
        filename: p.filename,
        back_filename: p.back_filename
    }));
    res.json({ success: true, photos: returnPhotos });
});

app.delete('/api/photos/:id', authMiddleware, (req, res) => {
    const db = readDB();
    const id = parseInt(req.params.id);
    const photo = db.photos.find(p => p.id === id);

    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });

    // We do not physically delete from ImgBB to keep it simple, just remove from DB
    db.photos = db.photos.filter(p => p.id !== id);
    writeDB(db);
    res.json({ success: true });
});

// About photos endpoints
app.get('/api/about-photos', (req, res) => {
    const db = readDB();
    const formatted = {};
    for (const [slot, filename] of Object.entries(db.aboutPhotos || {})) {
        formatted[slot] = filename; // Filename is already an absolute HTTP URL from ImgBB
    }
    res.json({ success: true, aboutPhotos: formatted });
});

app.post('/api/about-photos', authMiddleware, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { slot } = req.body;
    if (!slot) return res.status(400).json({ success: false, message: 'Slot is required' });

    try {
        const url = await uploadToImgBB(req.file.buffer);
        
        const db = readDB();
        if (!db.aboutPhotos) {
            db.aboutPhotos = {};
        }

        db.aboutPhotos[slot] = url;
        writeDB(db);
        res.json({ success: true, aboutPhotos: db.aboutPhotos });
    } catch (error) {
        console.error("ImgBB Upload Error:", error);
        res.status(500).json({ success: false, message: 'Image cloud upload failed: ' + error.message });
    }
});

// Catch all route
app.get('*', (req, res) => {
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).send('Not found');
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
