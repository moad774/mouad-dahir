const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_FILE = path.join(ROOT_DIR, 'data', 'orders.json');

// Ensure data folder and file exist
if (!fs.existsSync(path.join(ROOT_DIR, 'data'))) {
  fs.mkdirSync(path.join(ROOT_DIR, 'data'), { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

// MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

// Helper to read orders
function readOrders() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading orders:', err);
    return [];
  }
}

// Helper to save orders
function saveOrders(orders) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving orders:', err);
    return false;
  }
}

// Helper to parse JSON request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // ================= API ROUTES =================

  // 1. Admin Login
  if (pathname === '/api/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const { username, password } = body;

    if (username === 'admin' && password === '12345678') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        token: 'admin-auth-session-token-12345678',
        user: { name: 'المسؤول (Admin)', username: 'admin' }
      }));
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        message: 'اسم المستخدم أو كلمة المرور غير صحيحة!'
      }));
    }
    return;
  }

  // 2. Get All Orders
  if (pathname === '/api/orders' && req.method === 'GET') {
    const orders = readOrders();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, orders }));
    return;
  }

  // 3. Create New Order (From Landing Page)
  if (pathname === '/api/orders' && req.method === 'POST') {
    const body = await parseBody(req);
    const orders = readOrders();

    const orderNumber = 1000 + orders.length + 1;
    const newOrder = {
      id: `ORD-${orderNumber}`,
      createdAt: new Date().toISOString(),
      name: body.name || 'عميلة بدون اسم',
      phone: body.phone || '',
      city: body.city || '',
      address: body.address || '',
      plan: body.plan || 'single',
      packageName: body.packageName || 'فرشاة تدليك السيلوليت',
      price: Number(body.price) || 189,
      status: 'pending',
      notes: body.notes || ''
    };

    orders.unshift(newOrder); // Add to the top of list
    saveOrders(orders);

    console.log(`[طلب جديد] تم استلام طلب جديد: ${newOrder.id} من ${newOrder.name} - ${newOrder.city} (${newOrder.price} DH)`);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, order: newOrder }));
    return;
  }

  // 4. Update Order Status
  if (pathname.startsWith('/api/orders/') && req.method === 'PUT') {
    const orderId = pathname.replace('/api/orders/', '');
    const body = await parseBody(req);
    const orders = readOrders();

    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'الطلب غير موجود' }));
      return;
    }

    if (body.status) orders[orderIndex].status = body.status;
    if (body.notes !== undefined) orders[orderIndex].notes = body.notes;

    saveOrders(orders);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, order: orders[orderIndex] }));
    return;
  }

  // 5. Delete Order
  if (pathname.startsWith('/api/orders/') && req.method === 'DELETE') {
    const orderId = pathname.replace('/api/orders/', '');
    let orders = readOrders();
    const initialCount = orders.length;

    orders = orders.filter(o => o.id !== orderId);

    if (orders.length === initialCount) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'الطلب غير موجود' }));
      return;
    }

    saveOrders(orders);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'تم حذف الطلب بنجاح' }));
    return;
  }

  // ================= STATIC FILE SERVING =================
  let filePath = '';
  if (pathname === '/' || pathname === '/landing') {
    filePath = path.join(ROOT_DIR, 'index.html');
  } else if (pathname === '/admin') {
    filePath = path.join(ROOT_DIR, 'admin.html');
  } else {
    filePath = path.join(ROOT_DIR, decodeURIComponent(pathname));
  }

  // Security check to prevent directory traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Access Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 - الصفحة غير موجودة</h1>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 الخادم شغال بنجاح!`);
  console.log(`🛍️ صفحة الهبوط للزبائن:  http://localhost:${PORT}/`);
  console.log(`🔐 لوحة تحكم الأدمين:   http://localhost:${PORT}/admin`);
  console.log(`🔑 بيانات الدخول: Username: admin | Password: 12345678`);
  console.log(`====================================================`);
});
