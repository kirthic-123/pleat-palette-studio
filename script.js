// Splash Screen
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
            }, 1000);
        }
    }, 2000);
});

// Navbar Scroll Effect
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// Mobile Menu Toggle (Basic implementation)
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');
if (mobileMenuToggle && navLinks) {
    mobileMenuToggle.addEventListener('click', () => {
        if (navLinks.style.display === 'flex') {
            navLinks.style.display = 'none';
        } else {
            navLinks.style.display = 'flex';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '100%';
            navLinks.style.left = '0';
            navLinks.style.width = '100%';
            navLinks.style.background = 'rgba(255, 255, 255, 0.95)';
            navLinks.style.padding = '1rem 0';
        }
    });
}

// Form Submission
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedDate = document.getElementById('date').value;
        if (clientAvailabilityData[selectedDate] === 'booked' || clientAvailabilityData[selectedDate] === 'unavailable') {
            alert('The selected date is not available. Please choose another date.');
            return;
        }
        const today = new Date();
        today.setHours(0,0,0,0);
        const selDateObj = new Date(selectedDate);
        if (selDateObj < today) {
            alert('Please select a future date.');
            return;
        }

        const formData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            service: document.getElementById('service').value,
            date: document.getElementById('date').value,
            location: document.getElementById('location').value,
            message: document.getElementById('message').value
        };

        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        try {
            // Log to dashboard mock API
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            // Format WhatsApp Message
            const phoneNumber = "919585562822";
            const serviceNames = {
                'bridal': 'Bridal Makeup',
                'hair': 'Bridal Hairstyle',
                'saree': 'Saree Pre-Pleating & Draping',
                'combo': 'Complete Bridal/Groom Combo',
                'workshop': '2-Day Saree Draping Workshop'
            };
            const serviceLabel = serviceNames[formData.service] || formData.service;

            const waText = `Hello! I would like to make an enquiry with The Pleat & Palette Studio.\n\n*Name:* ${formData.name}\n*Phone:* ${formData.phone}\n*Service:* ${serviceLabel}\n*Event Date:* ${formData.date}\n*Location:* ${formData.location}\n\n*Additional Details:*\n${formData.message || 'No additional details.'}`;

            // Open WhatsApp in a new tab smoothly
            window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(waText)}`, '_blank');

            // Always show the success overlay regardless of backend stability
            document.getElementById('formSuccess').classList.add('active');

            bookingForm.reset();

        } catch (error) {
            console.error('Error:', error);
            alert('Something went wrong, but you will be redirected to WhatsApp to send your message manually.');

            // Fallback WhatsApp Launch
            window.open(`https://wa.me/${phoneNumber}`, '_blank');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

const closeSuccessBtn = document.getElementById('closeSuccess');
if (closeSuccessBtn) {
    closeSuccessBtn.addEventListener('click', () => {
        document.getElementById('formSuccess').classList.remove('active');
    });
}

