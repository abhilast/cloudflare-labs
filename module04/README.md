# Module 4: SSL/TLS Basics

**Time Commitment:** 4-5 hours  
**Prerequisites:** Modules 0-3 completed, app running on port 80 with Orange Cloud enabled  
**What You'll Build:** A fully encrypted HTTPS site with proper SSL/TLS configuration and automatic redirects

---

## Layer 1: The Foundation - Why HTTPS Matters

### The Current State

After completing Module 3, you have:
- A domain proxied through Cloudflare (Orange Cloud)
- Traffic flowing through Cloudflare's edge network
- Your app running on port 80 (HTTP)
- Access via `http://your-domain.com`

But there's a critical problem: **your site is not encrypted**.

### What Happens Over HTTP (Current Setup)

When someone visits `http://your-domain.com`, here's what happens to their data:

```
User's Browser
    ↓
    "GET / HTTP/1.1
     Host: your-domain.com
     Cookie: session=abc123
     Username: john@example.com" ← ALL VISIBLE IN PLAIN TEXT
    ↓
Transmitted over the internet (unencrypted)
    ↓
Anyone on the network path can read:
    - URLs you visit
    - Form data you submit
    - Cookies and session tokens
    - Passwords (if sent)
    - Everything else
    ↓
Cloudflare Edge Server
    ↓
Your Origin Server
```

**This is dangerous.** Anyone between the user and the server can:
- **Read sensitive data** - passwords, credit cards, personal information
- **Steal session cookies** - hijack user accounts
- **Modify content** - inject malicious scripts
- **Track behavior** - see every page visited, every form submitted

### What HTTPS Does

HTTPS (HTTP Secure) wraps your HTTP traffic in TLS (Transport Layer Security) encryption. Think of it like sending a postcard vs. sending a sealed letter:

**HTTP = Postcard:**
- Anyone who handles it can read it
- Mail carrier can read it
- Anyone at sorting facilities can read it
- Recipient gets it (if nobody modifies or steals it)

**HTTPS = Sealed Envelope:**
- Only sender and recipient can read contents
- Carriers see the destination but not the content
- If anyone opens it, you know it was tampered with
- Guarantees it came from the real sender

### The Three Parties in Your SSL Journey

Understanding SSL requires knowing who's involved:

```
User's Browser ←→ Cloudflare Edge ←→ Your Origin Server
     ┃                   ┃                    ┃
   Visitor          The Proxy           Your AWS Server
```

With HTTPS, you need to encrypt **two** connections:
1. **Browser ↔ Cloudflare** (Visitor to Edge)
2. **Cloudflare ↔ Origin** (Edge to Your Server)

This is where SSL modes come in.

### Understanding SSL Certificates

An SSL certificate is like a passport for your website. It proves:
1. **Identity:** "I really am your-domain.com"
2. **Authenticity:** "I'm certified by a trusted authority"
3. **Encryption keys:** "Here's my public key for secure communication"

**Certificate Authority (CA):** A trusted organization that issues certificates. Like a government issuing passports.

**Examples of CAs:**
- Let's Encrypt (free, automated)
- DigiCert (commercial)
- Cloudflare (for origin certificates)

### The Lock Icon in Your Browser

You know that padlock icon in your browser's address bar? Here's what it actually means:

**🔒 Green Lock:**
- Connection is encrypted
- Certificate is valid
- Issued by trusted CA
- Domain matches certificate
- Certificate hasn't expired

**⚠️ Warning:**
- Certificate expired
- Domain mismatch
- Self-signed certificate
- Mixed content (HTTPS page loading HTTP resources)

**🚫 Not Secure:**
- No HTTPS
- Plain HTTP connection
- Everything is visible

---

## Understanding Check #1

Before we dive into SSL modes, let's verify the foundation:

**Question 1:** You have a login form on your site. With HTTP (current setup), who can see the username and password when a user submits the form?

**Question 2:** Why do we need to encrypt TWO connections (Browser→Cloudflare AND Cloudflare→Origin) instead of just one?

**Question 3:** Your site currently shows "Not Secure" in the browser. Even though Cloudflare is protecting you from DDoS attacks, why should you still care about getting HTTPS?

<details>
<summary>Click to reveal answers</summary>

**Answer 1:** 
With HTTP, anyone on the network path can see the credentials:
- The user's ISP
- Anyone on the same WiFi network
- Any intermediate routers
- Your cloud provider
- Hackers intercepting traffic

The credentials travel in plain text across the internet. It's like shouting your password across a crowded room.

**Answer 2:**
Because there are two separate connections:
- Browser → Cloudflare: If unencrypted, ISPs and WiFi snoopers can see user data
- Cloudflare → Origin: If unencrypted, anyone between Cloudflare and your server can see the data

Both connections need encryption for true end-to-end security.

**Answer 3:**
Several critical reasons:
- Browsers warn users about non-HTTPS sites, scaring away visitors
- Google penalizes HTTP sites in search rankings
- Modern browser features (geolocation, camera, notifications) require HTTPS
- Users won't trust entering payment or personal info on HTTP sites
- Even if you don't handle sensitive data now, you might in the future
- It's basically free with Cloudflare, so there's no reason not to
</details>

---

## Layer 2: Understanding Cloudflare's SSL Modes

Cloudflare offers different SSL modes that control how these two connections are encrypted. This is one of the most important configuration decisions you'll make.

### The Four SSL Modes

Let me explain each mode with clarity:

#### **Mode 1: Off (Never Use This)**

```
Browser ←[HTTP]→ Cloudflare ←[HTTP]→ Origin
   ❌               ❌               ❌
Neither connection encrypted
```

