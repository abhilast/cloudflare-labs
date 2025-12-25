# Module 2: Your First DNS Records

**Time Commitment:** 2-3 hours  
**Prerequisites:** Module 0 completed, Node.js server running on AWS  
**What You'll Build:** A working website accessible via your domain name with DNS properly configured

---

## Layer 1: Understanding the Foundation

### The Problem We're Solving

Right now, you have a Node.js server running on AWS at some IP address like `54.123.45.67:3000`. You can access it in your browser by typing that exact IP and port. But there are three major problems with this:

**Problem 1: Nobody remembers IP addresses.** Quick - what's Google's IP address? You don't know, and you don't need to. You just type "google.com" and it works. That's what we need for your server.

**Problem 2: IP addresses change.** If you restart your AWS instance, get a new server, or switch providers, your IP changes. Every link to your site breaks. Every bookmark stops working.

**Problem 3: You can't use HTTPS with just an IP.** SSL certificates (the padlock in your browser) are issued to domain names, not IP addresses. Without a domain, you can't get that secure connection.

### What DNS Records Actually Do

Think of DNS records as entries in a phone book. When you tell someone "call me at John's Pizza," they need to look up John's Pizza in the phone book to find the actual phone number. DNS works exactly the same way:

- **Domain name** (the-best-pizza.com) = The friendly name people remember
- **A Record** = The phone book entry that says "the-best-pizza.com is at 54.123.45.67"
- **DNS Server** (Cloudflare) = The phone book company that maintains this directory

When someone types your domain into their browser, here's what happens:

```
User types: "your-domain.com"
    ↓
Browser asks DNS: "What's the IP for your-domain.com?"
    ↓
Cloudflare DNS responds: "It's at 54.123.45.67"
    ↓
Browser connects to: 54.123.45.67
    ↓
Your server sends the webpage
```

### The Orange Cloud vs Gray Cloud Decision

This is one of the most important concepts in Cloudflare, and it's surprisingly simple once you understand what it does.

When you create a DNS record in Cloudflare, you'll see a little cloud icon that can be either:
- **Gray Cloud** (DNS-only mode)
- **Orange Cloud** (Proxied mode)

**Gray Cloud means:** "Cloudflare, just tell people my IP address and step aside."

When someone visits your site with gray cloud enabled:
```
User → Cloudflare DNS (gets your real IP) → User connects directly to your AWS server
```

Cloudflare only helps with the DNS lookup. It's like giving someone directions to your house - you told them how to get there, but you're not escorting them.

**Orange Cloud means:** "Cloudflare, don't tell anyone my real IP. Route their traffic through you first."

When someone visits your site with orange cloud enabled:
```
User → Cloudflare DNS → Cloudflare's Edge Server → Your AWS server
```

Cloudflare sits in the middle, hiding your real IP and providing services like caching, DDoS protection, and SSL. It's like having a doorman who screens visitors before they reach your apartment.

**Why we start with Gray Cloud:** We want to verify DNS is working correctly before adding the complexity of Cloudflare's proxy. It's easier to debug problems when there are fewer moving parts.

---

## Understanding Check #1

Before we move forward with creating records, let me make sure this foundation is solid:

**Question 1:** In your own words, what problem does an A record solve? Why can't we just give people our IP address?

**Question 2:** If you had a Gray Cloud DNS record pointing to your server, and you accessed your site, would Cloudflare's edge servers be involved in serving your webpage? Why or why not?

**Question 3:** Imagine you're running an online store. You have an IP address but no domain name. What practical problems would you face trying to run your business?

Take a moment to think about these. The answers will help solidify the mental model before we start creating records.

---

## Layer 2: Creating Your First DNS Records

### What We're Building

By the end of this section, you'll have:
1. Your main domain (your-domain.com) pointing to your server
2. The www subdomain (www.your-domain.com) also working
3. An API subdomain (api.your-domain.com) for future API endpoints
4. The ability to access your Node.js app using any of these domains

### Step 1: Understanding A Records

An **A Record** (Address Record) is the most fundamental DNS record type. It creates a simple mapping:

```
Domain Name → IPv4 Address
```

That's it. No magic. Just a statement: "When someone asks for this name, give them this IP address."

