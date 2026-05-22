// hakuandsen - Main Script & Interactive System

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Bilingual Language Switcher (Instant KO/JA Client-Side Toggle)
    const langToggleBtn = document.getElementById('lang-toggle-btn');
    const langToggleTexts = langToggleBtn ? langToggleBtn.querySelectorAll('.lang-opt') : [];
    
    // Check saved language or default to Korean ('ko')
    let currentLang = localStorage.getItem('hakuandsen_lang') || 'ko';
    setLanguage(currentLang);
    
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            currentLang = currentLang === 'ko' ? 'ja' : 'ko';
            setLanguage(currentLang);
        });
    }

    function setLanguage(lang) {
        document.documentElement.lang = lang;
        localStorage.setItem('hakuandsen_lang', lang);
        
        // Update toggle button active styling state
        if (langToggleTexts.length === 2) {
            if (lang === 'ko') {
                langToggleTexts[0].classList.add('text-primary', 'font-extrabold');
                langToggleTexts[0].classList.remove('opacity-40');
                langToggleTexts[1].classList.remove('text-secondary', 'font-extrabold');
                langToggleTexts[1].classList.add('opacity-40');
            } else {
                langToggleTexts[1].classList.add('text-secondary', 'font-extrabold');
                langToggleTexts[1].classList.remove('opacity-40');
                langToggleTexts[0].classList.remove('text-primary', 'font-extrabold');
                langToggleTexts[0].classList.add('opacity-40');
            }
        }
    }

    // 2. Mouse spotlight interaction for glass cards (glow tracker)
    const spotlightCards = document.querySelectorAll('.spotlight-card');
    spotlightCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // 3. Scroll-driven Reveal Observer
    const revealItems = document.querySelectorAll('.reveal-item');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Trigger only once
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealItems.forEach(item => {
        revealObserver.observe(item);
    });

    // 4. Smooth Scrolling with Sticky Nav Offset
    const headerOffset = 90;
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({
                    top: elementPosition - headerOffset,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 5. Web3Forms AJAX Form Submit & Neon Success Modal Trigger
    const contactForm = document.getElementById('contact-form');
    const submitBtn = contactForm ? contactForm.querySelector('button[type="submit"]') : null;
    const btnTextKo = submitBtn ? submitBtn.querySelector('.btn-text-ko') : null;
    const btnTextJa = submitBtn ? submitBtn.querySelector('.btn-text-ja') : null;
    const btnSpinner = submitBtn ? submitBtn.querySelector('.btn-spinner') : null;
    
    const successModal = document.getElementById('success-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    function openModal() {
        if (!successModal) return;
        successModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // prevent bg scroll
        
        setTimeout(() => {
            successModal.querySelector('.modal-overlay').classList.replace('opacity-0', 'opacity-100');
            successModal.querySelector('.modal-content').classList.replace('scale-95', 'scale-100');
            successModal.querySelector('.modal-content').classList.replace('opacity-0', 'opacity-100');
        }, 10);
    }

    function closeModal() {
        if (!successModal) return;
        successModal.querySelector('.modal-overlay').classList.replace('opacity-100', 'opacity-0');
        successModal.querySelector('.modal-content').classList.replace('scale-100', 'scale-95');
        successModal.querySelector('.modal-content').classList.replace('opacity-100', 'opacity-0');
        
        setTimeout(() => {
            successModal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 400);
    }

    if (modalCloseBtn && successModal) {
        modalCloseBtn.addEventListener('click', closeModal);
        successModal.querySelector('.modal-overlay').addEventListener('click', closeModal);
    }

    if (contactForm && submitBtn) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Set loading state
            submitBtn.disabled = true;
            if (btnTextKo) btnTextKo.textContent = '전송 중...';
            if (btnTextJa) btnTextJa.textContent = '送信中...';
            if (btnSpinner) btnSpinner.classList.remove('hidden');
            
            const formData = new FormData(contactForm);
            
            fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                body: formData
            })
            .then(async (response) => {
                let json = await response.json();
                if (response.status == 200) {
                    // Submit succeeded
                    openModal();
                    contactForm.reset();
                } else {
                    console.log(response);
                    const errorMsg = currentLang === 'ko' 
                        ? (json.message || '전송 에러가 발생했습니다. 다시 시도해 주세요.') 
                        : (json.message || 'エラーが発生しました。時間を置いて再度お試しください。');
                    alert(errorMsg);
                }
            })
            .catch(error => {
                console.log(error);
                const netErrorMsg = currentLang === 'ko'
                    ? '네트워크 연결 오류가 발생했습니다.'
                    : '接続エラーが発生しました。';
                alert(netErrorMsg);
            })
            .finally(() => {
                // Reset button state
                submitBtn.disabled = false;
                if (btnTextKo) btnTextKo.textContent = '문의 전송하기';
                if (btnTextJa) btnTextJa.textContent = '送信する';
                if (btnSpinner) btnSpinner.classList.add('hidden');
            });
        });
    }

    // Mobile nav toggle drawer
    const navMenuBtn = document.getElementById('nav-menu-btn');
    const mobileNavList = document.getElementById('mobile-nav-list');
    
    if (navMenuBtn && mobileNavList) {
        navMenuBtn.addEventListener('click', () => {
            mobileNavList.classList.toggle('hidden');
        });
        
        // Close on clicking menu links
        mobileNavList.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileNavList.classList.add('hidden');
            });
        });
    }
});
