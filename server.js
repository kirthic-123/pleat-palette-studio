const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '')));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

const DB_FILE = path.join(__dirname, 'db.json');

function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = { photos: [], bookings: [], availability: {}, aboutPhotos: {} };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!db.availability) {
        db.availability = {};
    }
    if (!db.aboutPhotos) {
        db.aboutPhotos = {};
    }
    return db;
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, uuidv4() + ext);
    }
});

const upload = multer({ storage: storage });

// Admin login (simple hardcoded credentials for demo)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ success: true, token: 'demo-token-123' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Middleware to check fake token
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
    
    // Automatically mark the date as booked if event date is provided
    if (newBooking.date) {
        db.availability[newBooking.date] = 'booked';
    }
    
    writeDB(db);
    res.json({ success: true, booking: newBooking });
});

app.get('/api/bookings', authMiddleware, (req, res) => {
    const db = readDB();
    // sort by latest
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
app.post('/api/photos', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const db = readDB();
    const newPhoto = {
        id: Date.now(),
        serviceId: req.body.serviceId,
        filename: req.file.filename,
        uploadedAt: new Date().toISOString()
    };
    db.photos.push(newPhoto);
    writeDB(db);
    res.json({ success: true, photo: newPhoto });
});

app.get('/api/photos/:serviceId', (req, res) => {
    const db = readDB();
    const filtered = db.photos.filter(p => p.serviceId === req.params.serviceId);
    res.json({ success: true, photos: filtered });
});

app.delete('/api/photos/:id', authMiddleware, (req, res) => {
    const db = readDB();
    const id = parseInt(req.params.id);
    const photo = db.photos.find(p => p.id === id);

    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });

    // delete file
    const filePath = path.join(UPLOADS_DIR, photo.filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    db.photos = db.photos.filter(p => p.id !== id);
    writeDB(db);
    res.json({ success: true });
});

// About photos endpoints
app.get('/api/about-photos', (req, res) => {
    const db = readDB();
    res.json({ success: true, aboutPhotos: db.aboutPhotos || {} });
});

app.post('/api/about-photos', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { slot } = req.body;
    if (!slot) return res.status(400).json({ success: false, message: 'Slot is required' });

    const db = readDB();
    if (!db.aboutPhotos) {
        db.aboutPhotos = {};
    }

    const oldFilename = db.aboutPhotos[slot];
    if (oldFilename && !oldFilename.startsWith('data:') && !oldFilename.startsWith('images/')) {
        const oldPath = path.join(UPLOADS_DIR, oldFilename);
        if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
        }
    }

    db.aboutPhotos[slot] = req.file.filename;
    writeDB(db);
    res.json({ success: true, aboutPhotos: db.aboutPhotos });
});

// Catch all route to serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