**What it means:**
- No encryption anywhere
- Everything in plain text
- Modern browsers will show big red warnings

**When to use:** Never. This is legacy/disabled mode.

---

#### **Mode 2: Flexible (Convenient but Not Secure)**

```
Browser ←[HTTPS]→ Cloudflare ←[HTTP]→ Origin
   ✅                ⚠️               ❌
```

**What it means:**
- Browser → Cloudflare: **Encrypted** (HTTPS)
- Cloudflare → Origin: **Not encrypted** (HTTP)
- Your origin server doesn't need an SSL certificate
- Browser shows the lock icon (but the full path isn't secure)

**The problem:**
Data is encrypted from user to Cloudflare, but travels **in plain text** from Cloudflare to your server. Anyone with access to:
- Your cloud provider's network
- Traffic between data centers
- Your AWS virtual private cloud

...can read everything.

**When to use:** 
- Quick testing only
- When you absolutely cannot install a certificate on origin
- Legacy systems where SSL is impossible

**Why it's problematic:**
Cloudflare can see your traffic (they're a trusted party), but so can anyone between Cloudflare and your server. For many compliance standards (PCI DSS, HIPAA), this is unacceptable.

---

#### **Mode 3: Full (Better, but Still Vulnerable)**

```
Browser ←[HTTPS]→ Cloudflare ←[HTTPS]→ Origin
   ✅                ✅               ⚠️
```

**What it means:**
- Browser → Cloudflare: **Encrypted** (HTTPS)
- Cloudflare → Origin: **Encrypted** (HTTPS)
- Your origin needs an SSL certificate
- But Cloudflare **doesn't verify** your certificate's authenticity

**The problem:**
Your origin has a certificate, but it could be:
- Self-signed (anyone can create these)
- Expired
- For the wrong domain
- Issued by an untrusted authority

This protects against **passive eavesdropping** but not against **active attacks**. An attacker could potentially intercept the connection with their own certificate.

**When to use:**
- Development environments
- Internal applications
- When you have a self-signed certificate

---

#### **Mode 4: Full (Strict) - The Recommended Mode ✅**

```
Browser ←[HTTPS]→ Cloudflare ←[HTTPS]→ Origin
   ✅                ✅               ✅
```

**What it means:**
- Browser → Cloudflare: **Encrypted and verified**
- Cloudflare → Origin: **Encrypted and verified**
- Your origin needs a **valid** SSL certificate
- Cloudflare verifies:
  - Certificate is for your domain
  - Issued by a trusted CA
  - Not expired
  - Not revoked

**This is true end-to-end encryption.**

**When to use:**
- Production websites (always!)
- Any site handling user data
- E-commerce, banking, healthcare
- **Any site you care about**

**How to get a valid certificate:**
1. **Let's Encrypt** (free, auto-renewing, publicly trusted)
2. **Cloudflare Origin Certificate** (free, but only trusted by Cloudflare)
3. **Commercial CA** (DigiCert, GlobalSign, etc.)

For this module, we'll use **Cloudflare Origin Certificates** because:
- Free forever
- Easy to install
- No renewal hassle (valid for 15 years)
- Perfect for origin servers behind Cloudflare

---

### Visual Comparison: What Each Mode Protects Against

| Threat | Off | Flexible | Full | Full (Strict) |
|--------|-----|----------|------|---------------|
| ISP snooping on user | ❌ | ✅ | ✅ | ✅ |
| WiFi eavesdropping | ❌ | ✅ | ✅ | ✅ |
| Browser warnings | ❌ | ✅ | ✅ | ✅ |
| Snooping between CF and origin | ❌ | ❌ | ✅ | ✅ |
| Man-in-the-middle on origin connection | ❌ | ❌ | ❌ | ✅ |
| Compliance requirements (PCI, HIPAA) | ❌ | ❌ | ⚠️ | ✅ |

---

## Understanding Check #2

Let's make sure the SSL modes are clear:

**Question 1:** A company uses "Flexible" mode because they don't want to configure SSL on their origin server. Their app handles credit card payments. What's the security risk?

**Question 2:** What's the difference between "Full" and "Full (Strict)" modes? Why does "Full" still have a security vulnerability?

**Question 3:** You install a self-signed certificate on your origin server. Which SSL modes will work, and which will fail?

<details>
<summary>Click to reveal answers</summary>

**Answer 1:**
HUGE RISK. Credit card data is encrypted from user to Cloudflare (good), but travels in **plain text** from Cloudflare to the origin server (bad). Anyone with network access between Cloudflare and the origin can:
- Steal credit card numbers
- View customer personal information
- Violate PCI DSS compliance (required for handling card payments)
This could result in massive fines, lawsuits, and loss of merchant account.

**Answer 2:**
- **Full:** Cloudflare accepts ANY certificate from origin (self-signed, expired, wrong domain, etc.). It encrypts the connection but doesn't verify authenticity. An attacker could intercept with their own certificate.
- **Full (Strict):** Cloudflare verifies the certificate is valid, not expired, for the correct domain, and issued by a trusted CA. This prevents man-in-the-middle attacks.

The difference is authentication vs. just encryption.

**Answer 3:**
- **Off:** Works (but insecure)
- **Flexible:** Works (doesn't check origin certificate)
- **Full:** Works (accepts self-signed certificates)
- **Full (Strict):** **FAILS** (requires certificate from trusted CA)

Self-signed certificates work for "Full" but not "Full (Strict)". For production, use Cloudflare Origin Certificate or Let's Encrypt.
</details>

---

## Layer 3: Setting Up SSL/TLS - Hands-On

Now let's actually implement HTTPS on your site. We'll go from HTTP to full HTTPS with certificate verification.

### Step 1: Check Current SSL Mode

Before making changes, let's see your current configuration:

1. **Cloudflare Dashboard → SSL/TLS → Overview**
2. Look at the current mode (probably "Flexible" by default)

You should see something like:
```
Your SSL/TLS encryption mode is Flexible
```

### Step 2: Generate Cloudflare Origin Certificate

This is easier than you might think. Cloudflare generates a certificate specifically for the connection between Cloudflare and your origin.

**In Cloudflare Dashboard:**

1. **Go to SSL/TLS → Origin Server**
2. **Click "Create Certificate"**

3. **Configuration options:**
   - **Private key type:** RSA (recommended, widely compatible)
   - **Certificate validity:** 15 years (maximum, why not?)
   - **Hostnames:** 
     - `your-domain.com`
     - `*.your-domain.com` (wildcard for all subdomains)
   - These should be pre-filled correctly

4. **Click "Create"**

5. **You'll see two text boxes:**
   - **Origin Certificate** (PEM format)
   - **Private Key** (PEM format)

**IMPORTANT:** This is your only chance to copy the private key! Cloudflare doesn't store it.

6. **Copy both to safe files on your local machine:**
   - Save origin certificate as `cloudflare-cert.pem`
   - Save private key as `cloudflare-key.pem`

### Step 3: Install Certificate on Your Ubuntu Server

Now we'll put these certificates on your AWS instance.

**SSH into your Ubuntu server:**

```bash
# Create directory for SSL certificates
sudo mkdir -p /etc/ssl/cloudflare

# Create the certificate file
sudo nano /etc/ssl/cloudflare/cert.pem
```

**Paste the entire Origin Certificate**, including the lines:
```
-----BEGIN CERTIFICATE-----
[all the certificate content]
-----END CERTIFICATE-----
```

Save and exit (Ctrl+X, Y, Enter)

**Create the private key file:**

```bash
sudo nano /etc/ssl/cloudflare/key.pem
```

**Paste the entire Private Key**, including:
```
-----BEGIN PRIVATE KEY-----
[all the key content]
-----END PRIVATE KEY-----
```

Save and exit (Ctrl+X, Y, Enter)

**Secure the files (CRITICAL):**

```bash
# Make key readable only by root
sudo chmod 600 /etc/ssl/cloudflare/key.pem

# Make certificate readable by all (public info)
sudo chmod 644 /etc/ssl/cloudflare/cert.pem

# Verify permissions
ls -la /etc/ssl/cloudflare/
```

You should see:
```
-rw-r--r-- 1 root root [size] [date] cert.pem
-rw------- 1 root root [size] [date] key.pem
```

The `600` permission on the private key is essential - only root should read it.

### Step 4: Update Node.js App for HTTPS

Now we'll modify your app to run HTTPS instead of HTTP. We're building on the app from Module 3.

**Stop your current app:**

```bash
# If using PM2
sudo pm2 stop cloudflare-inspector

# Or if running directly, press Ctrl+C
```

**Update app.js to support both HTTP and HTTPS:**

```javascript
// app.js - Enhanced for HTTPS support
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Helper functions
function isBehindCloudflare(req) {
  return req.get('CF-Ray') !== undefined;
}

function getHeader(req, headerName, defaultValue = 'Not present') {
  return req.get(headerName) || defaultValue;
}

// HTTPS detection helper
function isHTTPS(req) {
  // Check various headers that indicate HTTPS
  return req.secure || 
         req.get('X-Forwarded-Proto') === 'https' ||
         req.get('CF-Visitor') === '{"scheme":"https"}';
}

// Main route - Enhanced with HTTPS detection
app.get('/', (req, res) => {
  const behindCF = isBehindCloudflare(req);
  const usingHTTPS = isHTTPS(req);
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>SSL/TLS Inspector</title>
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
            margin: 10px 5px;
          }
          .https-yes {
            background: #10b981;
            color: white;
          }
          .https-no {
            background: #ef4444;
            color: white;
          }
          .proxied {
            background: #f97316;
            color: white;
          }
          .direct {
            background: #6b7280;
            color: white;
          }
          .info {
            background: #e0e7ff;
            border-left: 4px solid #6366f1;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
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
          .security-check {
            display: flex;
            align-items: center;
            margin: 10px 0;
            padding: 10px;
            background: #f9fafb;
            border-radius: 4px;
          }
          .check-icon {
            font-size: 24px;
            margin-right: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 SSL/TLS Inspector</h1>
          <p>Comprehensive HTTPS Configuration Checker</p>
        </div>

        <div class="card">
          <h2>🔒 Encryption Status</h2>
          <span class="status-badge ${usingHTTPS ? 'https-yes' : 'https-no'}">
            ${usingHTTPS ? '✅ HTTPS Enabled' : '❌ HTTP Only'}
          </span>
          <span class="status-badge ${behindCF ? 'proxied' : 'direct'}">
            ${behindCF ? '🟠 Proxied through Cloudflare' : '⚪ Direct connection'}
          </span>

          <div class="security-check">
            <span class="check-icon">${usingHTTPS ? '✅' : '❌'}</span>
            <div>
              <strong>Browser → Cloudflare encryption:</strong>
              ${usingHTTPS ? 'Encrypted (HTTPS)' : 'Not encrypted (HTTP)'}
            </div>
          </div>

          <div class="security-check">
            <span class="check-icon">${behindCF && req.socket.encrypted ? '✅' : '❌'}</span>
            <div>
              <strong>Cloudflare → Origin encryption:</strong>
              ${req.socket.encrypted ? 'Encrypted (Origin has SSL)' : 'Not encrypted (Origin on HTTP)'}
            </div>
          </div>

          ${usingHTTPS && req.socket.encrypted ? `
            <div class="success">
              <strong>🎉 Perfect! Full end-to-end encryption is active.</strong><br>
              Both connections (Browser→CF and CF→Origin) are encrypted.
            </div>
          ` : !usingHTTPS ? `
            <div class="warning">
              <strong>⚠️ Warning: No HTTPS detected</strong><br>
              You're accessing this page over HTTP. Data is not encrypted.
              Try accessing via <a href="https://${req.hostname}">https://${req.hostname}</a>
            </div>
          ` : `
            <div class="warning">
              <strong>⚠️ Partial encryption</strong><br>
              Browser to Cloudflare is encrypted, but Cloudflare to origin might not be.
            </div>
          `}
        </div>

        <div class="card">
          <h2>🔍 SSL/TLS Details</h2>
          <pre>${JSON.stringify({
            protocol: req.protocol,
            secure: req.secure,
            'X-Forwarded-Proto': getHeader(req, 'X-Forwarded-Proto', null),
            'CF-Visitor': getHeader(req, 'CF-Visitor', null),
            socketEncrypted: req.socket.encrypted || false,
            tlsVersion: req.socket.encrypted ? req.socket.getProtocol() : 'N/A'
          }, null, 2)}</pre>
        </div>

        ${behindCF ? `
          <div class="card">
            <h2>☁️ Cloudflare Information</h2>
            <div class="info">
              <strong>CF-Ray:</strong> ${getHeader(req, 'CF-Ray')}<br>
              <strong>Country:</strong> ${getHeader(req, 'CF-IPCountry')}<br>
              <strong>Connecting IP:</strong> ${getHeader(req, 'CF-Connecting-IP')}<br>
              <strong>Visitor Protocol:</strong> ${getHeader(req, 'CF-Visitor')}
            </div>
          </div>
        ` : ''}

        <div class="card">
          <h2>📊 Request Headers</h2>
          <pre>${JSON.stringify(req.headers, null, 2)}</pre>
        </div>

        <div class="card">
          <h2>ℹ️ What This Means</h2>
          <div class="info">
            <p><strong>Current URL:</strong> ${req.protocol}://${req.hostname}${req.path}</p>
            <p><strong>Encryption status:</strong></p>
            <ul>
              <li>Browser sees: ${usingHTTPS ? '🔒 Secure (HTTPS)' : '⚠️ Not Secure (HTTP)'}</li>
              <li>Origin connection: ${req.socket.encrypted ? '🔒 Encrypted' : '❌ Unencrypted'}</li>
            </ul>
          </div>
        </div>

        <div class="card">
          <h2>🎯 Next Steps</h2>
          ${!usingHTTPS ? `
            <div class="warning">
              <p><strong>You should be using HTTPS!</strong></p>
              <ol>
                <li>Visit <a href="https://${req.hostname}">https://${req.hostname}</a> instead</li>
                <li>Enable "Always Use HTTPS" in Cloudflare SSL/TLS settings</li>
              </ol>
            </div>
          ` : !req.socket.encrypted ? `
            <div class="warning">
              <p><strong>Origin server should use HTTPS!</strong></p>
              <ol>
                <li>Install SSL certificate on origin</li>
                <li>Configure Node.js to use HTTPS</li>
                <li>Set Cloudflare to "Full (Strict)" mode</li>
              </ol>
            </div>
          ` : `
            <div class="success">
              <p><strong>✅ Your setup is secure!</strong></p>
              <p>Both connections are encrypted. Great job!</p>
            </div>
          `}
        </div>
      </body>
    </html>
  `);
});

