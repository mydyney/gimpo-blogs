// gogohaku - Main Logic & Interactions

document.addEventListener('DOMContentLoaded', () => {
    // 1. Scroll-driven Reveal Animations
    const revealItems = document.querySelectorAll('.reveal-item');
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                
                // If it contains the chart path, reset/trigger its animation
                if (entry.target.querySelector('.chart-path')) {
                    const path = entry.target.querySelector('.chart-path');
                    path.style.animation = 'none';
                    path.offsetHeight; // force reflow
                    path.style.animation = 'drawChart 3.5s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                }
                
                observer.unobserve(entry.target); // Animates only once
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    revealItems.forEach(item => {
        revealObserver.observe(item);
    });

    // 2. Smooth Scrolling with Offset for Sticky Header
    const stickyHeaderHeight = 80;
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - stickyHeaderHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 3. Web3Forms AJAX Submission & Success Modal Handler
    const contactForm = document.getElementById('contact-form');
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const submitButtonText = submitButton.querySelector('.btn-text');
    const submitButtonSpinner = submitButton.querySelector('.btn-spinner');
    
    const successModal = document.getElementById('success-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    // Modal display functions
    function showModal() {
        successModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Lock background scroll
        setTimeout(() => {
            successModal.querySelector('.modal-overlay').classList.replace('opacity-0', 'opacity-100');
            successModal.querySelector('.modal-content').classList.replace('scale-95', 'scale-100');
            successModal.querySelector('.modal-content').classList.replace('opacity-0', 'opacity-100');
        }, 10);
    }

    function closeModal() {
        successModal.querySelector('.modal-overlay').classList.replace('opacity-100', 'opacity-0');
        successModal.querySelector('.modal-content').classList.replace('scale-100', 'scale-95');
        successModal.querySelector('.modal-content').classList.replace('opacity-100', 'opacity-0');
        
        setTimeout(() => {
            successModal.classList.add('hidden');
            document.body.style.overflow = ''; // Unlock scroll
        }, 400);
    }

    modalCloseBtn.addEventListener('click', closeModal);
    
    // Close modal on clicking overlay background
    successModal.querySelector('.modal-overlay').addEventListener('click', closeModal);

    // Form Submit Event
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Show spinner / disable button
        submitButton.disabled = true;
        submitButtonText.textContent = '送信中...';
        submitButtonSpinner.classList.remove('hidden');
        
        const formData = new FormData(contactForm);
        
        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        })
        .then(async (response) => {
            let json = await response.json();
            if (response.status == 200) {
                // Success!
                showModal();
                contactForm.reset();
            } else {
                console.log(response);
                alert(json.message || 'エラーが発生しました。時間を置いて再度お試しください。');
            }
        })
        .catch(error => {
            console.log(error);
            alert('接続エラーが発生しました。インターネット接続を確認してください。');
        })
        .finally(() => {
            // Restore button state
            submitButton.disabled = false;
            submitButtonText.textContent = '無料で相談する';
            submitButtonSpinner.classList.add('hidden');
        });
    });

    // Mobile Navigation Toggle Menu
    const navMenuBtn = document.getElementById('nav-menu-btn');
    const mobileNavList = document.getElementById('mobile-nav-list');

    if (navMenuBtn && mobileNavList) {
        navMenuBtn.addEventListener('click', () => {
            mobileNavList.classList.toggle('hidden');
        });
        
        // Close menu when a link is clicked
        mobileNavList.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileNavList.classList.add('hidden');
            });
        });
    }
});
