// AgenticSocial Japan - Main Script & Interactive System

document.addEventListener('DOMContentLoaded', () => {

    // 1. Mouse spotlight interaction for glass cards (glow tracker)
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

    // 2. Scroll-driven Reveal Observer
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

    // 3. Smooth Scrolling with Sticky Nav Offset
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

    // 4. Web3Forms AJAX Form Submit & Neon Success Modal Trigger
    const contactForm = document.getElementById('contact-form');
    const submitBtn = contactForm ? contactForm.querySelector('button[type="submit"]') : null;
    const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
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
            if (btnText) btnText.textContent = '전송 중...';
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
                    alert(json.message || '전송 에러가 발생했습니다. 다시 시도해 주세요.');
                }
            })
            .catch(error => {
                console.log(error);
                alert('네트워크 연결 오류가 발생했습니다.');
            })
            .finally(() => {
                // Reset button state
                submitBtn.disabled = false;
                if (btnText) btnText.textContent = '문의 전송하기';
                if (btnSpinner) btnSpinner.classList.add('hidden');
            });
        });
    }

    // 5. Mobile nav toggle drawer
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