// Gallery Functions
async function openGallery(serviceId) {
    const titleMap = {
        'bridal': 'Bridal Makeup Works',
        'hair': 'Hairstyle Designs',
        'saree': 'Saree Draping Works'
    };

    document.getElementById('galleryTitle').textContent = titleMap[serviceId] || 'Past Works';
    const container = document.getElementById('galleryContainer');
    const loading = document.getElementById('galleryLoadingIndicator');

    container.innerHTML = '';
    loading.style.display = 'block';
    document.getElementById('galleryModal').style.display = 'block';

    try {
        const res = await fetch(`/api/photos/${serviceId}`);
        const data = await res.json();

        loading.style.display = 'none';

        if (data.photos && data.photos.length > 0) {
            container.innerHTML = data.photos.map(p => {
                if (p.back_filename) {
                    return `
                        <div class="flip-card" onclick="this.classList.toggle('flipped')">
                            <div class="flip-card-inner">
                                <div class="flip-card-front">
                                    <img src="${p.filename}" alt="${serviceId} front view">
                                    <div class="flip-indicator"><i class="ph ph-arrows-left-right"></i> Tap to flip</div>
                                </div>
                                <div class="flip-card-back">
                                    <img src="${p.back_filename}" alt="${serviceId} back view">
                                    <div class="flip-indicator"><i class="ph ph-arrows-left-right"></i> Tap to flip</div>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    return `<img src="${p.filename}" alt="${serviceId} work">`;
                }
            }).join('');
        } else {
            container.innerHTML = '<p style="color: white; grid-column: 1/-1; text-align: center;">New works coming soon.</p>';
        }
    } catch (e) {
        loading.style.display = 'none';
        container.innerHTML = '<p style="color: red; grid-column: 1/-1; text-align: center;">Failed to load images.</p>';
    }
}

function closeGallery() {
    document.getElementById('galleryModal').style.display = 'none';
}

// Scroll Animation Observer
document.addEventListener('DOMContentLoaded', () => {
    const fadeElements = document.querySelectorAll('.fade-up');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once animated
                // observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1, // Trigger when 10% visible
        rootMargin: '0px 0px -50px 0px'
    });

    fadeElements.forEach(el => observer.observe(el));
    
    // Load dynamic pricing packages
    loadPackages();

    // Load customer availability calendar
    loadClientAvailability();

    // Bind native date picker input change validation
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.addEventListener('change', (e) => {
            validateNativeDate(e.target.value);
        });
    }
});

// Dynamic Packages Function
async function loadPackages() {
    try {
        const res = await fetch('/api/packages');
        const data = await res.json();
        
        if (data.success && data.packages) {
            data.packages.forEach(pkg => {
                const priceEl = document.getElementById(`price-${pkg.id}`);
                const advEl = document.getElementById(`adv-${pkg.id}`);
                
                if (priceEl) {
                    priceEl.textContent = `₹${pkg.price.toLocaleString('en-IN')}`;
                }
                
                if (advEl && pkg.advance > 0) {
                    advEl.textContent = `Advance: ₹${pkg.advance.toLocaleString('en-IN')}`;
                } else if (advEl) {
                    advEl.style.display = 'none';
                }
                
                const featuresEl = document.getElementById(`features-${pkg.id}`);
                if (featuresEl && pkg.features) {
                    featuresEl.innerHTML = pkg.features.map(f => `<li><i class="ph-fill ph-check-circle"></i> ${f}</li>`).join('');
                }
            });
        }
    } catch (e) {
        console.error('Failed to load packages:', e);
    }
}

// Client Availability Calendar Logic
let clientAvailabilityData = {};
let clientCalendarDate = new Date();
let selectedClientDateStr = null;

async function loadClientAvailability() {
    try {
        const res = await fetch('/api/availability');
        const data = await res.json();
        if (data.success) {
            clientAvailabilityData = data.availability || {};
            
            // Render the calendar
            renderClientCalendar();

            // Check if there is an active banner slot estimate to update
            const dynamicSlotsEl = document.getElementById('dynamic-slots');
            if (dynamicSlotsEl) {
                // Count available days left this month
                const year = new Date().getFullYear();
                const month = new Date().getMonth();
                const totalDays = new Date(year, month + 1, 0).getDate();
                const todayDay = new Date().getDate();
                
                let availableCount = 0;
                for (let day = todayDay; day <= totalDays; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const status = clientAvailabilityData[dateStr] || 'available';
                    if (status === 'available') {
                        availableCount++;
                    }
                }
                dynamicSlotsEl.textContent = `${availableCount} Dates Left this Month`;
            }
        }
    } catch (e) {
        console.error("Failed to load availability data for client calendar", e);
    }
}

function renderClientCalendar() {
    const container = document.getElementById('customer-calendar');
    if (!container) return;

    const year = clientCalendarDate.getFullYear();
    const month = clientCalendarDate.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1).getDay();
    // Number of days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    let html = `
        <div class="calendar-header">
            <button class="calendar-nav-btn" type="button" onclick="changeClientMonth(-1)"><i class="ph ph-caret-left"></i></button>
            <span class="calendar-title">${monthNames[month]} ${year}</span>
            <button class="calendar-nav-btn" type="button" onclick="changeClientMonth(1)"><i class="ph ph-caret-right"></i></button>
        </div>
        <div class="calendar-weekdays">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
        </div>
        <div class="calendar-days">
    `;

    // Spacer cells for previous month days
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day empty"></div>`;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cellDateObj = new Date(year, month, day);
        
        let status = clientAvailabilityData[dateStr] || 'available';
        
        // If it's a past date, it's unavailable to book
        if (cellDateObj < today) {
            status = 'unavailable';
        }

        let statusClass = 'available';
        if (status === 'booked') statusClass = 'booked';
        else if (status === 'unavailable') statusClass = 'unavailable';

        const isSelected = dateStr === selectedClientDateStr ? 'selected' : '';
        const clickAttr = (status === 'available') ? `onclick="selectClientDate('${dateStr}')"` : '';

        html += `
            <div class="calendar-day ${statusClass} ${isSelected}" ${clickAttr}>
                <span>${day}</span>
                <div class="day-indicator"></div>
            </div>
        `;
    }

    html += `
        </div>
        <div class="calendar-legend">
            <div class="legend-item"><div class="legend-dot available"></div><span>Available</span></div>
            <div class="legend-item"><div class="legend-dot booked"></div><span>Fully Booked</span></div>
            <div class="legend-item"><div class="legend-dot unavailable"></div><span>Blocked/Past</span></div>
        </div>
    `;

    container.innerHTML = html;
}

function changeClientMonth(direction) {
    clientCalendarDate.setMonth(clientCalendarDate.getMonth() + direction);
    renderClientCalendar();
}

function selectClientDate(dateStr) {
    selectedClientDateStr = dateStr;
    
    // Set native date picker value
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = dateStr;
        
        // Remove warning banner if any
        removeWarningBanner();
    }

    // Re-render to highlight selected cell
    renderClientCalendar();

    // Focus / Scroll smoothly to the next form field or input block
    const locationInput = document.getElementById('location');
    if (locationInput) {
        locationInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => locationInput.focus(), 500);
    }
}

function validateNativeDate(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selDateObj = new Date(dateStr);

    removeWarningBanner();

    if (!dateStr) return;

    let errorMsg = "";
    if (selDateObj < today) {
        errorMsg = "⚠️ Please select a future event date.";
    } else {
        const status = clientAvailabilityData[dateStr] || 'available';
        if (status === 'booked') {
            errorMsg = "⚠️ The selected date is fully booked. Please select another date from the calendar.";
        } else if (status === 'unavailable') {
            errorMsg = "⚠️ The selected date is unavailable or blocked by the admin. Please select an available date.";
        }
    }

    if (errorMsg) {
        // Render warning banner
        const dateInput = document.getElementById('date');
        const parent = dateInput.parentElement;
        
        const banner = document.createElement('div');
        banner.className = 'calendar-warning-banner';
        banner.id = 'date-warning-msg';
        banner.innerHTML = `<i class="ph ph-warning-circle"></i><span>${errorMsg}</span>`;
        parent.appendChild(banner);

        // Disable submit button
        const submitBtn = bookingForm ? bookingForm.querySelector('button[type="submit"]') : null;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        }

        // Deselect in calendar
        selectedClientDateStr = null;
        renderClientCalendar();
    } else {
        // Update selection in calendar
        selectedClientDateStr = dateStr;
        // Adjust calendar view to show this date's month
        const [yr, mo] = dateStr.split('-');
        clientCalendarDate = new Date(yr, mo - 1, 1);
        renderClientCalendar();
    }
}

function removeWarningBanner() {
    const banner = document.getElementById('date-warning-msg');
    if (banner) {
        banner.remove();
    }
    // Enable submit button
    const submitBtn = bookingForm ? bookingForm.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
        submitBtn.style.cursor = '';
    }
}
