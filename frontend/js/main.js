/**
 * Farm Assistant - Main JavaScript
 * Handles:
 *  - Authentication modal interaction (open, close, tab switching, password toggles)
 *  - Product carousel scrolling
 *  - Hero live telemetry simulation and sensor chip rotation
 *  - ScrollSpy navigation highlight
 */

// ==========================================
// Authentication Modal Controls
// ==========================================
window.openAuthModal = function (initialState) {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    window.switchAuthTab(initialState || 'login');
    document.body.style.overflow = 'hidden';
};

window.closeAuthModal = function () {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
};

window.switchAuthTab = function (state) {
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const stateLogin = document.getElementById('state-login');
    const stateSignup = document.getElementById('state-signup');

    if (state === 'signup') {
        if (tabSignup) {
            tabSignup.className = 'flex-1 py-2 rounded-lg font-label-md text-label-md bg-surface-container-lowest text-on-surface shadow-sm font-bold';
        }
        if (tabLogin) {
            tabLogin.className = 'flex-1 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface';
        }
        if (stateLogin) {
            stateLogin.classList.add('hidden');
            stateLogin.classList.remove('flex');
        }
        if (stateSignup) {
            stateSignup.classList.remove('hidden');
            stateSignup.classList.add('flex');
        }
    } else {
        if (tabLogin) {
            tabLogin.className = 'flex-1 py-2 rounded-lg font-label-md text-label-md bg-surface-container-lowest text-on-surface shadow-sm font-bold';
        }
        if (tabSignup) {
            tabSignup.className = 'flex-1 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface';
        }
        if (stateSignup) {
            stateSignup.classList.add('hidden');
            stateSignup.classList.remove('flex');
        }
        if (stateLogin) {
            stateLogin.classList.remove('hidden');
            stateLogin.classList.add('flex');
        }
    }
};

window.togglePasswordVisibility = function (inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input || !btn) return;
    const icon = btn.querySelector('.material-symbols-outlined');
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.textContent = 'visibility_off';
    } else {
        input.type = 'password';
        if (icon) icon.textContent = 'visibility';
    }
};

window.handleAgreeChange = function (isChecked) {
    const submitBtn = document.getElementById('signup-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = !isChecked;
    }
};

// ==========================================
// Initialization on DOMContentLoaded
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    // 1. Close modal on backdrop click or Escape key
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                window.closeAuthModal();
            }
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            window.closeAuthModal();
        }
    });

    // 2. Product Carousel Scrolling
    const track = document.getElementById('product-track');
    const prevBtn = document.getElementById('prod-prev');
    const nextBtn = document.getElementById('prod-next');
    if (track && prevBtn && nextBtn) {
        prevBtn.addEventListener('click', function () {
            track.scrollBy({ left: -340, behavior: 'smooth' });
        });
        nextBtn.addEventListener('click', function () {
            track.scrollBy({ left: 340, behavior: 'smooth' });
        });
    }

    // 3. Hero rotating chip highlight & live telemetry updates
    const chips = document.querySelectorAll('.hero-chip');
    const moistureEl = document.getElementById('telemetry-moisture');
    const solarWEl = document.getElementById('live-solar-w');
    const mmEl = document.getElementById('telemetry-mm');
    const litresEl = document.getElementById('telemetry-litres');
    let activeIdx = 0;

    const telemetryStates = [
        { moisture: '42%', solar: '760 W/m²', mm: '3.8 mm', litres: '15,200 Litres' },
        { moisture: '39%', solar: '810 W/m²', mm: '4.1 mm', litres: '16,400 Litres' },
        { moisture: '45%', solar: '690 W/m²', mm: '3.4 mm', litres: '13,600 Litres' },
        { moisture: '44%', solar: '740 W/m²', mm: '3.6 mm', litres: '14,400 Litres' },
        { moisture: '41%', solar: '780 W/m²', mm: '3.9 mm', litres: '15,600 Litres' }
    ];

    if (chips.length > 0) {
        setInterval(function () {
            chips.forEach(function (c, i) {
                if (i === activeIdx) {
                    c.className = 'hero-chip text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-md transition-all duration-500 bg-secondary-fixed text-on-secondary-fixed-variant shadow-sm ring-1 ring-primary/40 scale-105';
                } else {
                    c.className = 'hero-chip text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-md transition-all duration-500 bg-surface-container-highest text-on-surface-variant';
                }
            });

            const data = telemetryStates[activeIdx];
            if (data) {
                if (moistureEl) moistureEl.textContent = data.moisture;
                if (solarWEl) solarWEl.textContent = data.solar;
                if (mmEl) mmEl.textContent = data.mm;
                if (litresEl) litresEl.textContent = data.litres;
            }

            activeIdx = (activeIdx + 1) % chips.length;
        }, 3200);
    }

    // 4. ScrollSpy Navigation
    initScrollSpy();
});

// ==========================================
// Navigation ScrollSpy
// ==========================================
function initScrollSpy() {
    const navLinks = document.querySelectorAll('header nav a.nav-link');
    const sections = ['home', 'problem', 'features', 'products'].map(id => document.getElementById(id)).filter(Boolean);

    if (navLinks.length === 0 || sections.length === 0) return;

    function setActive(activeId) {
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            const isMatch = href === '#' + activeId;
            if (isMatch) {
                link.classList.add('text-primary', 'font-bold');
                link.classList.remove('text-on-surface-variant');
                link.classList.remove('after:bg-transparent');
                link.classList.add('after:bg-primary');
            } else {
                link.classList.remove('text-primary', 'font-bold');
                link.classList.add('text-on-surface-variant');
                link.classList.remove('after:bg-primary');
                link.classList.add('after:bg-transparent');
            }
        });
    }

    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setActive(entry.target.id);
            }
        });
    }, observerOptions);

    sections.forEach(sec => observer.observe(sec));

    window.addEventListener('scroll', () => {
        if (window.scrollY < 80) {
            setActive('home');
        }
    }, { passive: true });
}
