# Module 3: Understanding the Proxy

**Time Commitment:** 3-4 hours  
**Prerequisites:** Modules 0-2 completed, DNS records created and working with Gray Cloud  
**What You'll Build:** A deep understanding of Cloudflare's proxy, ability to identify proxied traffic, and see the security benefits firsthand

---

## Layer 1: The Foundation - What Changes When You Flip to Orange

### The Current State

Right now, after completing Module 2, you have:
- A domain name pointing to your AWS server
- DNS records in Cloudflare (Gray Cloud mode)
- The ability to access your site via `http://your-domain.com:3000`

When someone visits your site with Gray Cloud enabled, here's the flow:

```
User's Browser
    â†"
DNS Lookup: "What's the IP for your-domain.com?"
    â†"
Cloudflare DNS responds: "54.123.45.67" (your real AWS IP)
    â†"
Browser connects DIRECTLY to 54.123.45.67:3000
    â†"
Your Node.js server handles the request
    â†"
Response sent back to user
```

**Key point:** Cloudflare only helped with the DNS lookup. After that, Cloudflare stepped aside completely. The user's browser talks directly to your server.

### What the Orange Cloud Actually Does

When you flip a DNS record from Gray Cloud to Orange Cloud (proxied mode), everything changes:

```
User's Browser
    â†"
DNS Lookup: "What's the IP for your-domain.com?"
    â†"
Cloudflare DNS responds: "104.21.X.X" (Cloudflare's edge IP, NOT yours!)
    â†"
Browser connects to Cloudflare's edge server (104.21.X.X)
    â†"
Cloudflare's edge server in [nearest datacenter to user]
    â†"
Cloudflare decides: Cache? Block? Forward to origin?
    â†"
If forwarding: Cloudflare connects to YOUR server (54.123.45.67)
    â†"
Your server responds to Cloudflare
    â†"
Cloudflare forwards response to user (and maybe caches it)
```

**The transformation:** Cloudflare becomes a reverse proxy sitting between your users and your server.

### The Three Major Changes

Let me break down what fundamentally changes when you enable the proxy:

**Change #1: Your IP Gets Hidden**

**Gray Cloud:**
```bash
dig your-domain.com
# Returns: 54.123.45.67 (your actual AWS IP)
```

**Orange Cloud:**
```bash
dig your-domain.com
# Returns: 104.21.48.223 (Cloudflare's IP)
```

Your origin IP becomes invisible to the public. Attackers can't find it through DNS lookups. This is your first layer of DDoS protection.

**Change #2: Port Restrictions**

**Gray Cloud:**
- Users can access ANY port: `:3000`, `:8080`, `:22`, whatever you open
- You control which ports are accessible via firewall

**Orange Cloud:**
- Cloudflare ONLY proxies standard web ports:
  - Port 80 (HTTP)
  - Port 443 (HTTPS)
  - Some other specific ports for web services
- Your `:3000` port? No longer accessible through Cloudflare
- You'll need to run your server on port 80 or 443

**Change #3: New Request Headers**

**Gray Cloud:**
Your server sees standard HTTP headers from the user's browser:
```
Host: your-domain.com
User-Agent: Mozilla/5.0...
Accept: text/html...
X-Forwarded-For: [user's IP]
```

**Orange Cloud:**
Cloudflare adds special headers that provide valuable information:
```
CF-Ray: 8a1b2c3d4e5f6789-SJC
CF-Connecting-IP: 203.0.113.45 (user's real IP)
CF-IPCountry: US
CF-Visitor: {"scheme":"https"}
X-Forwarded-Proto: https
CF-Request-ID: 1234567890abcdef
... and more
```

These headers are gold for developers. They tell you:
- Where the user is located (country)
- Their real IP address
- Whether they used HTTP or HTTPS
- A unique request ID for debugging
- Which Cloudflare datacenter handled the request

---

## Understanding Check #1

Before we flip to Orange Cloud, let's make sure the foundation is solid:

**Question 1:** When using Gray Cloud, if you run `dig your-domain.com`, whose IP address is returned? When you flip to Orange Cloud, whose IP will be returned?

