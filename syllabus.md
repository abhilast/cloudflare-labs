# Cloudflare Mastery Syllabus (Beginner to Advanced)

## Table of Contents

- [Pre-Flight: Understanding the Landscape](#pre-flight-understanding-the-landscape)
  - [Module 0: What and Why (2-3 hours)](#module-0-what-and-why-2-3-hours)
- [Phase 1: DNS & Basic Connectivity](#phase-1-dns--basic-connectivity)
  - [Module 1: DNS Fundamentals (3-4 hours)](#module-1-dns-fundamentals-3-4-hours)
  - [Module 2: Your First DNS Records (2-3 hours)](#module-2-your-first-dns-records-2-3-hours)
  - [Module 3: Understanding the Proxy (3-4 hours)](#module-3-understanding-the-proxy-3-4-hours)
- [Phase 2: Security & SSL](#phase-2-security--ssl)
  - [Module 4: SSL/TLS Basics (4-5 hours)](#module-4-ssltls-basics-4-5-hours)
  - [Module 5: Origin Protection (2-3 hours)](#module-5-origin-protection-2-3-hours)
- [Phase 3: Caching Fundamentals](#phase-3-caching-fundamentals)
  - [Module 6: How HTTP Caching Works (4-5 hours)](#module-6-how-http-caching-works-4-5-hours)
  - [Module 7: Controlling the Cache (3-4 hours)](#module-7-controlling-the-cache-3-4-hours)
- [Phase 4: Edge Workers Introduction](#phase-4-edge-workers-introduction)
  - [Module 8: Your First Worker (4-5 hours)](#module-8-your-first-worker-4-5-hours)
  - [Module 9: Practical Worker Patterns (5-6 hours)](#module-9-practical-worker-patterns-5-6-hours)
- [Phase 5: Firewall & Security](#phase-5-firewall--security)
  - [Module 10: Web Application Firewall (WAF) (3-4 hours)](#module-10-web-application-firewall-waf-3-4-hours)
- [Phase 6: Advanced Topics](#phase-6-advanced-topics)
  - [Module 11: Workers KV (Storage) (4-5 hours)](#module-11-workers-kv-storage-4-5-hours)
  - [Module 12: Load Balancing (4-5 hours)](#module-12-load-balancing-4-5-hours)
- [Practical Projects](#practical-projects)
  - [Project 1: Personal Blog with CDN](#project-1-personal-blog-with-cdn-modules-1-7)
  - [Project 2: API Gateway with Rate Limiting](#project-2-api-gateway-with-rate-limiting-modules-8-10)
  - [Project 3: Dynamic Web App](#project-3-dynamic-web-app-modules-11-12)
- [Learning Path Recommendations](#learning-path-recommendations)

---

## **Pre-Flight: Understanding the Landscape**

### **Module 0: What and Why** (2-3 hours)

*Start here if you know nothing about CDNs or Cloudflare*

**Concepts:**
- What problem does Cloudflare solve?
- The journey of a web request without Cloudflare
- The journey of a web request with Cloudflare
- Key Cloudflare concepts in plain English (CDN, Edge, Origin, Proxy)
- When NOT to use certain Cloudflare features

**Hands-on:**

```javascript
// Create basic Node.js server on your Ubuntu instance
// app.js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <h1>Hello from AWS!</h1>
    <p>Server time: ${new Date().toISOString()}</p>
    <p>Your IP: ${req.ip}</p>
  `);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

- Set up Node.js on Ubuntu
- Run your first web server
- Access it via AWS public IP: `http://YOUR_IP:3000`
- Understand why you need a domain name
- **Checkpoint:** Can you access your server from your browser?

---

## **Phase 1: DNS & Basic Connectivity** 

### **Module 1: DNS Fundamentals** (3-4 hours)

**Concepts:**
- What DNS actually does (phone book analogy)
- DNS record types you'll use: A, AAAA, CNAME, TXT
- How Cloudflare becomes your DNS provider
- The "Registrar vs DNS Provider" distinction

**Hands-on:**

```bash
# On your Ubuntu instance
# Install dig for DNS testing
sudo apt update
sudo apt install dnsutils

# Test DNS before Cloudflare
dig your-domain.com
dig @8.8.8.8 your-domain.com
```

**Step-by-step setup:**
1. Add domain to Cloudflare (they'll scan existing DNS)
2. Cloudflare gives you nameservers (e.g., `chad.ns.cloudflare.com`)
3. Update nameservers at your registrar (already done if you bought on Cloudflare!)
4. Wait for nameserver propagation (check with `dig NS your-domain.com`)

**Checkpoint:** Can you see Cloudflare's nameservers when you run `dig NS your-domain.com`?

### **Module 2: Your First DNS Records** (2-3 hours)

**Concepts:**
- A record: Maps domain → IP address
- The Orange Cloud vs Gray Cloud decision
- DNS-only mode (Gray) vs Proxied mode (Orange)
- Subdomains and their uses

**Hands-on:**

```javascript
// Update your Node.js server to show request details
app.get('/', (req, res) => {
  const headers = JSON.stringify(req.headers, null, 2);
  res.send(`
    <h1>Request Inspector</h1>
    <h2>Headers:</h2>
    <pre>${headers}</pre>
  `);
});
```

**Create these DNS records:**

1. `A` record: `@` (root domain) → Your AWS IP - **Gray Cloud first**
2. `A` record: `www` → Your AWS IP - **Gray Cloud**
3. `A` record: `api` → Your AWS IP - **Gray Cloud**

**Test:**

```bash
# All should resolve to your AWS IP
dig your-domain.com
dig www.your-domain.com  
dig api.your-domain.com

# Visit in browser
http://your-domain.com:3000
```

**Checkpoint:** Can you access your server using your domain name?

### **Module 3: Understanding the Proxy** (3-4 hours)

**Concepts:**
- What happens when you flip to Orange Cloud
- Cloudflare's edge network (200+ locations worldwide)
- Your origin IP gets hidden
- New headers Cloudflare adds
- The CF-Ray ID (your request fingerprint)

**Hands-on:**

```javascript
// Enhanced request logger
app.get('/headers', (req, res) => {
  const cloudflareHeaders = {
    'CF-Ray': req.get('CF-Ray'),
    'CF-Connecting-IP': req.get('CF-Connecting-IP'),
    'CF-IPCountry': req.get('CF-IPCountry'),
    'CF-Visitor': req.get('CF-Visitor'),
    'X-Forwarded-Proto': req.get('X-Forwarded-Proto')
  };
  
  res.json({
    cloudflareHeaders,
    allHeaders: req.headers,
    yourRealIP: req.get('CF-Connecting-IP') || req.ip
  });
});
```

**Experiments:**

1. **Before proxy:** Visit `http://your-domain.com:3000/headers` (Gray Cloud)
   - Note the headers
2. **Enable proxy:** Switch DNS record to Orange Cloud
3. **After proxy:** Visit `https://your-domain.com/headers` (note HTTPS!)
   - Compare headers - see new CF-* headers
4. **Security test:** Try accessing `http://YOUR_AWS_IP:3000` directly
   - Still works! This is a security issue we'll fix later

**Checkpoint:** Can you identify the CF-Ray ID in your headers?

---

## **Phase 2: Security & SSL**

### **Module 4: SSL/TLS Basics** (4-5 hours)

**Concepts:**
- Why HTTPS matters (even if you think you don't need it)
- Cloudflare SSL modes explained simply:
  - **Flexible:** Browser ↔ CF (encrypted), CF ↔ Origin (unencrypted) ⚠️ Not recommended
  - **Full:** Both encrypted, but CF doesn't verify your certificate
  - **Full (Strict):** Both encrypted AND CF verifies your certificate ✅ Best
- Origin certificates vs Let's Encrypt

**Hands-on:**

```bash
# On Ubuntu: Install Certbot for Let's Encrypt SSL
sudo apt install certbot python3-certbot-nginx

# Or use Cloudflare Origin Certificate (easier for beginners)
```

**Step-by-step SSL setup:**

1. **Get Cloudflare Origin Certificate:**
   - Cloudflare Dashboard → SSL/TLS → Origin Server
   - Create Certificate
   - Copy certificate and private key

2. **Install on Ubuntu:**

```bash
# Create certificate directory
sudo mkdir -p /etc/cloudflare-certs

# Save certificate
sudo nano /etc/cloudflare-certs/cert.pem
# Paste certificate

# Save private key
sudo nano /etc/cloudflare-certs/key.pem
# Paste private key

# Secure the files
sudo chmod 600 /etc/cloudflare-certs/key.pem
```

3. **Update Node.js for HTTPS:**

```javascript
const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();

const options = {
  key: fs.readFileSync('/etc/cloudflare-certs/key.pem'),
  cert: fs.readFileSync('/etc/cloudflare-certs/cert.pem')
};

app.get('/', (req, res) => {
  res.send('<h1>Secure Hello!</h1>');
});

https.createServer(options, app).listen(443, () => {
  console.log('HTTPS Server running on port 443');
});
```

4. **Set Cloudflare to Full (Strict)**
   - Dashboard → SSL/TLS → Overview → Full (strict)

5. **Enable automatic HTTPS redirects**
   - Dashboard → SSL/TLS → Edge Certificates → Always Use HTTPS: ON

**Checkpoint:** Can you visit `https://your-domain.com` and see a valid SSL certificate?

### **Module 5: Origin Protection** (2-3 hours)

**Problem:** Anyone can still access your AWS IP directly, bypassing Cloudflare!

**Concepts:**
- Why origin protection matters
- Using AWS Security Groups to whitelist Cloudflare IPs
- Testing your protection

**Hands-on:**

```bash
# On Ubuntu: Install firewall
sudo apt install ufw

# Allow SSH (DON'T SKIP THIS!)
sudo ufw allow 22/tcp

# Allow only Cloudflare IP ranges (get from: https://www.cloudflare.com/ips/)
# Example (use actual current IPs from Cloudflare):
sudo ufw allow from 173.245.48.0/20 to any port 443 proto tcp
sudo ufw allow from 103.21.244.0/22 to any port 443 proto tcp
# ... add all Cloudflare IPv4 and IPv6 ranges

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

**Alternative (easier): Use AWS Security Group**

1. AWS Console → EC2 → Security Groups
2. Edit inbound rules
3. Allow HTTPS (443) only from Cloudflare IP ranges
4. Allow SSH (22) from your IP only

**Test:**

- `https://your-domain.com` → Should work
- `https://YOUR_AWS_IP` → Should timeout/fail

**Checkpoint:** Your origin IP should NOT be directly accessible on port 443.

---

## **Phase 3: Caching Fundamentals**

### **Module 6: How HTTP Caching Works** (4-5 hours)

**Concepts you'll master:**
- Why caching speeds things up (and saves you money)
- HTTP cache headers explained: `Cache-Control`, `ETag`, `Last-Modified`
- The caching chain: Browser → Cloudflare → Origin
- What Cloudflare caches by default (hint: not HTML!)
- Cache statuses: HIT, MISS, EXPIRED, DYNAMIC, BYPASS

**Hands-on:**

```javascript
// app.js - Create test endpoints
const express = require('express');
const app = express();

// 1. Static content (should cache)
app.get('/static.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(`console.log('Generated at ${new Date().toISOString()}');`);
});

// 2. Dynamic content (should NOT cache)
app.get('/api/time', (req, res) => {
  res.json({ time: new Date().toISOString() });
});

// 3. HTML page (won't cache by default)
app.get('/page', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(`<h1>Generated at ${new Date().toISOString()}</h1>`);
});

// 4. Image endpoint (will cache)
app.get('/image.png', (req, res) => {
  res.set('Content-Type', 'image/png');
  res.set('Cache-Control', 'public, max-age=86400');
  // Send a real PNG or use placeholder
  res.sendFile(__dirname + '/test.png');
});

// 5. Test query parameters
app.get('/search', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json({
    query: req.query,
    time: new Date().toISOString()
  });
});
```

**Experiments:**

1. **Test what caches by default:**

```bash
# Request multiple times, check CF-Cache-Status header
curl -I https://your-domain.com/static.js
curl -I https://your-domain.com/static.js  # Should be HIT second time

curl -I https://your-domain.com/api/time  # Always DYNAMIC/BYPASS

curl -I https://your-domain.com/page  # DYNAMIC (HTML not cached by default)
```

2. **Use browser DevTools:**
   - Open Network tab
   - Visit `/static.js` twice
   - Look for `CF-Cache-Status` in response headers
   - First request: `MISS` or `EXPIRED`
   - Second request: `HIT` (served from cache!)

3. **Test query parameters:**

```bash
curl -I "https://your-domain.com/search?q=test"
curl -I "https://your-domain.com/search?q=test"  # HIT
curl -I "https://your-domain.com/search?q=different"  # MISS (different cache key)
```

4. **Manual cache purge:**
   - Cloudflare Dashboard → Caching → Configuration
   - Purge Everything or Purge by URL
   - Test `/static.js` again → Back to MISS

**Key Learning:** Cloudflare caches based on file extension and Cache-Control headers. By default: CSS, JS, images cache. HTML, APIs don't.

**Checkpoint:** Can you make one endpoint return `HIT` and another return `BYPASS`?

### **Module 7: Controlling the Cache** (3-4 hours)

**Concepts:**
- Page Rules for custom cache behavior
- Cache Everything rule (to cache HTML)
- Browser Cache TTL vs Edge Cache TTL
- Cache bypass techniques

**Hands-on:**

```javascript
// Create blog-like structure
app.get('/blog/:slug', (req, res) => {
  res.send(`
    <html>
      <head><title>Blog Post</title></head>
      <body>
        <h1>Blog Post: ${req.params.slug}</h1>
        <p>Generated at: ${new Date().toISOString()}</p>
        <p>This HTML should be cached!</p>
      </body>
    </html>
  `);
});

// Admin area that should NEVER cache
app.get('/admin/*', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.send('<h1>Admin Panel - No caching!</h1>');
});

// API with cookie handling
app.get('/api/user', (req, res) => {
  const sessionCookie = req.cookies.session;
  if (sessionCookie) {
    res.json({ user: 'Logged in', cache: 'should bypass' });
  } else {
    res.json({ user: 'Guest', cache: 'could cache' });
  }
});
```

**Create Page Rules (Dashboard → Rules → Page Rules):**

1. **Cache blog posts:**
   - URL: `your-domain.com/blog/*`
   - Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 2 hours
     - Browser Cache TTL: 30 minutes

2. **Don't cache admin:**
   - URL: `your-domain.com/admin/*`
   - Settings:
     - Cache Level: Bypass

3. **Test cookie bypass:**
   - Default Cloudflare behavior: If request has cookies, bypass cache for HTML
   - Test with/without cookies

**Testing:**

```bash
# Blog should cache after first request
curl -I https://your-domain.com/blog/hello-world
curl -I https://your-domain.com/blog/hello-world  # Should be HIT

# Admin should never cache
curl -I https://your-domain.com/admin/dashboard  # Always BYPASS
```

**Checkpoint:** Can you cache HTML on one URL pattern but bypass cache on another?

---

## **Phase 4: Edge Workers Introduction**

### **Module 8: Your First Worker** (4-5 hours)

**Concepts:**
- What Workers are (JavaScript running at Cloudflare's edge)
- Why run code at the edge vs on your server
- Workers execution model (V8 isolates)
- Request → Worker → Origin flow

**Create your first Worker:**

1. **Dashboard → Workers & Pages → Create Worker**

2. **Start with Hello World:**

```javascript
export default {
  async fetch(request, env, ctx) {
    return new Response('Hello from the Edge!', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
```

3. **Deploy and test**
   - You get a URL like: `your-worker.your-subdomain.workers.dev`

4. **Proxy to your origin:**

```javascript
export default {
  async fetch(request, env, ctx) {
    // Pass request to your origin
    const response = await fetch(request);
    
    // Add custom header
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-Worker-Version', '1.0');
    newResponse.headers.set('X-Processed-At-Edge', 'true');
    
    return newResponse;
  }
}
```

5. **Add route:**
   - Workers → Your Worker → Triggers → Add Route
   - Route: `your-domain.com/*`
   - Zone: Select your domain

6. **Test:**

```bash
curl -I https://your-domain.com/
# Should see your custom headers!
```

**Build useful workers:**

**A) Add custom response headers:**

```javascript
export default {
  async fetch(request) {
    const response = await fetch(request);
    const newResponse = new Response(response.body, response);
    
    // Add security headers
    newResponse.headers.set('X-Frame-Options', 'DENY');
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    
    return newResponse;
  }
}
```

**B) Log request details:**

```javascript
export default {
  async fetch(request) {
    console.log('Request:', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers),
      cf: request.cf  // Cloudflare-specific properties
    });
    
    return fetch(request);
  }
}
```

**View logs:**
- Dashboard → Workers → Your Worker → Logs (Real-time logs)

**Checkpoint:** Can you create a worker that adds a custom header to all responses?

### **Module 9: Practical Worker Patterns** (5-6 hours)

**A) Geolocation-based responses:**

```javascript
export default {
  async fetch(request) {
    const country = request.cf.country;
    
    if (country === 'US') {
      return new Response('Hello American visitor!');
    } else if (country === 'IN') {
      return new Response('Hello Indian visitor!');
    } else {
      return new Response(`Hello visitor from ${country}!`);
    }
  }
}
```

**B) A/B Testing:**

```javascript
export default {
  async fetch(request) {
    // 50/50 split
    const variant = Math.random() < 0.5 ? 'A' : 'B';
    
    const response = await fetch(request);
    const html = await response.text();
    
    // Inject variant into HTML
    const modified = html.replace(
      '<body>',
      `<body data-variant="${variant}">`
    );
    
    return new Response(modified, {
      headers: {
        'Content-Type': 'text/html',
        'X-Variant': variant
      }
    });
  }
}
```

**C) URL Redirects:**

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Redirect /old to /new
    if (url.pathname === '/old') {
      return Response.redirect('https://your-domain.com/new', 301);
    }
    
    // Redirect based on country
    const country = request.cf.country;
    if (country === 'US' && url.pathname === '/') {
      return Response.redirect('https://your-domain.com/us', 302);
    }
    
    return fetch(request);
  }
}
```

**D) Simple Authentication:**

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Protect /admin
    if (url.pathname.startsWith('/admin')) {
      const authHeader = request.headers.get('Authorization');
      
      if (!authHeader || authHeader !== 'Bearer SECRET_TOKEN') {
        return new Response('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Bearer' }
        });
      }
    }
    
    return fetch(request);
  }
}
```

**Checkpoint:** Build a worker that redirects users from one country to a specific page.

---

## **Phase 5: Firewall & Security**

### **Module 10: Web Application Firewall (WAF)** (3-4 hours)

**Concepts:**
- What WAF protects against (SQL injection, XSS, etc.)
- Managed rules vs custom rules
- Challenge pages vs blocks

**Hands-on:**

```javascript
// Create vulnerable endpoint for testing (DON'T use in production!)
app.get('/search', (req, res) => {
  const query = req.query.q;
  res.send(`<h1>Search results for: ${query}</h1>`);
});
```

**Create firewall rules:**

1. **Block specific User-Agent:**
   - Dashboard → Security → WAF → Create Rule
   - Expression: `(http.user_agent contains "badbot")`
   - Action: Block

2. **Rate limiting:**
   - Expression: `(http.request.uri.path eq "/api/expensive")`
   - Action: Block
   - When: Rate exceeds 5 requests per minute

3. **Challenge suspicious traffic:**
   - Expression: `(cf.threat_score gt 10)`
   - Action: Managed Challenge

**Test:**

```bash
# Should be blocked
curl -A "badbot" https://your-domain.com/

# Normal request works
curl https://your-domain.com/
```

**Enable Managed Rules:**
- Dashboard → Security → WAF → Managed rules
- Enable "Cloudflare Managed Ruleset"
- Test XSS/SQL injection patterns (carefully!)

**Checkpoint:** Can you block a specific user agent from accessing your site?

---

## **Phase 6: Advanced Topics**

### **Module 11: Workers KV (Storage)** (4-5 hours)

**Concepts:**
- Key-value storage at the edge
- Global, eventually consistent
- Use cases: Caching, configuration, simple databases

**Create KV namespace:**

1. Dashboard → Workers & Pages → KV
2. Create namespace: "MY_KV"
3. Bind to worker

**Worker with KV:**

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Visitor counter
    if (url.pathname === '/count') {
      const key = 'visitor_count';
      let count = await env.MY_KV.get(key) || '0';
      count = parseInt(count) + 1;
      await env.MY_KV.put(key, count.toString());
      
      return new Response(`Visitor count: ${count}`);
    }
    
    // Cache API response in KV
    if (url.pathname === '/cached-api') {
      const key = 'api_data';
      let data = await env.MY_KV.get(key);
      
      if (!data) {
        // Fetch from external API
        const apiResponse = await fetch('https://api.example.com/data');
        data = await apiResponse.text();
        
        // Cache for 1 hour
        await env.MY_KV.put(key, data, { expirationTtl: 3600 });
      }
      
      return new Response(data, {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return fetch(request);
  }
}
```

**Checkpoint:** Can you build a visitor counter that persists across requests?

### **Module 12: Load Balancing** (4-5 hours)

**Concepts:**
- Health checks
- Failover
- Geographic routing
- Session affinity

**Prerequisites:**
- Spin up second AWS instance (or use different port on same instance for testing)

**Setup:**

1. **Create origins:**
   - Dashboard → Traffic → Load Balancing → Create
   - Add origin 1: Your AWS IP (primary)
   - Add origin 2: Backup server

2. **Configure health check:**
   - Monitor URL: `/health`
   - Interval: 60 seconds

3. **Create endpoint:**

```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.get('/', (req, res) => {
  res.send(`<h1>Server 1</h1><p>Instance: ${process.env.INSTANCE_NAME}</p>`);
});
```

**Test failover:**

- Stop server 1
- Traffic should route to server 2
- Start server 1 again

**Checkpoint:** Can traffic automatically failover to a backup server?

---

## **Practical Projects** (Build These)

### **Project 1: Personal Blog with CDN** (Modules 1-7)

- Static HTML cached at edge
- Image optimization
- SSL configured
- Origin protected
- Blog posts cached for 1 hour

### **Project 2: API Gateway with Rate Limiting** (Modules 8-10)

- Worker routes to Node.js backend
- Rate limiting per API key
- Geolocation-based responses
- Security headers
- Request logging

### **Project 3: Dynamic Web App** (Modules 11-12)

- Workers KV for session storage
- Load balanced across 2 servers
- A/B testing via Worker
- Custom error pages
- Analytics tracking

---

## **Learning Path Recommendations**

**Week 1:** Modules 0-3 (Foundation)

**Week 2:** Modules 4-5 (Security)

**Week 3:** Modules 6-7 (Caching)

**Week 4:** Modules 8-9 (Workers)

**Week 5:** Module 10 (Firewall)

**Week 6:** Modules 11-12 (Advanced)

**Week 7-8:** Build all 3 projects

**Daily Routine:**

- 1 hour learning concepts
- 1-2 hours hands-on practice
- Document what you learned
- Break things intentionally to understand them

**Key Resources:**

- [Cloudflare Docs](https://developers.cloudflare.com/)
- [Workers Examples](https://developers.cloudflare.com/workers/examples/)
- [Cloudflare Blog](https://blog.cloudflare.com/)

**Checkpoints after each module validate you actually understand before moving on!**