// mock-api.js
// This file intercepts window.fetch to provide a fully functional local mock backend
// using localStorage, so the application runs perfectly without a Node.js server.

const originalFetch = window.fetch;
window.fetch = async function () {
    const url = arguments[0];
    const options = arguments[1] || {};

    // Check if it's an API route
    if (typeof url === 'string' && url.startsWith('/api/')) {
        return new Promise((resolve) => {
            setTimeout(async () => {
                const method = options.method || 'GET';

                // Helpers
                const jsonResponse = (data, status = 200) => resolve({
                    ok: status >= 200 && status < 300,
                    status,
                    json: async () => data
                });

                const db = JSON.parse(localStorage.getItem('studio_db')) || { bookings: [], photos: [], availability: {}, aboutPhotos: {} };
                if (!db.availability) {
                    db.availability = {};
                }
                if (!db.aboutPhotos) {
                    db.aboutPhotos = {};
                }
                function saveDB(newDb) {
                    localStorage.setItem('studio_db', JSON.stringify(newDb));
                }
                
                if (!db.packages) {
                    db.packages = [
                        { id: "bridesmaid", name: "Brides Maid Package", price: 4000, advance: 1000, features: ["Natural HD Glow Makeup", "Lashes and Lens", "Hairstyling", "Saree Draping"] },
                        { id: "minimalized", name: "Minimalized Package", price: 10000, advance: 3000, features: ["Subtle HD look (Natural & Elegant)", "Estee Lauder, Huda Beauty, Forever 52, PAC", "Elegant eye makeup", "Glossy lipstick longstay", "Longstay makeup spray", "Hairstyles", "Safety pins and hair pins", "Hair blow dry with crimping", "Hair accessories", "Savuri or curls & straight extension", "Flowers (depends upon the event)", "Eye lens (New one)", "Eye lashes (New one)", "Saree pre pleating", "Saree box folding", "Lehanga or can can draping available", "We wait for second Saree change over", "Complementary - Groom makeup"] },
                        { id: "signature", name: "Signature Package", price: 15000, advance: 5000, features: ["Radiant dewy HD look", "Huda beauty, Nars (for radiant look)", "Elegant eye makeup (signature look)", "Glossy lipstick contour", "Transfer proof makeup", "Long stay spray", "Hairstyles", "Safety pins and hair pins", "Hair blow dry with crimping", "Hair accessories", "Savuri or curls & straight extension", "Flowers (depends upon the event)", "Eye lens (New one)", "Eye lashes (New one)", "Saree pre pleating", "Saree fluffy pleats", "Hanger folding", "We wait for second Saree change over", "Lehanga or can can draping available", "Complementary - Groom makeup", "Hair comb, hand fan complementary"] },
                        { id: "royal", name: "Royal Airbrush Makeup", price: 22000, advance: 5000, features: ["Dewy glossy Airbrush look", "Temptu Airbrush foundations", "Elegant eye makeup (signature look)", "Glossy lipstick contour", "Transfer proof makeup", "Dewy look spray", "Long stay spray", "Hairstyles", "Safety pins and hair pins", "Hair blow dry with crimping", "Hair accessories", "Savuri or curls & straight extension", "Flowers (depends upon the event)", "Eye lens (New one)", "Eye lashes (New one)", "Saree pre pleating", "Saree fluffy pleats", "Hanger folding", "Box folding", "We wait for second Saree change over", "Lehanga or can can draping available", "Complementary - Groom makeup", "Hair comb, hand fan complementary"] },
                        { id: "workshop", name: "2 Days Saree Draping Workshop", price: 2500, advance: 0, features: ["Day 1: Normal pre-pleating with box folding and hands-on practice.", "Day 2: Fluffy pleating with hanger and box folding.", "Draping class with proper hands-on session."] }
                    ];
                    saveDB(db);
                }

                // Route: /api/login
                if (url === '/api/login' && method === 'POST') {
                    const body = JSON.parse(options.body);
                    if (body.username === 'admin' && body.password === 'admin123') {
                        return jsonResponse({ success: true, token: 'mock-token-123' });
                    }
                    return jsonResponse({ success: false, message: 'Invalid credentials' }, 401);
                }

                // Auth check for protected routes
                const isProtected = ['POST', 'DELETE'].includes(method) || url === '/api/bookings';
                if (isProtected) {
                    const authHeader = options.headers?.['Authorization'] || options.headers?.['authorization'];
                    if (!authHeader || !authHeader.includes('mock-token-123')) {
                        return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
                    }
                }

                // Route: /api/bookings
                if (url === '/api/bookings' && method === 'POST') {
                    const body = JSON.parse(options.body);
                    const booking = { id: Date.now().toString(), ...body, createdAt: new Date().toISOString() };
                    db.bookings.push(booking);
                    if (booking.date) {
                        db.availability[booking.date] = 'booked';
                    }
                    saveDB(db);
                    return jsonResponse({ success: true, booking });
                }

                if (url === '/api/bookings' && method === 'GET') {
                    const sorted = [...db.bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    return jsonResponse({ success: true, bookings: sorted });
                }

                // Route: /api/availability
                if (url === '/api/availability' && method === 'GET') {
                    return jsonResponse({ success: true, availability: db.availability || {} });
                }

                if (url === '/api/availability' && method === 'POST') {
                    const body = JSON.parse(options.body);
                    if (!body.date) {
                        return jsonResponse({ success: false, message: 'Date is required' }, 400);
                    }
                    if (body.status === 'available') {
                        delete db.availability[body.date];
                    } else {
                        db.availability[body.date] = body.status;
                    }
                    saveDB(db);
                    return jsonResponse({ success: true, availability: db.availability });
                }

                // Route: /api/about-photos
                if (url === '/api/about-photos' && method === 'GET') {
                    return jsonResponse({ success: true, aboutPhotos: db.aboutPhotos || {} });
                }

                if (url === '/api/about-photos' && method === 'POST') {
                    const formData = options.body;
                    let slot = '';
                    if (formData instanceof FormData) {
                        slot = formData.get('slot');
                        const file = formData.get('image');

                        const readFile = (f) => new Promise(resolve => {
                            if (!f) return resolve(null);
                            const reader = new FileReader();
                            reader.onload = e => resolve(e.target.result);
                            reader.readAsDataURL(f);
                        });

                        if (file) {
                            readFile(file).then((dataUrl) => {
                                if (!db.aboutPhotos) {
                                    db.aboutPhotos = {};
                                }
                                db.aboutPhotos[slot] = dataUrl;
                                saveDB(db);
                                jsonResponse({ success: true, aboutPhotos: db.aboutPhotos });
                            });
                            return; // prevent immediate resolve
                        }
                    }
                    return jsonResponse({ success: false, message: 'Bad request' }, 400);
                }

                // Route: /api/send-sms
                if (url === '/api/send-sms' && method === 'POST') {
                    const body = JSON.parse(options.body);
                    console.log(`[MOCK API] Direct SMS successfully sent to ${body.to}:\n${body.message}`);
                    return jsonResponse({ success: true, message: 'SMS Sent successfully' });
                }

                // Route: /api/photos
                if (url === '/api/photos' && method === 'POST') {
                    // Handle FormData from dashboard
                    const formData = options.body;
                    let serviceId = '';
                    let fileDataUrl = '';

                    // Since we can't easily parse real FormData in vanilla js without doing it manually,
                    // we'll trick it: our dashboard code will pass values, but FormData parsing is complex.
                    // Wait, we can't get form values directly from fetch FormData object securely in old browsers,
                    // but we can iterate.
                    if (formData instanceof FormData) {
                        serviceId = formData.get('serviceId');
                        const file = formData.get('image');
                        const fileBack = formData.get('imageBack');

                        const readFile = (f) => new Promise(resolve => {
                            if (!f) return resolve(null);
                            const reader = new FileReader();
                            reader.onload = e => resolve(e.target.result);
                            reader.readAsDataURL(f);
                        });

                        // Convert file to DataURL
                        if (file) {
                            Promise.all([readFile(file), readFile(fileBack)]).then(([dataFront, dataBack]) => {
                                const newPhoto = {
                                    id: Date.now(),
                                    serviceId: serviceId,
                                    filename: 'dataURL',
                                    data: dataFront,
                                    dataBack: dataBack || null,
                                    uploadedAt: new Date().toISOString()
                                };
                                db.photos.push(newPhoto);
                                saveDB(db);
                                jsonResponse({ success: true, photo: newPhoto });
                            });
                            return; // prevent immediate resolve
                        }
                    }
                    return jsonResponse({ success: false, message: 'Bad request' }, 400);
                }

                if (url.startsWith('/api/photos/') && method === 'GET') {
                    const serviceId = url.split('/api/photos/')[1];
                    const filtered = db.photos.filter(p => p.serviceId === serviceId);
                    // Map local photo object structure format to return the actual datastring directly as filename or provide a structured way
                    // We will just patch the frontend to use the base64 URL directly if we send it in `filename`.
                    const returnPhotos = filtered.map(p => ({
                        id: p.id,
                        filename: p.data, // we put the data url here to be used directly by frontend!
                        back_filename: p.dataBack || null
                    }));
                    return jsonResponse({ success: true, photos: returnPhotos });
                }

                if (url.startsWith('/api/photos/') && method === 'DELETE') {
                    const id = parseInt(url.split('/api/photos/')[1]);
                    db.photos = db.photos.filter(p => p.id !== id);
                    saveDB(db);
                    return jsonResponse({ success: true });
                }

                // Route: /api/packages
                if (url === '/api/packages' && method === 'GET') {
                    return jsonResponse({ success: true, packages: db.packages || [] });
                }

                if (url === '/api/packages' && method === 'PUT') {
                    const body = JSON.parse(options.body);
                    // Update a specific package by id
                    if (body.id && db.packages) {
                        const pkgIndex = db.packages.findIndex(p => p.id === body.id);
                        if (pkgIndex !== -1) {
                            db.packages[pkgIndex] = { ...db.packages[pkgIndex], ...body };
                            saveDB(db);
                            return jsonResponse({ success: true, package: db.packages[pkgIndex] });
                        }
                    }
                    return jsonResponse({ success: false, message: 'Package not found' }, 404);
                }

                return jsonResponse({ success: false, message: 'Not Found' }, 404);
            }, 300); // 300ms network delay simulation
        });
    }

    // Default fetch behavior
    return originalFetch.apply(this, arguments);
};

// Also prepopulate some initial photos so presentation looks good
(function () {
    if (!localStorage.getItem('studio_db')) {
        localStorage.setItem('studio_db', JSON.stringify({
            bookings: [
                {
                    id: "1", name: "Jane Smith", phone: "9876543210",
                    service: "combo", date: "2026-06-15",
                    message: "Looking for full bridal package.", createdAt: new Date().toISOString()
                }
            ],
            photos: [
                {
                    id: 101,
                    serviceId: 'bridal',
                    filename: 'images/cindrella-ruth.png',
                    data: 'images/cindrella-ruth.png',
                    dataBack: 'images/cindrella-about-overlap.png',
                    uploadedAt: new Date().toISOString()
                },
                {
                    id: 102,
                    serviceId: 'hair',
                    filename: 'images/prisilla-portrait.png',
                    data: 'images/prisilla-portrait.png',
                    dataBack: 'images/prisilla-hair-details.png',
                    uploadedAt: new Date().toISOString()
                }
            ]
        }));
    }
})();