// JSON endpoint for programmatic checking
app.get('/api/ssl-status', (req, res) => {
  res.json({
    https: isHTTPS(req),
    behindCloudflare: isBehindCloudflare(req),
    originEncrypted: req.socket.encrypted || false,
    protocol: req.protocol,
    headers: {
      'X-Forwarded-Proto': getHeader(req, 'X-Forwarded-Proto', null),
      'CF-Visitor': getHeader(req, 'CF-Visitor', null),
      'CF-Ray': getHeader(req, 'CF-Ray', null)
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    https: isHTTPS(req),
    timestamp: new Date().toISOString()
  });
});

// Create both HTTP and HTTPS servers
const HTTP_PORT = 80;
const HTTPS_PORT = 443;

// Load SSL certificates
let sslOptions;
try {
  sslOptions = {
    key: fs.readFileSync('/etc/ssl/cloudflare/key.pem'),
    cert: fs.readFileSync('/etc/ssl/cloudflare/cert.pem')
  };
  console.log('✅ SSL certificates loaded successfully');
} catch (error) {
  console.log('⚠️  SSL certificates not found, running HTTP only');
  console.log('   Place certificates at:');
  console.log('   - /etc/ssl/cloudflare/cert.pem');
  console.log('   - /etc/ssl/cloudflare/key.pem');
}

// Start HTTP server
http.createServer(app).listen(HTTP_PORT, () => {
  console.log('='.repeat(60));
  console.log('✅ HTTP Server running');
  console.log('='.repeat(60));
  console.log(`📡 Port: ${HTTP_PORT}`);
  console.log(`🔗 URL: http://localhost:${HTTP_PORT}`);
  console.log('⚠️  Warning: HTTP is not encrypted!');
  console.log('='.repeat(60));
});

// Start HTTPS server if certificates are available
if (sslOptions) {
  https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
    console.log('='.repeat(60));
    console.log('✅ HTTPS Server running');
    console.log('='.repeat(60));
    console.log(`📡 Port: ${HTTPS_PORT}`);
    console.log(`🔗 URL: https://localhost:${HTTPS_PORT}`);
    console.log('🔒 SSL/TLS encryption active');
    console.log('='.repeat(60));
  });
}