**Question 2:** Your Node.js server is currently running on port 3000. What will happen if you flip to Orange Cloud and try to access `http://your-domain.com:3000`?

**Question 3:** In Gray Cloud mode, does Cloudflare see the actual HTTP requests and responses between users and your server? Why or why not?

<details>
<summary>Click to reveal answers</summary>

**Answer 1:** 
- Gray Cloud: Returns YOUR AWS IP address (e.g., 54.123.45.67)
- Orange Cloud: Returns CLOUDFLARE'S IP address (e.g., 104.21.48.223)
This is the core of the proxy - DNS points to Cloudflare, not to you.

**Answer 2:**
It will fail. Cloudflare's proxy only forwards traffic on standard web ports (80 for HTTP, 443 for HTTPS). Port 3000 is not proxied. You'll need to either:
- Move your server to port 80/443, OR
- Keep it on 3000 and use Cloudflare Tunnel/Argo Tunnel to connect it

**Answer 3:**
No. With Gray Cloud, after the DNS lookup, Cloudflare is completely out of the picture. The browser connects directly to your server. Cloudflare only sees DNS queries, not HTTP traffic.
</details>

---

## Layer 2: Preparing for the Proxy

### Enhancing Your Application to See the Proxy

Before flipping to Orange Cloud, let's update your Node.js application to show us exactly what's happening. This enhanced version will display all the Cloudflare-specific headers.

Update your `app.js`:

```javascript
// app.js - Enhanced for Cloudflare Proxy Testing
const express = require('express');
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Helper function to detect if behind Cloudflare proxy
function isBehindCloudflare(req) {
  return req.get('CF-Ray') !== undefined;
}

// Helper to safely get headers
function getHeader(req, headerName, defaultValue = 'Not present') {
  return req.get(headerName) || defaultValue;
}

// Main route - Enhanced request inspector
app.get('/', (req, res) => {
  const behindCF = isBehindCloudflare(req);
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cloudflare Proxy Inspector</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1000px;
            margin: 30px auto;
            padding: 20px;
            background: #f5f7fa;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
            text-align: center;
          }
          .card {
            background: white;
            padding: 25px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            margin: 10px 0;
          }
          .proxied {
            background: #f97316;
            color: white;
          }
          .direct {
            background: #6b7280;
            color: white;
          }
          .cf-header {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 8px 0;
            border-radius: 4px;
          }
          .normal-header {
            background: #e0e7ff;
            border-left: 4px solid #6366f1;
            padding: 12px;
            margin: 8px 0;
            border-radius: 4px;
          }
          h2 {
            color: #1f2937;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
          }
          pre {
            background: #1f2937;
            color: #10b981;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 13px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin: 15px 0;
          }
          .info-item {
            background: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }
          .info-label {
            font-weight: 600;
            color: #6b7280;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .info-value {
            color: #1f2937;
            font-size: 16px;
            word-break: break-all;
          }
          .warning {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
          }
          .success {
            background: #f0fdf4;
            border-left: 4px solid #22c55e;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔍 Cloudflare Proxy Inspector</h1>
          <p>Real-time request analysis tool</p>
        </div>

        <div class="card">
          <h2>📡 Connection Status</h2>
          <span class="status-badge ${behindCF ? 'proxied' : 'direct'}">
            ${behindCF ? '🟠 PROXIED through Cloudflare' : '⚪ DIRECT connection (Gray Cloud)'}
          </span>
          
          ${behindCF ? `
            <div class="success">
              <strong>✓ Traffic is flowing through Cloudflare's edge network!</strong><br>
              Your origin IP is hidden, and Cloudflare's security features are active.
            </div>
          ` : `
            <div class="warning">
              <strong>⚠ Direct connection detected</strong><br>
              You're accessing the server directly. Cloudflare is only handling DNS (Gray Cloud mode).
              To enable the proxy, flip the DNS record to Orange Cloud in Cloudflare dashboard.
            </div>
          `}
        </div>

        ${behindCF ? `
          <div class="card">
            <h2>☁️ Cloudflare-Specific Headers</h2>
            
            <div class="cf-header">
              <strong>CF-Ray:</strong> ${getHeader(req, 'CF-Ray')}<br>
              <small>Unique request identifier. Use this for debugging with Cloudflare support.</small>
            </div>

            <div class="cf-header">
              <strong>CF-Connecting-IP:</strong> ${getHeader(req, 'CF-Connecting-IP')}<br>
              <small>The visitor's real IP address (before Cloudflare proxy).</small>
            </div>

            <div class="cf-header">
              <strong>CF-IPCountry:</strong> ${getHeader(req, 'CF-IPCountry')}<br>
              <small>Two-letter country code of the visitor.</small>
            </div>

            <div class="cf-header">
              <strong>CF-Visitor:</strong> ${getHeader(req, 'CF-Visitor')}<br>
              <small>Protocol information (http vs https).</small>
            </div>

            <div class="cf-header">
              <strong>CF-Request-ID:</strong> ${getHeader(req, 'CF-Request-ID')}<br>
              <small>Another request identifier for internal tracking.</small>
            </div>

            <div class="cf-header">
              <strong>CF-EW-Via:</strong> ${getHeader(req, 'CF-EW-Via')}<br>
              <small>Edge worker processing information (if using Workers).</small>
            </div>
          </div>
        ` : ''}

        <div class="card">
          <h2>📊 Request Information</h2>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Hostname</div>
              <div class="info-value">${req.hostname}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Protocol</div>
              <div class="info-value">${req.protocol}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Method</div>
              <div class="info-value">${req.method}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Path</div>
              <div class="info-value">${req.path}</div>
            </div>
            <div class="info-item">
              <div class="info-label">IP (as seen by server)</div>
              <div class="info-value">${req.ip}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Real IP (from header)</div>
              <div class="info-value">${getHeader(req, 'CF-Connecting-IP', req.ip)}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h2>🔧 All Request Headers</h2>
          <pre>${JSON.stringify(req.headers, null, 2)}</pre>
        </div>

        <div class="card">
          <h2>⏰ Server Information</h2>
          <p><strong>Current server time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Node.js version:</strong> ${process.version}</p>
          <p><strong>Server uptime:</strong> ${Math.floor(process.uptime())} seconds</p>
        </div>
      </body>
    </html>
  `);
});

