document.addEventListener('DOMContentLoaded', () => {
  // Authentication State
  const loginScreen = document.getElementById('login-screen');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const userInput = document.getElementById('username');
  const passInput = document.getElementById('password');
  const btnLogout = document.getElementById('btn-logout');

  // Dashboard elements
  const ordersTbody = document.getElementById('orders-tbody');
  const totalOrdersEl = document.getElementById('stat-total-orders');
  const totalRevenueEl = document.getElementById('stat-total-revenue');
  const pendingOrdersEl = document.getElementById('stat-pending-orders');
  const confirmedOrdersEl = document.getElementById('stat-confirmed-orders');
  const searchInput = document.getElementById('search-orders');
  const statusTabs = document.querySelectorAll('.status-tab');
  const btnRefresh = document.getElementById('btn-refresh');
  const btnExport = document.getElementById('btn-export');
  const adminToast = document.getElementById('admin-toast');
  const toastMessage = document.getElementById('toast-message');

  let orders = [];
  let currentFilter = 'all';
  let lastKnownOrderIds = new Set();
  let isSoundEnabled = true;

  // 1. Audio Chime (Synthesizer via Web Audio API)
  function playNotificationChime() {
    if (!isSoundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880.00, now + 0.12); // A5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);
    } catch (e) {
      console.log('Audio notification error:', e);
    }
  }

  // 2. Authentication Check
  function checkAuth() {
    const isAuth = sessionStorage.getItem('cellu_admin_auth');
    if (isAuth === 'true') {
      if (loginScreen) loginScreen.style.display = 'none';
      loadOrders();
    } else {
      if (loginScreen) loginScreen.style.display = 'flex';
    }
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = userInput.value.trim();
      const p = passInput.value.trim();

      // Verify credentials requested by user: admin / 12345678
      if (u === 'admin' && p === '12345678') {
        sessionStorage.setItem('cellu_admin_auth', 'true');
        loginError.style.display = 'none';
        loginScreen.style.display = 'none';
        showToast('مرحباً بك! تم تسجيل الدخول إلى لوحة التحكم بنجاح');
        loadOrders();
      } else {
        loginError.textContent = '❌ اسم المستخدم أو كلمة المرور غير صحيحة! (admin / 12345678)';
        loginError.style.display = 'block';
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem('cellu_admin_auth');
      loginScreen.style.display = 'flex';
      userInput.value = '';
      passInput.value = '';
    });
  }

  // 3. Load & Fetch Orders
  async function loadOrders(silent = false) {
    try {
      // Try fetching from backend API
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          handleIncomingOrders(data.orders, silent);
          return;
        }
      }
    } catch (err) {
      console.log('Offline/file mode: reading from localStorage backup');
    }

    // Fallback: Read from LocalStorage
    const local = JSON.parse(localStorage.getItem('admin_orders') || '[]');
    if (local.length > 0) {
      handleIncomingOrders(local, silent);
    } else {
      // Default demo initial data
      const defaultData = [
        {
          id: "ORD-1003",
          createdAt: new Date().toISOString(),
          name: "مريم بناني",
          phone: "0661234567",
          city: "الدار البيضاء",
          address: "المعاريف، زنقة 15",
          plan: "double",
          packageName: "2 فرشاة (العرض الأكثر توفيراً - 299 درهم)",
          price: 299,
          status: "pending"
        },
        {
          id: "ORD-1002",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          name: "فاطمة الزهراء العلوي",
          phone: "0662345678",
          city: "الرباط",
          address: "أكدال، شارع الأطلس",
          plan: "single",
          packageName: "1 فرشاة تدليك السيلوليت (189 درهم)",
          price: 189,
          status: "confirmed"
        }
      ];
      handleIncomingOrders(defaultData, silent);
    }
  }

  function handleIncomingOrders(newOrders, silent) {
    // Check if new orders arrived
    if (lastKnownOrderIds.size > 0 && !silent) {
      const brandNew = newOrders.filter(o => !lastKnownOrderIds.has(o.id));
      if (brandNew.length > 0) {
        playNotificationChime();
        const latest = brandNew[0];
        showToast(`🎉 طلب جديد وصل للتو: ${latest.name} من ${latest.city} (${latest.price} د.م)!`);
      }
    }

    orders = newOrders;
    lastKnownOrderIds = new Set(orders.map(o => o.id));

    updateStats();
    renderOrdersTable();
  }

  // 4. Update KPI Statistics
  function updateStats() {
    const total = orders.length;
    const revenue = orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    const pending = orders.filter(o => o.status === 'pending').length;
    const confirmed = orders.filter(o => o.status === 'confirmed' || o.status === 'shipped' || o.status === 'delivered').length;

    if (totalOrdersEl) totalOrdersEl.textContent = total;
    if (totalRevenueEl) totalRevenueEl.textContent = revenue.toLocaleString() + ' د.م';
    if (pendingOrdersEl) pendingOrdersEl.textContent = pending;
    if (confirmedOrdersEl) confirmedOrdersEl.textContent = confirmed;

    // Update tab badge counts
    updateTabBadge('all', total);
    updateTabBadge('pending', pending);
    updateTabBadge('confirmed', orders.filter(o => o.status === 'confirmed').length);
    updateTabBadge('shipped', orders.filter(o => o.status === 'shipped').length);
    updateTabBadge('delivered', orders.filter(o => o.status === 'delivered').length);
    updateTabBadge('cancelled', orders.filter(o => o.status === 'cancelled').length);
  }

  function updateTabBadge(status, count) {
    const badge = document.getElementById(`count-${status}`);
    if (badge) badge.textContent = count;
  }

  // 5. Render Orders Table
  function renderOrdersTable() {
    if (!ordersTbody) return;

    const searchTerm = (searchInput ? searchInput.value.trim().toLowerCase() : '');

    const filtered = orders.filter(o => {
      // Filter by status tab
      if (currentFilter !== 'all' && o.status !== currentFilter) {
        return false;
      }
      // Filter by search query
      if (searchTerm) {
        const matchesName = (o.name || '').toLowerCase().includes(searchTerm);
        const matchesPhone = (o.phone || '').includes(searchTerm);
        const matchesCity = (o.city || '').toLowerCase().includes(searchTerm);
        const matchesId = (o.id || '').toLowerCase().includes(searchTerm);
        return matchesName || matchesPhone || matchesCity || matchesId;
      }
      return true;
    });

    if (filtered.length === 0) {
      ordersTbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <span style="font-size:2.5rem;">📦</span>
              <h3>لا توجد أي طلبات مطابقة حالياً</h3>
              <p>ستظهر الطلبات الجديدة هنا فور تسجيلها من الزبائن في صفحة الهبوط.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    ordersTbody.innerHTML = filtered.map(order => {
      const dateStr = formatDateTime(order.createdAt);
      const cleanPhone = formatMoroccanPhone(order.phone);
      const waLink = buildWhatsAppLink(order);

      return `
        <tr id="row-${order.id}">
          <td>
            <strong style="color:var(--dark); font-family:monospace; font-size:0.95rem;">#${order.id}</strong>
          </td>
          <td style="color:var(--text-muted); font-size:0.85rem;">
            ${dateStr}
          </td>
          <td>
            <span class="customer-name">${escapeHtml(order.name)}</span>
            <span class="customer-loc">📍 ${escapeHtml(order.city)}${order.address ? ' - ' + escapeHtml(order.address) : ''}</span>
          </td>
          <td>
            <div class="contact-group">
              <span class="phone-val">${cleanPhone}</span>
              <a href="tel:${cleanPhone}" class="btn-contact btn-call" title="اتصال مباشر بالزبونة">
                📞 اتصال
              </a>
              <a href="${waLink}" target="_blank" class="btn-contact btn-wa" title="فتح محادثة واتساب جاهزة لتأكيد العنوان">
                💬 واتساب
              </a>
            </div>
          </td>
          <td>
            <span class="order-pack-tag">${escapeHtml(order.packageName || 'فرشاة السيلوليت')}</span>
            <div class="order-price-val">${order.price} د.م</div>
          </td>
          <td>
            <select class="status-select ${order.status}" onchange="changeOrderStatus('${order.id}', this.value, this)">
              <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>🟡 في انتظار التأكيد</option>
              <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>🟢 تم التأكيد</option>
              <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>🚚 قيد الشحن والتوصيل</option>
              <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>✅ تم التسليم والدفع</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>🔴 طلب ملغى</option>
            </select>
          </td>
          <td>
            <button class="btn-delete-order" onclick="deleteOrder('${order.id}')" title="حذف هذا الطلب">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 6. Change Order Status
  window.changeOrderStatus = async function(id, newStatus, selectEl) {
    if (selectEl) {
      selectEl.className = `status-select ${newStatus}`;
    }

    // Update locally
    const target = orders.find(o => o.id === id);
    if (target) {
      target.status = newStatus;
    }

    // Update in backend API
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.log('Server not reachable, saving to localStorage');
    }

    // Sync to localStorage
    localStorage.setItem('admin_orders', JSON.stringify(orders));

    updateStats();
    showToast(`تم تغيير حالة الطلب #${id} بنجاح ✓`);
  };

  // 7. Delete Order
  window.deleteOrder = async function(id) {
    if (!confirm(`هل أنت متأكد من حذف الطلب رقم #${id} نهائياً؟`)) {
      return;
    }

    orders = orders.filter(o => o.id !== id);
    lastKnownOrderIds.delete(id);

    try {
      await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.log('Server not reachable');
    }

    localStorage.setItem('admin_orders', JSON.stringify(orders));
    updateStats();
    renderOrdersTable();
    showToast(`تم حذف الطلب #${id} بنجاح`);
  };

  // 8. Filters & Search events
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderOrdersTable();
    });
  }

  statusTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      statusTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-status');
      renderOrdersTable();
    });
  });

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadOrders();
      showToast('تم تحديث قائمة الطلبات');
    });
  }

  // 9. Export Orders to CSV (Formatted for Moroccan Delivery companies)
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      if (orders.length === 0) {
        alert('لا توجد طلبات لتصديرها!');
        return;
      }

      let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Arabic support
      csvContent += "رقم الطلب,التاريخ,الاسم الكامل,الهاتف,المدينة,العنوان,الباقة,المبلغ بالدرهم,الحالة\n";

      const statusMap = {
        pending: 'في الانتظار',
        confirmed: 'مؤكدة',
        shipped: 'قيد الشحن',
        delivered: 'تم التسليم',
        cancelled: 'ملغاة'
      };

      orders.forEach(o => {
        const row = [
          `"${o.id}"`,
          `"${formatDateTime(o.createdAt)}"`,
          `"${(o.name || '').replace(/"/g, '""')}"`,
          `"${o.phone || ''}"`,
          `"${(o.city || '').replace(/"/g, '""')}"`,
          `"${(o.address || '').replace(/"/g, '""')}"`,
          `"${(o.packageName || '').replace(/"/g, '""')}"`,
          `"${o.price || 0}"`,
          `"${statusMap[o.status] || o.status}"`
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `commandes-cellucare-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('تم تحميل ملف الإكسل (CSV) بنجاح 📥');
    });
  }

  // 10. Helpers
  function formatDateTime(iso) {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month} - ${hours}:${mins}`;
    } catch (e) {
      return iso;
    }
  }

  function formatMoroccanPhone(phone) {
    if (!phone) return '';
    return phone.replace(/\s+/g, '');
  }

  function buildWhatsAppLink(order) {
    let cleanPhone = (order.phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '212' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('212')) {
      cleanPhone = '212' + cleanPhone;
    }

    const message = `السلام عليكم أختي ${order.name || ''}، معاك خدمة العملاء لمتجر CELLU-CARE بخصوص طلبك لفرشاة تدليك السيلوليت (${order.packageName || ''}) بقيمة ${order.price} درهم نحو مدينة ${order.city || ''}.%0A%0Aبغينا نأكدو معاك العنوان والتوصيل باش نرسلو لك الطرد ديالك. شكراً لكِ!`;

    return `https://wa.me/${cleanPhone}?text=${message}`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  function showToast(msg) {
    if (!adminToast || !toastMessage) return;
    toastMessage.textContent = msg;
    adminToast.classList.add('show');
    setTimeout(() => {
      adminToast.classList.remove('show');
    }, 3800);
  }

  // Auto-polling for new incoming orders every 5 seconds
  setInterval(() => {
    const isAuth = sessionStorage.getItem('cellu_admin_auth');
    if (isAuth === 'true') {
      loadOrders(false);
    }
  }, 5000);

  // Initial Run
  checkAuth();
});