console.log(`⏰ Started: ${new Date().toISOString()}`);
```

**Save the file.**

### Step 5: Configure AWS Security Group for HTTPS

Open port 443 (HTTPS) in your AWS Security Group:

1. **AWS Console → EC2 → Security Groups**
2. **Select your instance's security group**
3. **Edit Inbound Rules**
4. **Add rule:**
   - Type: HTTPS
   - Port: 443
   - Source: 0.0.0.0/0 (anywhere)
5. **Save**

You should now have both port 80 (HTTP) and 443 (HTTPS) open.

### Step 6: Start Your HTTPS-Enabled Server

```bash
# Start with PM2 (recommended)
sudo pm2 restart cloudflare-inspector

# Or start directly
sudo node app.js
```

You should see:
```
✅ SSL certificates loaded successfully
====================================
✅ HTTP Server running
====================================
📡 Port: 80
🔗 URL: http://localhost:80
⚠️  Warning: HTTP is not encrypted!
====================================
====================================
✅ HTTPS Server running
====================================
📡 Port: 443
🔗 URL: https://localhost:443
🔒 SSL/TLS encryption active
====================================
```

**Your server is now running on both HTTP (port 80) and HTTPS (port 443)!**

### Step 7: Change Cloudflare SSL Mode to Full (Strict)

Now that your origin has a valid certificate, we can enable the most secure mode:

1. **Cloudflare Dashboard → SSL/TLS → Overview**
2. **Change encryption mode to: Full (strict)**
3. **Save**

The change takes effect immediately.

### Step 8: Test Your HTTPS Setup

**Visit your site with HTTPS:**
```
https://your-domain.com
```

**What you should see:**
- ✅ HTTPS Enabled badge (green)
- 🟠 Proxied through Cloudflare badge
- Both encryption checks showing ✅
- "Perfect! Full end-to-end encryption is active" message
- Your browser's address bar shows 🔒

**Click the lock icon in your browser** and select "Certificate" or "Connection is secure":
- You'll see a certificate issued by Cloudflare (not your origin certificate)
- This is expected! Cloudflare presents their certificate to visitors
- Your origin certificate is used for the Cloudflare→Origin connection

**Test the HTTP version:**
```
http://your-domain.com
```

Currently, this still works (HTTP). In the next step, we'll force all traffic to HTTPS.

---

## Understanding Check #3

You now have HTTPS working! Let's verify understanding:

**Question 1:** When you visit `https://your-domain.com` and check the certificate, you see it's issued by Cloudflare, not by your origin certificate. Why is this? Is your origin certificate being used at all?