// JSON endpoint for programmatic access
app.get('/api/headers', (req, res) => {
  const cloudflareHeaders = {
    'CF-Ray': getHeader(req, 'CF-Ray', null),
    'CF-Connecting-IP': getHeader(req, 'CF-Connecting-IP', null),
    'CF-IPCountry': getHeader(req, 'CF-IPCountry', null),
    'CF-Visitor': getHeader(req, 'CF-Visitor', null),
    'CF-Request-ID': getHeader(req, 'CF-Request-ID', null)
  };

  res.json({
    behindCloudflare: isBehindCloudflare(req),
    cloudflareHeaders: cloudflareHeaders,
    requestInfo: {
      hostname: req.hostname,
      protocol: req.protocol,
      method: req.method,
      path: req.path,
      ip: req.ip,
      realIP: getHeader(req, 'CF-Connecting-IP', req.ip)
    },
    allHeaders: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    behindCloudflare: isBehindCloudflare(req),
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to demonstrate geolocation
app.get('/geo', (req, res) => {
  const country = getHeader(req, 'CF-IPCountry', 'Unknown');
  const city = getHeader(req, 'CF-IPCity', 'Unknown');
  
  res.send(`
    <html>
      <head><title>Geolocation Test</title></head>
      <body style="font-family: Arial; max-width: 600px; margin: 50px auto;">
        <h1>🌍 Geolocation Information</h1>
        ${isBehindCloudflare(req) ? `
          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px;">
            <h2>Your Location</h2>
            <p><strong>Country:</strong> ${country}</p>
            <p><strong>City:</strong> ${city}</p>
            <p><strong>IP:</strong> ${getHeader(req, 'CF-Connecting-IP')}</p>
          </div>
        ` : `
          <div style="background: #ffe7e7; padding: 20px; border-radius: 8px;">
            <p>⚠️ Geolocation only works when proxied through Cloudflare (Orange Cloud)</p>
          </div>
        `}
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('✅ Cloudflare Proxy Inspector Running');
  console.log('='.repeat(50));
  console.log(`📍 Port: ${PORT}`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log('='.repeat(50));
});
```

### Deploying the Enhanced Application

Stop your current server and start this enhanced version:

```bash
# Stop the current server (Ctrl+C if running)

# Start the enhanced version
node app.js
```

### Testing Before Proxy (Gray Cloud)

Visit your site using your domain:
```
http://your-domain.com:3000
```

You should see:
- ⚪ **DIRECT connection** status badge
- A warning that you're in Gray Cloud mode
- No Cloudflare-specific headers
- Standard HTTP headers only

This is your baseline. Take a screenshot or make notes about what you see.

---

## Layer 3: Flipping the Switch - Enabling the Proxy

Now comes the exciting part - enabling Cloudflare's proxy!

### Important: Moving to Standard Ports

Before flipping to Orange Cloud, we need to move your server from port 3000 to port 80 (HTTP). Cloudflare's proxy only forwards standard web ports.

**Update your app.js:**

Change the PORT line to:
```javascript
const PORT = process.env.PORT || 80;
```

**Run on port 80:**
```bash
# Port 80 requires sudo privileges
sudo node app.js
```

**Alternative: Use PM2 for better process management**
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your app with PM2
sudo pm2 start app.js --name cloudflare-inspector

# Make it start on system boot
sudo pm2 startup
sudo pm2 save

# View logs
sudo pm2 logs cloudflare-inspector
```

### Updating AWS Security Group

Make sure port 80 is open in your AWS Security Group:

1. AWS Console → EC2 → Security Groups
2. Find your instance's security group
3. Edit Inbound Rules
4. Add rule:
   - Type: HTTP
   - Port: 80
   - Source: Anywhere (0.0.0.0/0)
5. Save

### Enabling Orange Cloud

Now let's flip the switch!

1. **Go to Cloudflare Dashboard → DNS**

2. **Find your A record for `@` (root domain)**
   - Currently shows Gray Cloud: ⚪

3. **Click the Gray Cloud icon**
   - It turns Orange: 🟠
   - A confirmation appears: "Proxy status changed"

4. **Do the same for `www` and `api` records**
   - Click each Gray Cloud icon
   - Turn them all Orange

5. **Wait 30 seconds** for changes to propagate

### The Moment of Truth - Testing Proxied Traffic

Now visit your site WITHOUT the port number:
```
http://your-domain.com
```

**What you should see:**
- 🟠 **PROXIED through Cloudflare** status badge
- A success message confirming proxy is active
- ALL the Cloudflare headers:
  - `CF-Ray`
  - `CF-Connecting-IP`
  - `CF-IPCountry`
  - `CF-Visitor`
  - And more!

### Understanding What Just Happened

Let's trace what happened with your request:

**Before (Gray Cloud):**
```
Your Browser
  ↓
  DNS: "What's your-domain.com?" → "54.123.45.67"
  ↓
  Connect to 54.123.45.67:3000
  ↓
  Your server responds
```

**After (Orange Cloud):**
```
Your Browser
  ↓
  DNS: "What's your-domain.com?" → "104.21.X.X" (Cloudflare IP!)
  ↓
  Connect to Cloudflare edge server in [your nearest city]
  ↓
  Cloudflare edge server:
    - Checks cache (MISS on first request)
    - Checks security rules
    - Adds CF-* headers
  ↓
  Cloudflare connects to your origin: 54.123.45.67:80
  ↓
  Your server receives request WITH Cloudflare headers
  ↓
  Your server responds to Cloudflare
  ↓
  Cloudflare forwards response to you (and caches it)
```

### Decoding the CF-Ray Header

Look at the `CF-Ray` header in your request. It looks something like:
```
CF-Ray: 8a1b2c3d4e5f6789-SJC
```

This tells you:
- `8a1b2c3d4e5f6789` = Unique request ID
- `SJC` = Airport code of the Cloudflare datacenter that handled your request (San Jose, California in this case)

Other common datacenter codes:
- `ORD` - Chicago
- `LHR` - London
- `SIN` - Singapore
- `BOM` - Mumbai
- `FRA` - Frankfurt

**This is proof your request went through Cloudflare!**

---

## Understanding Check #2

You've now experienced the proxy firsthand. Let's verify your understanding:

**Question 1:** When you flip to Orange Cloud, the DNS returns Cloudflare's IP address instead of yours. But your server is still at your AWS IP. How does Cloudflare know where to forward the request?

**Question 2:** Look at the `CF-Connecting-IP` header. Compare it to what `req.ip` shows in your Node.js app. Why are they different?

**Question 3:** You notice the CF-Ray header shows a datacenter code. If a user from Australia accesses your site, would they get a different datacenter code than you? Why?

<details>
<summary>Click to reveal answers</summary>

**Answer 1:**
Cloudflare knows your origin IP because you told them! When you created the A record, you specified your AWS IP (54.123.45.67). When the record is set to Orange Cloud, Cloudflare stores this as your "origin IP" in their configuration. They show the world their IP (104.21.X.X) but internally route traffic to your real IP.

**Answer 2:**
- `CF-Connecting-IP`: The actual visitor's public IP address (before hitting Cloudflare)
- `req.ip`: The IP address that directly connected to your server, which is now Cloudflare's IP

When proxied, your server sees Cloudflare's IP as the direct connection. But Cloudflare helpfully adds the `CF-Connecting-IP` header so you know the real visitor's IP.

**Answer 3:**
Yes! Cloudflare routes users to their nearest datacenter using anycast routing. A user in Australia would likely hit:
- `SYD` (Sydney)
- `MEL` (Melbourne)
- `AKL` (Auckland)

This is the magic of Cloudflare's global network - every user gets routed to the fastest nearby location.
</details>

---

## Layer 4: Security Testing and Implications

### The Critical Security Test

Now for an important security test. With Orange Cloud enabled, your origin IP should be hidden. Let's verify this.

**Attempt to access your AWS IP directly:**
```
http://54.123.45.67
```
(Replace with your actual AWS IP)

**What you should see:** Your site still loads!

**This is a problem.** Even though your DNS points to Cloudflare, someone who knows your origin IP can bypass Cloudflare entirely by accessing your IP directly.

### Why This Matters

Imagine this scenario:
1. Attacker wants to DDoS your site
2. They find your origin IP (through historical DNS records, email headers, or other means)
3. They attack your IP directly: `54.123.45.67`
4. Your server goes down, even though Cloudflare would have protected you

**The solution:** Firewall rules that only allow Cloudflare's IP ranges to connect to your origin.

### Understanding the Attack Surface

With Orange Cloud but no firewall:
```
User → Cloudflare → Your Server ✓ (Protected path)
Attacker → Your Server directly ✗ (Bypass Cloudflare!)
```

With Orange Cloud AND firewall:
```
User → Cloudflare → Your Server ✓ (Protected path)
Attacker → Your Server directly ✗ (Blocked by firewall!)
```

### The CF-Connecting-IP Header: Your New Truth

When behind Cloudflare's proxy, `req.ip` in your Node.js app will ALWAYS show Cloudflare's IP address, not the visitor's real IP.

**You must use `CF-Connecting-IP` header to get the real visitor IP:**

```javascript
// ✗ Wrong way (behind Cloudflare)
const visitorIP = req.ip; // Returns Cloudflare's IP!

// ✓ Correct way (behind Cloudflare)
const visitorIP = req.get('CF-Connecting-IP') || req.ip;
```

This matters for:
- Rate limiting by IP
- Geolocation features
- Access logs
- Analytics
- Security rules

### Testing Geolocation Features

Visit your geolocation test endpoint:
```
http://your-domain.com/geo
```

If proxied correctly, you should see:
- Your country code
- Your city (if available)
- Your real IP address

This data comes from Cloudflare's analysis of your IP address, made available through headers.

---

## Practical Exercises

### Exercise 1: Understanding Request Flow

Create a new endpoint that logs the full request journey:

```javascript
app.get('/trace', (req, res) => {
  const isCF = isBehindCloudflare(req);
  const steps = [];
  
  if (isCF) {
    steps.push(`1. User's browser at ${getHeader(req, 'CF-Connecting-IP')}`);
    steps.push(`2. Connected to Cloudflare datacenter: ${getHeader(req, 'CF-Ray').split('-')[1]}`);
    steps.push(`3. Cloudflare forwarded to origin server`);
    steps.push(`4. Origin received from IP: ${req.ip} (Cloudflare's IP)`);
    steps.push(`5. Request processed`);
  } else {
    steps.push(`1. User's browser at ${req.ip}`);
    steps.push(`2. Connected directly to origin (no Cloudflare proxy)`);
    steps.push(`3. Request processed`);
  }
  
  res.send(`
    <html>
      <head><title>Request Trace</title></head>
      <body style="font-family: monospace; padding: 40px;">
        <h1>🔍 Request Trace</h1>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
          ${steps.map(step => `<p>${step}</p>`).join('')}
        </div>
      </body>
    </html>
  `);
});
```

Test it and observe the difference between Gray and Orange Cloud modes.

### Exercise 2: Country-Based Response

Create an endpoint that responds differently based on the visitor's country:

```javascript
app.get('/welcome', (req, res) => {
  const country = getHeader(req, 'CF-IPCountry', 'Unknown');
  
  const greetings = {
    'US': 'Hello from the United States! 🇺🇸',
    'GB': 'Hello from the United Kingdom! 🇬🇧',
    'IN': 'Namaste from India! 🇮🇳',
    'DE': 'Guten Tag from Germany! 🇩🇪',
    'FR': 'Bonjour from France! 🇫🇷',
    'JP': 'Konnichiwa from Japan! 🇯🇵',
    'BR': 'Olá from Brazil! 🇧🇷'
  };
  
  const greeting = greetings[country] || `Hello from ${country}! 🌍`;
  
  res.send(`
    <html>
      <head><title>Country-Based Welcome</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>${greeting}</h1>
        <p>Your country code: ${country}</p>
        ${!isBehindCloudflare(req) ? `
          <p style="color: red;">
            ⚠️ This feature only works when proxied through Cloudflare
          </p>
        ` : ''}
      </body>
    </html>
  `);
});
```

Try accessing this from different locations (or use a VPN to test different countries).

### Exercise 3: Request ID Logging

Build a simple logging system using CF-Ray IDs:

```javascript
const requestLog = [];

app.use((req, res, next) => {
  const cfRay = getHeader(req, 'CF-Ray', 'direct-' + Date.now());
  const logEntry = {
    rayId: cfRay,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    country: getHeader(req, 'CF-IPCountry', 'Unknown'),
    ip: getHeader(req, 'CF-Connecting-IP', req.ip)
  };
  
  requestLog.push(logEntry);
  
  // Keep only last 100 requests
  if (requestLog.length > 100) {
    requestLog.shift();
  }
  
  next();
});

app.get('/logs', (req, res) => {
  res.json({
    totalRequests: requestLog.length,
    requests: requestLog
  });
});
```

Visit different pages, then check `/logs` to see all recorded requests with their CF-Ray IDs.

---

## Troubleshooting Guide

### Problem: "Site doesn't load after flipping to Orange Cloud"

**Diagnosis steps:**

1. **Check DNS propagation:**
```bash
dig your-domain.com
# Should return Cloudflare IP (104.21.x.x), not your AWS IP
```

2. **Verify server is running on port 80:**
```bash
sudo netstat -tlnp | grep :80
# Should show node process listening on port 80
```

3. **Check AWS Security Group:**
- HTTP (port 80) should be open to 0.0.0.0/0

4. **Check SSL/TLS settings in Cloudflare:**
- Dashboard → SSL/TLS → Overview
- Should be set to "Flexible" for now (we'll change this in Module 4)

### Problem: "CF-* headers are not showing up"

**This means you're not actually proxied. Check:**

1. DNS record is actually Orange Cloud:
   - Cloudflare Dashboard → DNS
   - Record should have 🟠 icon, not ⚪

2. Wait 2-3 minutes after flipping to Orange:
   - DNS changes take time to propagate
   - Clear your browser cache: Ctrl+Shift+Delete

3. Make sure you're accessing via domain, not IP:
   - ✓ `http://your-domain.com`
   - ✗ `http://54.123.45.67`

### Problem: "Server shows Cloudflare IP for req.ip"

**This is actually correct!** When proxied:
- `req.ip` = Cloudflare's IP (the direct connection to your server)
- `req.get('CF-Connecting-IP')` = Visitor's real IP

Always use `CF-Connecting-IP` header for the true visitor IP.

### Problem: "Can still access site via AWS IP directly"

**This is expected and will be fixed in Module 5.** For now:
- Your origin is accessible both through Cloudflare AND directly
- Module 5 covers origin protection with firewall rules
- This is the #1 security gap to fix after enabling proxy

---

## What You've Accomplished

By completing this module, you now understand:

✅ **What the Orange Cloud does** - transforms Cloudflare from DNS-only to a full reverse proxy  
✅ **How Cloudflare's edge network works** - routing users to the nearest of 200+ datacenters  
✅ **Origin IP hiding** - your AWS IP is no longer in DNS, providing DDoS protection  
✅ **Cloudflare headers** - how to extract visitor country, real IP, and request IDs  
✅ **The CF-Ray ID** - unique request fingerprint for debugging  
✅ **Port restrictions** - why you need to use standard web ports (80/443)  
✅ **Security implications** - understanding that origin is still exposed without firewall rules  

### The Path Forward

In **Module 4: SSL/TLS Basics**, you'll learn:
- How to get HTTPS working (`https://your-domain.com`)
- Cloudflare's SSL modes (Flexible, Full, Full Strict)
- Installing origin certificates
- Automatic HTTPS redirects
- Why SSL matters even for "simple" sites

In **Module 5: Origin Protection**, you'll:
- Lock down your origin server
- Configure firewall rules to only allow Cloudflare IPs
- Test that direct IP access is blocked
- Understand the complete security model

---

## Quick Reference

### Key Concepts

**Gray Cloud (⚪ DNS-only):**
- Cloudflare only does DNS lookups
- Users connect directly to your origin
- Your IP is public
- No caching, no DDoS protection

**Orange Cloud (🟠 Proxied):**
- Cloudflare acts as reverse proxy
- Users connect to Cloudflare edge
- Your IP is hidden in DNS
- Full feature set enabled

### Important Headers When Proxied

```
CF-Ray: Unique request ID + datacenter code
CF-Connecting-IP: Visitor's real IP address
CF-IPCountry: Two-letter country code
CF-Visitor: Protocol info (http/https)
CF-Request-ID: Another identifier for tracking
```

### Getting Real Visitor IP

```javascript
// Always use this pattern when behind Cloudflare
const visitorIP = req.get('CF-Connecting-IP') || req.ip;
```

### DNS Testing Commands

```bash
# Check if using Cloudflare IPs
dig your-domain.com

# Should return 104.21.x.x or similar (Cloudflare)
# NOT your AWS IP (54.x.x.x)
```

---

## Final Understanding Check

Before moving to Module 4, ensure you can confidently answer:

**1. Trace the journey of a request when Orange Cloud is enabled, from browser to server and back.**

**2. Why does `req.ip` show Cloudflare's IP instead of the visitor's IP? How do you get the real visitor IP?**

**3. What security risk remains even with Orange Cloud enabled, and how will we fix it in Module 5?**

**4. What's the purpose of the CF-Ray header, and when would you use it?**

**5. If you wanted to block visitors from a specific country, which Cloudflare header would you check?**

---

Ready to add HTTPS encryption to your setup? Module 4 awaits!

**Next:** Module 4 - SSL/TLS Basics (4-5 hours)

*Created using the Deep Learning Framework methodology - Building understanding layer by layer* 🎯