The anatomy of an A record:
- **Name:** What domain/subdomain you're creating (e.g., "www" or "@" for root)
- **Content:** The IP address it points to
- **TTL:** Time To Live - how long other DNS servers should cache this answer (we'll use Auto)
- **Proxy Status:** Gray cloud (DNS-only) or Orange cloud (proxied)

### Step 2: Prepare Your Application

Before creating DNS records, let's update your Node.js server to show us valuable debugging information. This will help us understand what's happening when requests come in.

Update your `app.js` file to this enhanced version:

```javascript
// app.js - Enhanced version for DNS testing
const express = require('express');
const app = express();

// Helper function to safely get headers
function getHeader(req, headerName) {
  return req.get(headerName) || 'Not present';
}

// Main route - shows request information
app.get('/', (req, res) => {
  const requestInfo = {
    hostname: req.hostname,
    protocol: req.protocol,
    ip: req.ip,
    method: req.method,
    path: req.path
  };

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>DNS Testing - ${req.hostname}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .card {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 { color: #333; }
          h2 { color: #666; margin-top: 0; }
          .info { 
            background: #e3f2fd;
            padding: 10px;
            border-left: 4px solid #2196f3;
            margin: 10px 0;
          }
          .success { border-left-color: #4caf50; background: #e8f5e9; }
          pre {
            background: #263238;
            color: #aed581;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
          }
          .status {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 4px;
            background: #4caf50;
            color: white;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🎉 DNS Record Working!</h1>
          <div class="info success">
            <strong>Status:</strong> <span class="status">CONNECTED</span><br>
            <strong>You accessed via:</strong> ${req.hostname}
          </div>
        </div>

        <div class="card">
          <h2>📍 Request Information</h2>
          <pre>${JSON.stringify(requestInfo, null, 2)}</pre>
        </div>

        <div class="card">
          <h2>🔍 All Request Headers</h2>
          <pre>${JSON.stringify(req.headers, null, 2)}</pre>
        </div>

        <div class="card">
          <h2>⏰ Server Time</h2>
          <p>${new Date().toISOString()}</p>
        </div>
      </body>
    </html>
  `);
});