**Question 2:** What would happen if you set Cloudflare to "Full (Strict)" mode but didn't install a certificate on your origin server?

**Question 3:** Your app is now running on both port 80 (HTTP) and port 443 (HTTPS). Why do we need to run both instead of just HTTPS?

<details>
<summary>Click to reveal answers</summary>

**Answer 1:**
The certificate chain works like this:
- **Browser ↔ Cloudflare:** Cloudflare presents their certificate to visitors (the one you see)
- **Cloudflare ↔ Origin:** Cloudflare uses your origin certificate to verify your server

Visitors never see your origin certificate - they only see Cloudflare's. Your origin certificate is used internally by Cloudflare to verify they're connecting to the real origin server, not an attacker's server.

This is actually a benefit: Cloudflare's certificates are automatically managed and renewed. You don't have to worry about your public-facing certificate expiring.

**Answer 2:**
Your site would break! Cloudflare would try to make an HTTPS connection to your origin and verify the certificate. Without a valid certificate on the origin:
- Cloudflare can't verify the connection
- Returns a 526 error ("Invalid SSL certificate")
- Visitors see an error page
- Your site is down

"Full (Strict)" requires a valid certificate on origin. Always test with "Full" mode first before switching to "Full (Strict)".

**Answer 3:**
We run both because:
1. **Legacy support:** Some old clients might try HTTP first
2. **Direct IP access:** If someone accesses your origin IP directly, HTTP still works (though we'll block this in Module 5)
3. **Redirects:** HTTP server can redirect to HTTPS (which we'll set up next)
4. **Graceful handling:** Better to accept HTTP and redirect than to refuse connection

In the next section, we'll make the HTTP server automatically redirect to HTTPS.
</details>

---

## Layer 4: Automatic HTTPS Redirects and Optimization

### Enabling Always Use HTTPS in Cloudflare

The easiest way to force HTTPS is at the Cloudflare level:

1. **Cloudflare Dashboard → SSL/TLS → Edge Certificates**
2. **Find "Always Use HTTPS"**
3. **Toggle it ON** 🟢

**What this does:**
- Any HTTP request to your site (http://your-domain.com)
- Automatically redirected to HTTPS (https://your-domain.com)
- Happens at Cloudflare's edge before reaching your origin
- 301 permanent redirect (tells search engines this is permanent)

**Test it:**
```bash
# Check the redirect
curl -I http://your-domain.com
```

You should see:
```
HTTP/1.1 301 Moved Permanently
Location: https://your-domain.com/
```

**In browser:**
Type `http://your-domain.com` and watch it automatically change to `https://`

### Understanding Other SSL/TLS Settings

While you're in the SSL/TLS section, let's understand other important settings:

#### **Edge Certificates Tab:**

**1. Always Use HTTPS:** ✅ Enabled (we just did this)

**2. HTTP Strict Transport Security (HSTS):**
- Tells browsers: "Only connect via HTTPS, never HTTP"
- After first HTTPS visit, browser refuses HTTP connections
- More secure, but be cautious:
  - Can lock you out if HTTPS breaks
  - Hard to reverse (browsers cache for months)
  
**For now, leave HSTS OFF** until you're confident your HTTPS setup is stable.

**3. Minimum TLS Version:**
- Recommended: TLS 1.2
- Most modern (secure but may break old browsers): TLS 1.3
- **Set to: TLS 1.2** (good security + compatibility)

**4. Opportunistic Encryption:**
- Leave ON
- Allows HTTP/2 and faster protocols

**5. TLS 1.3:**
- Leave ON
- Latest, fastest, most secure
- Browsers will use it when supported

**6. Automatic HTTPS Rewrites:**
- Leave ON
- Fixes mixed content issues (HTTPS pages loading HTTP resources)

### Advanced: HSTS (When You're Ready)

Once your HTTPS setup is rock solid and you've tested for a week, you can enable HSTS:

**What HSTS does:**
```
Server sends header: Strict-Transport-Security: max-age=31536000
Browser stores: "Only use HTTPS for this domain for 1 year"
Next visit: Browser refuses HTTP, forces HTTPS before even making request
```

**Benefits:**
- Prevents SSL stripping attacks
- Faster (no redirect needed)
- Shows "Not Secure" warning if HTTPS breaks

**Risks:**
- If HTTPS breaks, site is completely inaccessible
- Can't easily test HTTP
- Long cache time (users can't downgrade to HTTP)

**How to enable (when ready):**
1. Cloudflare Dashboard → SSL/TLS → Edge Certificates
2. Enable HSTS
3. Start with short max-age (1 month)
4. Gradually increase to 1-2 years

**For this module: Don't enable HSTS yet.** Get comfortable with HTTPS first.

### Testing Your Complete SSL Setup

Let's run comprehensive tests:

**Test 1: HTTP to HTTPS redirect**
```bash
curl -I http://your-domain.com
# Should show: 301 Moved Permanently → https://
```

**Test 2: HTTPS works**
```bash
curl -I https://your-domain.com
# Should show: 200 OK
```

**Test 3: Certificate validation**
```bash
# This tests the Cloudflare → Origin connection
openssl s_client -connect your-domain.com:443 -servername your-domain.com
# Look for: "Verify return code: 0 (ok)"
```

**Test 4: SSL Labs test (comprehensive external test)**
Visit: https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

This will test:
- Certificate validity
- Protocol support
- Cipher strength
- Vulnerabilities
- Configuration issues

You should get an **A or A+** rating!

**Test 5: Visual inspection**

Visit `https://your-domain.com` and check:
- 🔒 Lock icon in address bar
- No "Mixed content" warnings
- Certificate valid (click lock → certificate)
- All green checkmarks on your inspector page

---

## Practical Exercises

### Exercise 1: Mixed Content Detector

Create an endpoint that tests for mixed content issues:

```javascript
app.get('/mixed-content-test', (req, res) => {
  const isSecure = isHTTPS(req);
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Mixed Content Test</title>
        <style>
          body {
            font-family: Arial;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
          }
          .test-item {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          .pass { background: #d4edda; border-color: #c3e6cb; }
          .fail { background: #f8d7da; border-color: #f5c6cb; }
        </style>
      </head>
      <body>
        <h1>🔍 Mixed Content Test</h1>
        <p>Page loaded via: <strong>${req.protocol.toUpperCase()}</strong></p>
        
        ${isSecure ? `
          <div class="test-item pass">
            <h3>✅ Test 1: HTTPS Image (Should work)</h3>
            <img src="https://via.placeholder.com/150" alt="HTTPS Image">
            <p>This image loads over HTTPS - no warning expected</p>
          </div>
          
          <div class="test-item fail">
            <h3>⚠️ Test 2: HTTP Image (Mixed content warning)</h3>
            <img src="http://via.placeholder.com/150" alt="HTTP Image">
            <p>This image loads over HTTP - browser should block or warn</p>
            <p><em>Check your browser console for mixed content warnings</em></p>
          </div>
        ` : `
          <div class="test-item">
            <p>⚠️ This test only works when accessing via HTTPS</p>
            <p>Visit: <a href="https://${req.hostname}/mixed-content-test">https://${req.hostname}/mixed-content-test</a></p>
          </div>
        `}
        
        <div class="test-item">
          <h3>📋 What to Look For:</h3>
          <ol>
            <li>Open browser DevTools (F12)</li>
            <li>Go to Console tab</li>
            <li>Look for mixed content warnings</li>
            <li>Warnings indicate resources loaded over HTTP on HTTPS page</li>
          </ol>
        </div>
      </body>
    </html>
  `);
});
```

Add this to your app.js and test it. This helps you understand mixed content issues.

### Exercise 2: Security Headers Inspector

Add an endpoint that checks for important security headers:

```javascript
app.get('/security-headers', (req, res) => {
  const securityHeaders = {
    'Strict-Transport-Security': req.get('Strict-Transport-Security'),
    'X-Content-Type-Options': req.get('X-Content-Type-Options'),
    'X-Frame-Options': req.get('X-Frame-Options'),
    'X-XSS-Protection': req.get('X-XSS-Protection'),
    'Content-Security-Policy': req.get('Content-Security-Policy')
  };
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Security Headers Check</title>
        <style>
          body { font-family: Arial; max-width: 900px; margin: 50px auto; padding: 20px; }
          .header-item { 
            margin: 15px 0; 
            padding: 15px; 
            border-radius: 4px;
            background: #f5f5f5;
          }
          .present { background: #d4edda; }
          .missing { background: #f8d7da; }
          code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>🛡️ Security Headers Inspector</h1>
        ${Object.entries(securityHeaders).map(([header, value]) => `
          <div class="header-item ${value ? 'present' : 'missing'}">
            <strong>${value ? '✅' : '❌'} ${header}</strong><br>
            ${value ? `<code>${value}</code>` : '<em>Not present</em>'}
            ${getHeaderExplanation(header)}
          </div>
        `).join('')}
      </body>
    </html>
  `);
});

function getHeaderExplanation(header) {
  const explanations = {
    'Strict-Transport-Security': '<p><small>Forces HTTPS connections. Enable via Cloudflare HSTS.</small></p>',
    'X-Content-Type-Options': '<p><small>Prevents MIME type sniffing. Add via Cloudflare Page Rules or Workers.</small></p>',
    'X-Frame-Options': '<p><small>Prevents clickjacking. Cloudflare can add this via Transform Rules.</small></p>',
    'X-XSS-Protection': '<p><small>Legacy XSS protection (modern browsers use CSP instead).</small></p>',
    'Content-Security-Policy': '<p><small>Controls which resources can load. Advanced security feature.</small></p>'
  };
  return explanations[header] || '';
}
```

### Exercise 3: Certificate Information Endpoint

Add detailed certificate inspection:

```javascript
app.get('/cert-info', (req, res) => {
  if (!req.socket.encrypted) {
    return res.send(`
      <html>
        <body style="font-family: Arial; padding: 50px;">
          <h1>❌ No SSL on Origin</h1>
          <p>This endpoint only works when the origin connection is encrypted.</p>
          <p>Make sure you're running HTTPS server with certificates installed.</p>
        </body>
      </html>
    `);
  }

  const cert = req.socket.getPeerCertificate();
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Certificate Information</title>
        <style>
          body { font-family: Arial; max-width: 900px; margin: 50px auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; }
          .cert-detail { margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>📜 SSL Certificate Details</h1>
        <div class="cert-detail">
          <h3>Subject:</h3>
          <pre>${JSON.stringify(cert.subject, null, 2)}</pre>
        </div>
        <div class="cert-detail">
          <h3>Issuer:</h3>
          <pre>${JSON.stringify(cert.issuer, null, 2)}</pre>
        </div>
        <div class="cert-detail">
          <h3>Valid Period:</h3>
          <p>From: ${cert.valid_from}</p>
          <p>To: ${cert.valid_to}</p>
        </div>
        <div class="cert-detail">
          <h3>Full Certificate:</h3>
          <pre>${JSON.stringify(cert, null, 2)}</pre>
        </div>
      </body>
    </html>
  `);
});
```

---

## Troubleshooting Guide

### Problem: "526 Invalid SSL certificate" error

**What it means:** Cloudflare can't verify your origin certificate.

**Solutions:**

1. **Check certificate installation:**
```bash
sudo ls -la /etc/ssl/cloudflare/
# Both cert.pem and key.pem should exist
```

2. **Verify certificate permissions:**
```bash
# Key should be 600 (only root can read)
sudo chmod 600 /etc/ssl/cloudflare/key.pem
```

3. **Check Node.js is actually using certificates:**
```bash
sudo pm2 logs cloudflare-inspector
# Should show "SSL certificates loaded successfully"
```

4. **Verify HTTPS server is running:**
```bash
sudo netstat -tlnp | grep :443
# Should show node process
```

5. **Temporarily set Cloudflare to "Full" mode:**
- Dashboard → SSL/TLS → Overview → Full
- Test if site loads
- If it works, certificate is invalid/expired
- Regenerate Cloudflare Origin Certificate

### Problem: "Too many redirects" loop

**What it means:** Infinite redirect loop between HTTP and HTTPS.

**Cause:** Cloudflare is sending HTTPS to origin, but origin redirects back to HTTPS, creating a loop.

**Solution:**

1. **Check SSL/TLS mode:**
   - Should be "Full" or "Full (Strict)", NOT "Flexible"

2. **Remove any origin-level HTTPS redirects:**
   - Don't redirect HTTPS→HTTPS in Node.js
   - Cloudflare handles HTTP→HTTPS at edge

3. **Check Page Rules:**
   - Ensure no conflicting redirect rules

### Problem: Mixed content warnings in console

**What it means:** Your HTTPS page is loading HTTP resources (images, scripts, etc.)

**Solutions:**

1. **Enable Automatic HTTPS Rewrites:**
   - Cloudflare Dashboard → SSL/TLS → Edge Certificates
   - Turn ON "Automatic HTTPS Rewrites"

2. **Update resource URLs in code:**
```javascript
// ❌ Wrong
<script src="http://example.com/script.js"></script>

// ✅ Right
<script src="https://example.com/script.js"></script>

// ✅ Even better (protocol-relative)
<script src="//example.com/script.js"></script>
```

3. **Check external resources:**
   - Ensure all CDNs, APIs, images use HTTPS
   - Some old services only support HTTP - find alternatives

### Problem: Certificate shows as invalid in browser

**What it means:** Browser doesn't trust the certificate.

**Check:**

1. **Are you accessing via domain or IP?**
   - ✅ `https://your-domain.com` (should work)
   - ❌ `https://54.123.45.67` (will fail - certificate is for domain, not IP)

2. **Is "Always Use HTTPS" enabled in Cloudflare?**

3. **Clear browser cache:**
   - Ctrl+Shift+Delete
   - Clear "Cached images and files"
   - Try in incognito/private mode

4. **Check system time:**
   - Wrong system time can cause certificate validation failures

### Problem: Site works on HTTPS but not HTTP

**This is actually correct behavior!** After enabling "Always Use HTTPS", you want HTTP to redirect.

Test the redirect:
```bash
curl -I http://your-domain.com
# Should see: 301 Moved Permanently
```

### Problem: "ERR_SSL_PROTOCOL_ERROR" in browser

**What it means:** SSL/TLS handshake failed.

**Solutions:**

1. **Check if HTTPS server is actually running:**
```bash
sudo pm2 logs cloudflare-inspector
# Look for "HTTPS Server running"
```

2. **Test from server itself:**
```bash
curl -k https://localhost:443
# Should return your page
```

3. **Check AWS Security Group:**
   - Port 443 should be open to 0.0.0.0/0

4. **Verify Cloudflare SSL mode:**
   - Should NOT be "Off"
   - "Flexible", "Full", or "Full (Strict)" should work

---

## What You've Accomplished

Congratulations! You've built a production-ready SSL/TLS setup. You now understand:

✅ **Why HTTPS matters** - encryption, trust, SEO, browser requirements  
✅ **The four SSL modes** - Off, Flexible, Full, Full (Strict) and when to use each  
✅ **How to generate Cloudflare Origin Certificates** - free, long-lived, easy  
✅ **How to install certificates on Ubuntu** - proper permissions and file locations  
✅ **How to configure Node.js for HTTPS** - dual HTTP/HTTPS server setup  
✅ **How to force HTTPS redirects** - using Cloudflare's "Always Use HTTPS"  
✅ **How to test SSL configuration** - curl, browser tools, SSL Labs  
✅ **Security headers and HSTS** - what they do and when to enable  

### Your Current Security Posture

With your current setup:
```
Browser ←[HTTPS/Verified]→ Cloudflare ←[HTTPS/Verified]→ Origin
   ✅                          ✅                         ✅
```

- ✅ Full end-to-end encryption
- ✅ Certificate validation at both stages
- ✅ Automatic HTTP→HTTPS redirects
- ✅ Hidden origin IP (from DNS)
- ⚠️ Origin still accessible via direct IP (will fix in Module 5)

### The Path Forward

In **Module 5: Origin Protection**, you'll:
- Lock down origin server with firewall rules
- Only allow Cloudflare IPs to connect
- Test that direct IP access is blocked
- Complete your security hardening
- Understand the full security model

Before moving on, ensure you can:
- Access your site via HTTPS successfully
- Explain the difference between SSL modes
- Understand certificate installation
- Troubleshoot common SSL issues
- Get an A rating on SSL Labs

---

## Quick Reference

### SSL/TLS Modes Comparison

| Mode | Browser→CF | CF→Origin | Production Ready? |
|------|------------|-----------|-------------------|
| Off | ❌ HTTP | ❌ HTTP | ❌ Never |
| Flexible | ✅ HTTPS | ❌ HTTP | ⚠️ Testing only |
| Full | ✅ HTTPS | ✅ HTTPS (unverified) | ⚠️ Internal use |
| Full (Strict) | ✅ HTTPS | ✅ HTTPS (verified) | ✅ Production |

### Certificate Installation Commands

```bash
# Create certificate directory
sudo mkdir -p /etc/ssl/cloudflare

# Create certificate file
sudo nano /etc/ssl/cloudflare/cert.pem
# Paste certificate, save

# Create private key file
sudo nano /etc/ssl/cloudflare/key.pem
# Paste key, save

# Set permissions
sudo chmod 600 /etc/ssl/cloudflare/key.pem
sudo chmod 644 /etc/ssl/cloudflare/cert.pem

# Verify
ls -la /etc/ssl/cloudflare/
```

### Testing Commands

```bash
# Test HTTP→HTTPS redirect
curl -I http://your-domain.com

# Test HTTPS
curl -I https://your-domain.com

# Test certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check which ports are listening
sudo netstat -tlnp | grep node
```

### Cloudflare Settings Checklist

- [ ] SSL/TLS Mode: **Full (Strict)**
- [ ] Always Use HTTPS: **ON**
- [ ] Minimum TLS Version: **1.2**
- [ ] TLS 1.3: **ON**
- [ ] Automatic HTTPS Rewrites: **ON**
- [ ] HSTS: **OFF** (until stable, then enable)

---

## Final Understanding Check

Before Module 5, ensure you can answer:

**1. Draw the flow of data from browser to origin with HTTPS enabled, showing where encryption happens.**

**2. You set Cloudflare to "Flexible" mode. A user submits their credit card number on your checkout page. Who can potentially see this card number in plain text?**

**3. What's the difference between the certificate browsers see (from Cloudflare) and the certificate on your origin server? Why are they different?**

**4. Your SSL Labs test gives you a B rating. What might be wrong, and how would you investigate?**

**5. A user reports "Your connection is not private" error. Walk through your troubleshooting steps.**

---

**Take a break!** SSL/TLS is complex but critical. Make sure you're comfortable with HTTPS before moving to Module 5 for origin protection.

**Next:** Module 5 - Origin Protection (2-3 hours)

*Created using the Deep Learning Framework methodology - Building secure foundations* 🔒