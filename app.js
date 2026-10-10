document.addEventListener('DOMContentLoaded', () => {
  // 1. Image Thumbnail Switcher
  const mainImage = document.getElementById('main-product-img');
  const thumbs = document.querySelectorAll('.thumb-card');

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const newSrc = thumb.getAttribute('data-img');
      if (mainImage && newSrc) {
        mainImage.src = newSrc;
      }
    });
  });

  // 2. Countdown Timer (Realistic 2-hour loop)
  let totalSeconds = 2 * 3600 + 14 * 60 + 38;
  const hoursEl = document.getElementById('timer-hours');
  const minsEl = document.getElementById('timer-mins');
  const secsEl = document.getElementById('timer-secs');

  function updateTimer() {
    if (totalSeconds > 0) {
      totalSeconds--;
      const hrs = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      if (hoursEl) hoursEl.textContent = String(hrs).padStart(2, '0');
      if (minsEl) minsEl.textContent = String(m).padStart(2, '0');
      if (secsEl) secsEl.textContent = String(s).padStart(2, '0');
    }
  }
  setInterval(updateTimer, 1000);
  updateTimer();

  // 3. Package Selection and Price Calculations
  const packOptions = document.querySelectorAll('.pack-option');
  const offerCards = document.querySelectorAll('.offer-card');
  const summaryPlanEl = document.getElementById('summary-plan');
  const summaryPriceEl = document.getElementById('summary-price');
  const summaryTotalEl = document.getElementById('summary-total');
  const mobileBarPriceEl = document.getElementById('mobile-bar-price');

  const prices = {
    single: { price: 189, name: '1 فرشاة تدليك السيلوليت (189 درهم)', text: '189 د.م' },
    double: { price: 299, name: '2 فرشاة (العرض الأكثر توفيراً - 299 درهم)', text: '299 د.م' }
  };

  function setPlan(planKey) {
    const data = prices[planKey] || prices.single;

    // Update pack radios
    packOptions.forEach(opt => {
      const radio = opt.querySelector('input[type="radio"]');
      if (opt.getAttribute('data-plan') === planKey) {
        opt.classList.add('selected');
        if (radio) radio.checked = true;
      } else {
        opt.classList.remove('selected');
        if (radio) radio.checked = false;
      }
    });

    // Update offer cards highlight
    offerCards.forEach(card => {
      if (card.getAttribute('data-plan') === planKey) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Update summary and sticky bar
    if (summaryPlanEl) summaryPlanEl.textContent = data.name;
    if (summaryPriceEl) summaryPriceEl.textContent = data.text;
    if (summaryTotalEl) summaryTotalEl.textContent = data.text;
    if (mobileBarPriceEl) mobileBarPriceEl.textContent = data.text;
  }

  packOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      const plan = opt.getAttribute('data-plan');
      setPlan(plan);
    });
  });

  offerCards.forEach(card => {
    card.addEventListener('click', () => {
      const plan = card.getAttribute('data-plan');
      setPlan(plan);
      const orderSec = document.getElementById('order-form-section');
      if (orderSec) {
        orderSec.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // 4. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isOpen) {
        item.classList.add('active');
      }
    });
  });

  // 5. WhatsApp Direct Order Handler
  const whatsappButtons = document.querySelectorAll('.trigger-whatsapp');
  whatsappButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('customer-name');
      const phoneInput = document.getElementById('customer-phone');
      const cityInput = document.getElementById('customer-city');
      const selectedPlanEl = document.querySelector('.pack-option.selected');
      const planKey = selectedPlanEl ? selectedPlanEl.getAttribute('data-plan') : 'double';
      const planData = prices[planKey];

      const name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'غير محدد';
      const phone = phoneInput && phoneInput.value.trim() ? phoneInput.value.trim() : 'غير محدد';
      const city = cityInput && cityInput.value.trim() ? cityInput.value.trim() : 'غير محدد';

      const phoneNumber = '212600000000'; // Replace with store owner's WhatsApp
      const message = `السلام عليكم، أريد طلب فرشاة تدليك السيلوليت:%0A` +
        `📦 العرض: ${planData.name}%0A` +
        `💰 السعر الإجمالي: ${planData.text} (توصيل مجاني والدفع عند الاستلام)%0A` +
        `👤 الاسم: ${name}%0A` +
        `📱 الهاتف: ${phone}%0A` +
        `📍 المدينة: ${city}`;

      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    });
  });

  // 6. Form Submission & Modal
  const orderForm = document.getElementById('checkout-form');
  const modal = document.getElementById('success-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');

  if (orderForm) {
    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('customer-name').value;
      const phone = document.getElementById('customer-phone').value;
      const city = document.getElementById('customer-city').value;
      const address = document.getElementById('customer-address').value;
      const selectedPlanEl = document.querySelector('.pack-option.selected');
      const planKey = selectedPlanEl ? selectedPlanEl.getAttribute('data-plan') : 'double';
      const planData = prices[planKey];

      // Prepare Order Payload
      const orderPayload = {
        name: name,
        phone: phone,
        city: city,
        address: address,
        plan: planKey,
        packageName: planData.name,
        price: planData.price
      };

      // 1. Send to Backend API (/api/orders)
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      }).then(res => res.json()).then(data => {
        console.log('Order saved to server:', data);
      }).catch(err => {
        console.log('Server offline or local file mode, saving to localStorage:', err);
      });

      // 2. Fallback / Sync in LocalStorage for client-side admin view
      try {
        const localOrders = JSON.parse(localStorage.getItem('admin_orders') || '[]');
        const newLocal = {
          id: 'ORD-' + (1000 + localOrders.length + 1),
          createdAt: new Date().toISOString(),
          ...orderPayload,
          status: 'pending'
        };
        localOrders.unshift(newLocal);
        localStorage.setItem('admin_orders', JSON.stringify(localOrders));
      } catch (e) {
        console.error('LocalStorage error:', e);
      }

      // Update modal info
      document.getElementById('modal-customer-name').textContent = name;
      document.getElementById('modal-customer-phone').textContent = phone;
      document.getElementById('modal-customer-city').textContent = city + (address ? ' - ' + address : '');
      document.getElementById('modal-package-name').textContent = planData.name;
      document.getElementById('modal-package-price').textContent = planData.text;

      modal.classList.add('active');
      orderForm.reset();
      setPlan('double'); // reset to recommended
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  // 7. Live Sales Notification Toast (Simulated Social Proof)
  const salesToast = document.getElementById('sales-toast');
  const toastCustomer = document.getElementById('toast-customer');
  const toastCity = document.getElementById('toast-city');
  const toastTime = document.getElementById('toast-time');

  const notifications = [
    { name: 'مريم بناني', city: 'الدار البيضاء', time: 'منذ 3 دقائق' },
    { name: 'فاطمة الزهراء', city: 'مراكش', time: 'منذ 7 دقائق' },
    { name: 'سناء العلمي', city: 'الرباط', time: 'منذ 11 دقيقة' },
    { name: 'إيمان الوردي', city: 'طنجة', time: 'منذ 15 دقيقة' },
    { name: 'خديجة الفاسي', city: 'فاس', time: 'منذ 18 دقيقة' },
    { name: 'حنان التازي', city: 'أكادير', time: 'منذ 24 دقيقة' }
  ];

  let notifIndex = 0;
  function showNextNotification() {
    if (!salesToast) return;
    const item = notifications[notifIndex];
    if (toastCustomer) toastCustomer.textContent = item.name;
    if (toastCity) toastCity.textContent = item.city;
    if (toastTime) toastTime.textContent = item.time;

    salesToast.classList.add('show');

    setTimeout(() => {
      salesToast.classList.remove('show');
    }, 4500);

    notifIndex = (notifIndex + 1) % notifications.length;
  }

  setTimeout(() => {
    showNextNotification();
    setInterval(showNextNotification, 14000);
  }, 4000);

  // 8. Mobile Sticky Bar Observer (Hide when order form is in view)
  const mobileBar = document.getElementById('mobile-sticky-bar');
  const orderSection = document.getElementById('order-form-section');

  if (mobileBar && orderSection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          mobileBar.style.transform = 'translateY(100%)';
          mobileBar.style.transition = 'transform 0.3s ease';
        } else {
          mobileBar.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    observer.observe(orderSection);
  }
});