// Specific route for testing subdomains
app.get('/test', (req, res) => {
  const subdomain = req.hostname.split('.')[0];
  
  res.json({
    message: 'Subdomain test successful',
    subdomain: subdomain,
    fullHostname: req.hostname,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'running',
    timestamp: new Date().toISOString()
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`=================================`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Server started at: ${new Date().toISOString()}`);
});
```

Save this file and restart your server:

```bash
# Stop the current server (Ctrl+C if it's running)

# Start the enhanced version
node app.js
```

### Step 3: Find Your AWS Public IP

We need your server's public IP address to create the DNS records. Here's how to find it:

**Method 1 - From AWS Console:**
1. Log into AWS Console
2. Go to EC2 → Instances
3. Look for "Public IPv4 address" (something like 54.123.45.67)

**Method 2 - From your Ubuntu terminal:**
```bash
curl http://checkip.amazonaws.com
```

**Write down this IP address** - you'll need it in the next step. Let's say it's `54.123.45.67` for this example.

### Step 4: Create Your First A Record (Root Domain)

Now for the exciting part - connecting your domain to your server!

**In Cloudflare Dashboard:**

1. **Navigate to DNS:**
   - Log into Cloudflare
   - Click on your domain
   - Go to "DNS" in the left sidebar

2. **Add A Record for Root Domain:**
   - Click "Add record"
   - **Type:** Select "A"
   - **Name:** Type `@` (this represents your root domain like example.com)
   - **IPv4 address:** Enter your AWS IP (e.g., 54.123.45.67)
   - **Proxy status:** Click the cloud to make it **GRAY** (DNS only)
   - **TTL:** Leave as "Auto"
   - Click "Save"

**What you just did:** You told Cloudflare's DNS: "When someone asks for 'your-domain.com', tell them it's at 54.123.45.67"

### Step 5: Test Your Root Domain

DNS changes take time to propagate across the internet, but Cloudflare is usually very fast (30 seconds to 2 minutes).

**Test using dig (terminal):**
```bash
# Replace your-domain.com with your actual domain
dig your-domain.com

# You should see something like:
# your-domain.com.    300    IN    A    54.123.45.67
```

The important part is the IP address at the end - it should match your AWS IP.

**Test in browser:**
```
http://your-domain.com:3000
```

Remember the `:3000` because your Node.js server is listening on port 3000, not the default HTTP port 80.

**What you should see:** Your enhanced Node.js page showing "DNS Record Working!" and all the request details.

### Step 6: Create WWW Subdomain

The "www" subdomain is a convention - many people expect `www.your-domain.com` to work alongside `your-domain.com`. Let's add it:

**In Cloudflare DNS:**

1. Click "Add record" again
2. **Type:** A
3. **Name:** `www`
4. **IPv4 address:** Same AWS IP (54.123.45.67)
5. **Proxy status:** GRAY cloud
6. **Click "Save"**

**Test it:**
```bash
dig www.your-domain.com

# Then in browser:
http://www.your-domain.com:3000
```

You now have two ways to reach your server!

### Step 7: Create API Subdomain

Even if you don't have an API yet, let's create a subdomain for it. This demonstrates how subdomains work and sets you up for future development.

**In Cloudflare DNS:**

1. Click "Add record"
2. **Type:** A
3. **Name:** `api`
4. **IPv4 address:** Same AWS IP
5. **Proxy status:** GRAY cloud
6. **Save**

**Test it:**
```bash
dig api.your-domain.com
```

**In browser:**
```
http://api.your-domain.com:3000/test
```

This should show you a JSON response identifying the subdomain!

---

## Understanding Check #2

You've just created three DNS records. Let's verify your understanding:

**Question 1:** You created three A records all pointing to the same IP address. When someone visits www.your-domain.com, how does your Node.js application know they came via "www" and not "api"? (Hint: Look at the request headers in your browser)

**Question 2:** If you change your AWS server's IP address tomorrow, how many DNS records would you need to update? What would happen to visitors trying to access your site during the DNS propagation period?

**Question 3:** Right now you're using `http://your-domain.com:3000`. Why do you still need the `:3000` port number? Why can't you just use `http://your-domain.com`?

---

## Layer 3: Understanding How This Actually Works

### The Journey of a DNS Request

When you type `your-domain.com` in your browser, here's the detailed journey:

**Step 1: Browser checks its cache**
Your browser remembers DNS lookups for a short time. If you visited the site recently, it might already know the IP.

**Step 2: Operating system cache check**
If browser doesn't know, it asks your OS (which also caches DNS).

**Step 3: Recursive DNS resolver**
If still no answer, your computer asks your ISP's DNS resolver (or 8.8.8.8 if you use Google DNS).

**Step 4: Root nameservers**
The resolver asks: "Who knows about .com domains?" Root servers respond: "Ask the .com nameservers"

**Step 5: TLD nameservers**
Resolver asks .com nameservers: "Who knows about your-domain.com?" They respond: "Ask chad.ns.cloudflare.com" (Cloudflare's nameserver)

**Step 6: Authoritative nameserver (Cloudflare)**
Resolver asks Cloudflare: "What's the A record for your-domain.com?" Cloudflare responds: "54.123.45.67"

**Step 7: Response to browser**
The resolver sends the IP back to your browser.

**Step 8: Browser connects**
Your browser makes an HTTP connection to 54.123.45.67:3000 and requests the page.

This seems complex, but it happens in milliseconds because of caching at each level.

### Why We Used Gray Cloud First

We started with Gray Cloud (DNS-only mode) for three important reasons:

**Reason 1: Simplicity in debugging**
When something doesn't work, you want to eliminate variables. With Gray Cloud, the path is simple:
```
Browser → Gets IP from DNS → Connects directly to your server
```

If it doesn't work, the problem is either:
- DNS configuration is wrong
- Your server isn't running
- Firewall is blocking connections
- IP address is incorrect

**Reason 2: See the real request headers**
When you connect directly to your server (Gray Cloud), you see exactly what the browser sends - no modifications. This helps you understand the baseline before Cloudflare adds its own headers.

**Reason 3: Ports still work**
With Gray Cloud, you can still access `:3000` because the browser connects directly to your server. Once we enable Orange Cloud (proxied mode) in the next module, Cloudflare only forwards traffic on standard ports (80 for HTTP, 443 for HTTPS).

### What Happens When You Update a DNS Record

When you modify a DNS record in Cloudflare, here's what happens:

**Immediate (0-2 seconds):**
- Cloudflare updates its authoritative nameservers
- New queries to Cloudflare get the new IP immediately

**Short term (5-30 minutes):**
- Recursive resolvers' caches expire based on TTL
- They query Cloudflare again and get the new IP
- Most users see the change

**Long term (up to 24-48 hours in rare cases):**
- Some misbehaving DNS servers might cache longer than TTL suggests
- Browser caches expire
- Everyone eventually sees the new IP

This is why TTL (Time To Live) matters. A lower TTL means faster propagation but more DNS queries. A higher TTL means fewer queries but slower updates.

### The Subdomain Architecture

When you created `www`, `api`, and root domain records, you created flexibility for your architecture:

**Root domain** (`your-domain.com`):
- Your main website, landing pages, marketing content
- What most people think of as "your site"

**www subdomain** (`www.your-domain.com`):
- Convention from the early web
- Some organizations prefer www, others prefer root
- Having both means nobody gets a broken link

**api subdomain** (`api.your-domain.com`):
- Separates your API from your main site
- In production, might point to different servers
- Makes it clear "this is for API calls, not humans"
- Enables separate caching rules later

Even though they all point to the same IP now, you can change this later. You might run:
- Main app on 54.123.45.67
- API on 54.123.45.99
- Just update DNS records - no code changes needed!

---

## Understanding Check #3

**Question 1:** Imagine you're running a popular website on your-domain.com, and you need to migrate to a new server with a different IP address. You want to minimize downtime. Describe the strategy you'd use, considering DNS propagation time.

**Question 2:** You notice that when you access your site via `www.your-domain.com`, the Node.js app shows the hostname as "www.your-domain.com". But the request is going to the same IP as the root domain. How does your application know which domain was used in the request?

**Question 3:** A colleague suggests: "Why have separate DNS records? Why not just create one A record and use CNAME records for www and api?" Is this a good idea? Why or why not?

---

## Layer 4: Practical Exercises and Next Steps

### Exercise 1: Create a Status Page

Modify your app to show different content based on subdomain:

```javascript
// Add this before your existing routes
app.get('/', (req, res) => {
  const hostname = req.hostname;
  const subdomain = hostname.split('.')[0];
  
  let pageContent = {
    title: 'Main Site',
    message: 'Welcome to the main site!'
  };
  
  if (subdomain === 'www') {
    pageContent.title = 'WWW Site';
    pageContent.message = 'You accessed via www subdomain';
  } else if (subdomain === 'api') {
    // Return JSON for API subdomain
    return res.json({
      message: 'API endpoint',
      version: '1.0',
      subdomain: subdomain
    });
  }
  
  res.send(`
    <html>
      <head><title>${pageContent.title}</title></head>
      <body>
        <h1>${pageContent.message}</h1>
        <p>Hostname: ${hostname}</p>
        <p>Subdomain detected: ${subdomain}</p>
      </body>
    </html>
  `);
});
```

Test each subdomain - they should show different content despite pointing to the same server!

### Exercise 2: DNS Record Scavenger Hunt

Use the `dig` command to investigate other websites:

```bash
# Check GitHub's DNS
dig github.com

# Check their www subdomain
dig www.github.com

# Check nameservers
dig NS github.com

# Trace the full DNS path
dig +trace google.com
```

Study how major websites configure their DNS. Notice patterns.

### Exercise 3: Create a Custom Subdomain

Choose a creative subdomain name (like `blog`, `shop`, `dashboard`) and create an A record for it. Then modify your Node.js app to detect and display custom content for that subdomain.

### Troubleshooting Guide

**Problem: "dig shows the correct IP but browser can't connect"**
- Check if your Node.js server is actually running: `ps aux | grep node`
- Verify it's listening on port 3000: `netstat -tlnp | grep 3000`
- Make sure you're including `:3000` in the URL
- Check AWS Security Group allows port 3000 from your IP

**Problem: "dig doesn't show my IP address"**
- Wait 2-5 minutes - DNS propagation takes time
- Try: `dig @chad.ns.cloudflare.com your-domain.com` (query Cloudflare directly)
- Verify you clicked "Save" in Cloudflare dashboard
- Check DNS record is Active (not Paused)

**Problem: "Browser shows 'DNS_PROBE_FINISHED_NXDOMAIN'"**
- Nameservers might not be updated at your registrar
- Check: `dig NS your-domain.com` - should show Cloudflare nameservers
- If not, update nameservers at your domain registrar

**Problem: "Site works but only sometimes"**
- Could be DNS caching - try different devices/networks
- Try: `dig your-domain.com` from multiple computers
- Clear your browser cache and DNS cache: `sudo systemd-resolve --flush-caches` (Ubuntu)

---

## What You've Accomplished

You've built a solid foundation in DNS! You can now:

✅ Create A records that map domain names to IP addresses  
✅ Understand the difference between DNS-only (Gray Cloud) and Proxied (Orange Cloud)  
✅ Set up multiple subdomains pointing to the same server  
✅ Debug DNS issues using dig and other tools  
✅ Understand the full journey of a DNS request  
✅ Access your application via a memorable domain name instead of an IP address

### The Path Forward

In Module 3, we'll flip those Gray Clouds to Orange, enabling Cloudflare's proxy. You'll learn:
- What changes when requests go through Cloudflare's edge
- How to identify Cloudflare-specific request headers
- Why your origin IP becomes hidden
- The implications for security and caching

But before moving on, make sure you can confidently:
- Create DNS records without looking at documentation
- Explain why we use Gray Cloud initially
- Troubleshoot basic DNS issues
- Understand how subdomains work

---

## Quick Reference

**Creating an A Record:**
1. Cloudflare Dashboard → DNS
2. Add record → Type: A
3. Name: @ (root), www, or subdomain name
4. IPv4: Your server IP
5. Proxy: Gray cloud to start
6. Save

**Testing DNS:**
```bash
# Check A record
dig your-domain.com

# Check specific nameserver
dig @chad.ns.cloudflare.com your-domain.com

# Check subdomain
dig www.your-domain.com

# Full trace
dig +trace your-domain.com
```

**Common Ports:**
- 80: HTTP (default, you can omit from URL)
- 443: HTTPS (default, you can omit from URL)
- 3000: Your Node.js app (must include in URL for now)

---

Ready to move to Module 3 and enable Cloudflare's proxy? Make sure you're comfortable with these DNS fundamentals first!