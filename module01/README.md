# Module 1: DNS Fundamentals

**Estimated Time:** 3-4 hours  
**Prerequisites:** Module 0 completed (basic server running)  
**Goal:** Understand what DNS is, why it exists, and successfully configure Cloudflare as your DNS provider

---

## Before We Start: What You'll Achieve

By the end of this module, you'll be able to:
- Explain what DNS does and why the internet needs it
- Understand the difference between a domain registrar and a DNS provider
- Configure Cloudflare as your DNS provider
- Use command-line tools to inspect DNS records
- Verify that your domain is properly pointing to Cloudflare's nameservers

---

## Layer 1: The Intuitive Foundation - Why DNS Exists

### The Problem DNS Solves

Imagine you're at a massive office complex with 10,000 employees. You need to send a document to Sarah from the marketing team, but you don't know which floor she's on, which building, or even her desk number. You just know her name: "Sarah."

This is exactly the problem computers face on the internet. Every device connected to the internet has an IP address (like `54.239.28.85`), which is its precise "location" on the network. But humans are terrible at remembering strings of numbers. Could you memorize the IP addresses of Google, Facebook, Amazon, Netflix, and all the other sites you visit? Of course not.

**DNS (Domain Name System) is the phone book of the internet.** It translates human-friendly names like `google.com` into computer-friendly IP addresses like `142.250.80.46`.

### What Would Happen Without DNS?

Let's think through this practically. Without DNS, you'd need to:

1. **Remember IP addresses for every website:** Instead of typing `amazon.com`, you'd type `54.239.28.85`. And when Amazon changes servers or adds load balancers? You'd need to learn a new IP address.

2. **No website could ever change servers:** If Netflix moved from one data center to another, every device on earth would need to update the IP address they use to reach Netflix. Impossible.

3. **No content delivery networks:** Services like Cloudflare route you to the nearest server. Without DNS, every user worldwide would hit the same IP address, making global services impossibly slow.

### A Real-World Analogy

Think of DNS like your contacts app on your phone:
- **Domain name** (`google.com`) = Contact name ("Mom")
- **IP address** (`142.250.80.46`) = Phone number (555-1234)
- **DNS server** = Your contacts app that does the lookup

When you tap "Mom" to call her, your phone doesn't care about the name. It looks up the number and dials that. Similarly, when you type `google.com`, your computer asks a DNS server "What's the IP address for this?" and then connects to that IP.

The beautiful part? If your mom changes her phone number, you just update one entry in your contacts. If Google changes their IP address, they just update one DNS record, and the whole world automatically gets the new "number."

### Understanding Check #1

Before we move forward, let me make sure this foundation is solid. Can you explain in your own words:

**Why do we need DNS? What would break if it didn't exist?**

Think about it for a moment. The answer should connect to real problems you'd face as either a website operator or a regular internet user.

<details>
<summary>Click to reveal a good answer</summary>

A good answer touches on these points:
- Humans can't remember IP addresses for hundreds of websites
- IP addresses change when infrastructure changes (new servers, load balancers, CDNs)
- Without DNS, any infrastructure change would require every user to manually update the IP they use
- DNS enables flexibility - website operators can change infrastructure without breaking user access
- DNS enables features like CDNs that route users to geographically optimal servers

If you got most of this, you're ready to continue! If not, re-read the section above and think about what happens when you type a website address into your browser.
</details>

---

## Layer 2: Core Mechanics - How DNS Actually Works

Now that you understand *why* DNS exists, let's explore *how* it works.

### The DNS Hierarchy: A Distributed System

You mentioned you work with Kubernetes and distributed systems, so this will feel familiar. DNS is not one giant database in the sky. It's a hierarchical, distributed system with multiple layers.

When you type `blog.example.com` into your browser, here's what happens:

1. **Your Computer Checks Its Cache:** "Have I looked up `blog.example.com` recently?" If yes, use the cached IP address. If no, continue.

2. **Your Computer Asks Your ISP's DNS Resolver:** This is like a local library. It might have the answer cached. If not, it knows how to find it.

3. **The Resolver Asks Root Nameservers:** "Who knows about `.com` domains?" Root servers respond: "Ask the `.com` nameservers."

4. **Ask `.com` Nameservers:** "Who knows about `example.com`?" They respond: "Ask Cloudflare's nameservers at `chad.ns.cloudflare.com`."

5. **Ask Cloudflare's Nameservers:** "What's the IP for `blog.example.com`?" Cloudflare responds with the actual IP address.

6. **Your Computer Connects:** Now that it has `54.239.28.85`, it connects to your server.

This whole process typically takes 20-100 milliseconds. The results are cached at multiple levels, so subsequent requests are nearly instant.

### DNS Record Types: The Building Blocks

DNS records are like different types of entries in that phone book. Here are the ones you'll use constantly:

**A Record (Address Record)**
- Maps a domain name to an IPv4 address
- Example: `example.com` → `54.239.28.85`
- Think: "Address of my server"

**AAAA Record (IPv6 Address)**
- Maps a domain name to an IPv6 address
- Example: `example.com` → `2606:2800:220:1:248:1893:25c8:1946`
- Same as A record, but for IPv6 (the newer internet protocol)

**CNAME Record (Canonical Name)**
- Maps a domain name to another domain name (an alias)
- Example: `www.example.com` → `example.com`
- Think: "This name points to that other name"
- Useful for subdomains that should point to the same place as your main domain

**TXT Record (Text)**
- Stores arbitrary text
- Used for verification, email authentication (SPF, DKIM), and other metadata
- Example: `example.com` → `"v=spf1 include:_spf.google.com ~all"`

For this module, you'll primarily work with A records. CNAME records come up when you want `www.example.com` and `example.com` to point to the same server.

### TTL: Time To Live

Every DNS record has a TTL (Time To Live), specified in seconds. This tells caching systems "You can cache this answer for X seconds before checking again."

- **Low TTL (60 seconds):** Changes propagate quickly, but more DNS queries (slightly slower, more load)
- **High TTL (86400 seconds = 24 hours):** Fewer DNS queries, but changes take longer to propagate

When you're actively developing or migrating, use a low TTL (300 seconds). For stable production, you can increase it to 3600-86400 seconds.

### Understanding Check #2

Let's make sure the hierarchy makes sense. Imagine you run `example.com` and you want to add a subdomain for your blog at `blog.example.com`.

**Question 1:** What type of DNS record would you create, and what would it point to?

**Question 2:** If you set the TTL to 300 seconds and then change the IP address, approximately how long before all users worldwide see the new IP?

<details>
<summary>Click to reveal answers</summary>

**Answer 1:** You'd create an A record for `blog.example.com` pointing to your server's IP address. Alternatively, you could create a CNAME record pointing `blog.example.com` → `example.com` if the blog runs on the same server as your main site.

**Answer 2:** It depends on when someone last queried the DNS. In the worst case, someone queried 1 second before you made the change, so they'll have the old IP cached for another 299 seconds (about 5 minutes). In practice, full propagation takes 5-15 minutes with a 300-second TTL, accounting for various caching layers.

The key insight: DNS changes are not instant. They propagate over time as caches expire.
</details>

---

## Layer 3: Advanced Understanding - Cloudflare's Role

### Registrar vs DNS Provider: A Critical Distinction

This confuses many people, so let's clarify it with precision.

**Registrar:** The company you pay to reserve your domain name. They register it with the global domain registry (like ICANN for `.com` domains). Think of this as paying to put your name in the master phonebook.
- Examples: GoDaddy, Namecheap, Cloudflare Registrar, Google Domains
- Service: You pay annually to "own" the domain name
- Key responsibility: Storing which nameservers are authoritative for your domain

**DNS Provider:** The company that runs the nameservers that answer DNS queries for your domain. Think of this as who maintains the actual phone book entries.
- Examples: Cloudflare, AWS Route 53, Google Cloud DNS, your registrar's default DNS
- Service: Hosts your DNS records and responds to billions of DNS queries
- Key responsibility: Answering "What's the IP for `example.com`?" quickly and reliably

**You can mix and match.** You might:
- Buy your domain from Namecheap (registrar)
- But use Cloudflare for DNS (DNS provider)

The connection happens through **nameservers**. At your registrar, you specify which nameservers are authoritative for your domain. This tells the whole internet: "To find DNS records for `example.com`, ask these nameservers."

### Why Use Cloudflare as Your DNS Provider?

Your registrar typically offers DNS for free. So why switch to Cloudflare?

**1. Speed:** Cloudflare has 330+ data centers worldwide. When someone in Singapore looks up your domain, they hit a Cloudflare server in Singapore (sub-10ms response) rather than your registrar's server in the US (150ms+ response).

**2. Reliability:** Cloudflare's anycast network means if one data center goes down, queries automatically route to another. Your DNS stays online.

**3. Security:** Cloudflare offers DNSSEC (cryptographic validation of DNS responses), protection against DNS DDoS attacks, and DANE support.

**4. Features:** Once your DNS is on Cloudflare, you unlock all their edge features: proxy, caching, Workers, WAF, etc. DNS is the entry point to the Cloudflare ecosystem.

**5. Analytics:** See how many DNS queries you're getting, from where, and for which records.

For learning purposes, using Cloudflare DNS is essential because it's the foundation for everything else in this course. In production, it's genuinely one of the best DNS providers available (and the free tier is generous).

### The Orange Cloud vs Gray Cloud Decision

When you add an A record in Cloudflare, you'll see a cloud icon that can be orange or gray. This is a critical concept.

**Gray Cloud (DNS Only):**
- Cloudflare acts as a pure DNS provider
- DNS queries are answered by Cloudflare: "`example.com` points to `54.239.28.85`"
- Users connect directly to your server at that IP
- Cloudflare doesn't see or handle the HTTP traffic
- Use case: Non-web services, or when you want to manage HTTP yourself

**Orange Cloud (Proxied):**
- Cloudflare acts as a reverse proxy in front of your server
- DNS queries return Cloudflare's IP addresses (hiding your origin)
- Users connect to Cloudflare, which then connects to your origin server
- Cloudflare can cache, filter, accelerate, and protect your traffic
- Use case: Web traffic where you want Cloudflare's full feature set

We'll explore the orange cloud deeply in Module 3. For now, start with gray cloud to understand pure DNS behavior.

### Understanding Check #3

Let's test this important distinction:

**Scenario:** You bought `myapp.com` from GoDaddy. You want to use Cloudflare for DNS but keep GoDaddy as your registrar.

**Question 1:** What exactly do you need to change at GoDaddy?

**Question 2:** After making this change, who answers DNS queries for `myapp.com`?

**Question 3:** You create an A record at Cloudflare with gray cloud: `myapp.com` → `54.239.28.85`. When someone visits `http://myapp.com`, do they connect to Cloudflare's servers or your AWS server at that IP?

<details>
<summary>Click to reveal answers</summary>

**Answer 1:** You need to change the nameservers at GoDaddy to point to Cloudflare's nameservers (something like `chad.ns.cloudflare.com` and `michelle.ns.cloudflare.com`). This tells the internet: "For DNS info about `myapp.com`, ask Cloudflare, not GoDaddy."

**Answer 2:** Cloudflare answers the DNS queries. When anyone asks "What's the IP for `myapp.com`?", Cloudflare's nameservers respond.

**Answer 3:** They connect directly to your AWS server at `54.239.28.85`. With gray cloud, Cloudflare only handles DNS lookups, not the actual web traffic. Think of it like Cloudflare giving out your phone number, but you answer the call.
</details>

---

## Layer 4: Hands-On Practice - Setting Up Cloudflare DNS

Now we'll put theory into practice. You'll configure Cloudflare as your DNS provider and verify it's working correctly.

### Prerequisites Check

Before starting, ensure you have:
- ✅ A domain name (either bought through Cloudflare or from another registrar)
- ✅ Your Ubuntu server running from Module 0
- ✅ The server's public IP address
- ✅ SSH access to your Ubuntu server

### Installing DNS Tools

First, let's install `dig`, the standard tool for querying DNS. SSH into your Ubuntu server:

```bash
# Update package lists
sudo apt update

# Install dnsutils package (includes dig, nslookup, etc.)
sudo apt install -y dnsutils

# Verify installation
dig -v
```

You should see output like `DiG 9.18.x`. This confirms `dig` is installed.

### Understanding Your Current DNS Setup

Before changing anything, let's see your domain's current DNS configuration:

```bash
# Check your domain's current nameservers
# Replace 'example.com' with your actual domain
dig NS example.com

# Check your domain's current A record
dig A example.com

# Query a specific DNS server (Google's public DNS)
dig @8.8.8.8 example.com

# Get detailed trace of the DNS resolution path
dig +trace example.com
```

**What to look for:**

The `dig NS example.com` command shows your current nameservers. They might look like:
- `ns1.godaddy.com` (if you're using GoDaddy)
- `ns1.namecheap.com` (if you're using Namecheap)
- Or your registrar's default nameservers

**Save this output!** You'll compare it after switching to Cloudflare to see the change.

### Adding Your Domain to Cloudflare

Now let's add your domain to Cloudflare:

1. **Log into Cloudflare Dashboard:** Go to https://dash.cloudflare.com

2. **Add a Site:**
   - Click "Add a site" in the top right
   - Enter your domain (just `example.com`, not `www.example.com`)
   - Click "Add site"

3. **Select Plan:**
   - Choose "Free" plan (it's powerful enough for most use cases)
   - Click "Continue"

4. **Cloudflare Scans Your Existing DNS:**
   - Cloudflare will automatically scan your current DNS records
   - This might take 30-60 seconds
   - Review the records it found
   - Click "Continue"

5. **Cloudflare Provides Nameservers:**
   - You'll see two nameservers, like:
     - `chad.ns.cloudflare.com`
     - `michelle.ns.cloudflare.com`
   - **Write these down!** You'll need them for the next step

### Updating Nameservers at Your Registrar

This is where you actually switch from your registrar's DNS to Cloudflare's DNS.

**If you bought your domain through Cloudflare:**
- Nameservers are already set! Skip this section.

**If you bought your domain elsewhere (GoDaddy, Namecheap, etc.):**

Each registrar's interface is different, but the process is the same:

**General Steps:**
1. Log into your registrar's website
2. Find your domain management/DNS settings
3. Look for "Nameservers" or "Custom nameservers"
4. Change from default nameservers to custom
5. Enter the two Cloudflare nameservers you wrote down
6. Save changes

**Common Registrar Links:**
- **GoDaddy:** Domain Settings → Nameservers → Change → Custom
- **Namecheap:** Domain List → Manage → Nameservers → Custom DNS
- **Google Domains:** DNS → Name servers → Use custom name servers

**Important:** Changes can take 2-48 hours to propagate, though it's often much faster (15 minutes to 2 hours typically).

### Verifying the Nameserver Change

This is where `dig` becomes invaluable. You need to verify the nameserver change has propagated.

```bash
# Check if your domain is using Cloudflare nameservers
dig NS example.com

# You should see output containing:
# example.com.    3600    IN    NS    chad.ns.cloudflare.com.
# example.com.    3600    IN    NS    michelle.ns.cloudflare.com.
```

**If you still see your old nameservers:** Wait 15-30 minutes and try again. Nameserver changes propagate gradually across the internet's DNS infrastructure.

**If you see Cloudflare nameservers:** Success! Your domain is now using Cloudflare DNS.

### Creating Your First DNS Records

Now let's create some DNS records in Cloudflare:

1. **Go to Cloudflare Dashboard → DNS → Records**

2. **Create A record for your root domain:**
   - Type: A
   - Name: @ (this means the root domain, `example.com`)
   - IPv4 address: Your AWS server's public IP
   - Proxy status: **Gray cloud** (DNS only)
   - TTL: Auto
   - Click "Save"

3. **Create A record for www:**
   - Type: A
   - Name: www
   - IPv4 address: Your AWS server's public IP
   - Proxy status: **Gray cloud**
   - TTL: Auto
   - Click "Save"

4. **Create A record for a subdomain (e.g., api):**
   - Type: A
   - Name: api
   - IPv4 address: Your AWS server's public IP
   - Proxy status: **Gray cloud**
   - TTL: Auto
   - Click "Save"

### Testing Your DNS Records

Now let's verify these records are resolving correctly:

```bash
# Test root domain
dig example.com
# Should return your AWS server IP

# Test www subdomain
dig www.example.com
# Should return your AWS server IP

# Test api subdomain
dig api.example.com
# Should return your AWS server IP

# Check all records resolve to the same IP
dig +short example.com
dig +short www.example.com
dig +short api.example.com
# All three should show the same IP address
```

**Interpreting the Output:**

When you run `dig example.com`, look for the "ANSWER SECTION":

```
;; ANSWER SECTION:
example.com.    300    IN    A    54.239.28.85
```

This tells you:
- `example.com.` - The domain you queried
- `300` - TTL in seconds (how long to cache this answer)
- `IN` - Internet class (always IN)
- `A` - Record type
- `54.239.28.85` - The IP address

### Testing with Your Browser

If your Node.js server from Module 0 is still running on port 3000:

```bash
# Access via your domain
http://example.com:3000
http://www.example.com:3000
http://api.example.com:3000
```

All three should load your web server! You're now accessing your server using domain names instead of IP addresses.

### Common Issues and Debugging

**Problem: "dig example.com" returns NXDOMAIN (domain doesn't exist)**
- Solution: Nameservers haven't propagated yet. Wait 30 minutes and try again.

**Problem: "dig example.com" returns the old IP address**
- Solution: You might be hitting a cached result. Try `dig @1.1.1.1 example.com` to query Cloudflare's DNS directly. Or wait for TTL to expire.

**Problem: Browser can't connect to http://example.com:3000**
- Solution: Check your AWS security group allows inbound traffic on port 3000. Or check that your Node.js server is running with `ps aux | grep node`.

**Problem: www.example.com works but example.com doesn't (or vice versa)**
- Solution: Make sure you created both A records (one for `@` and one for `www`).

---

## Module 1 Checkpoint

Congratulations! You've completed Module 1. Before moving to Module 2, verify you can answer these questions:

### Knowledge Check

1. **Explain the purpose of DNS in one sentence.**
   <details>
   <summary>Answer</summary>
   DNS translates human-friendly domain names into IP addresses that computers use to connect to servers.
   </details>

2. **What's the difference between a domain registrar and a DNS provider?**
   <details>
   <summary>Answer</summary>
   A registrar is where you buy/register the domain name. A DNS provider hosts the nameservers that answer DNS queries. They're separate services that can be from different companies.
   </details>

3. **What command would you use to check which nameservers are authoritative for your domain?**
   <details>
   <summary>Answer</summary>
   `dig NS example.com` or `dig NS example.com +short` for just the nameserver names.
   </details>

4. **You create an A record with a 300-second TTL. How long might it take for DNS changes to fully propagate worldwide?**
   <details>
   <summary>Answer</summary>
   About 5-15 minutes in practice. The theoretical maximum is 300 seconds (5 minutes), but various caching layers mean real-world propagation is often 10-15 minutes.
   </details>

5. **What does the gray cloud icon mean when creating a DNS record in Cloudflare?**
   <details>
   <summary>Answer</summary>
   Gray cloud means "DNS only" mode. Cloudflare answers DNS queries with your actual server IP, but doesn't proxy the traffic. Users connect directly to your origin server.
   </details>

### Practical Verification

You should be able to successfully:
- ✅ Run `dig NS example.com` and see Cloudflare nameservers
- ✅ Run `dig example.com` and see your AWS server's IP address
- ✅ Visit `http://example.com:3000` in a browser and see your Node.js app
- ✅ Explain what happened behind the scenes when you typed that URL

### What You've Learned

By completing this module, you now understand:

- **The problem DNS solves** and why the internet depends on it
- **How DNS hierarchy works** from root servers down to authoritative nameservers
- **Key DNS record types** (A, AAAA, CNAME, TXT) and when to use each
- **The distinction** between domain registrars and DNS providers
- **How to use `dig`** to inspect and troubleshoot DNS records
- **How to configure Cloudflare** as your authoritative DNS provider
- **The gray cloud** (DNS-only mode) vs the orange cloud (proxied mode)

### Next Steps

You're now ready for **Module 2: Your First DNS Records**, where you'll:
- Explore DNS record management in depth
- Understand the orange cloud (proxied) mode
- See Cloudflare-specific headers that appear in proxied mode
- Learn about DNS record priority and routing

---

## Quick Reference: Essential Commands

```bash
# Check nameservers for a domain
dig NS example.com

# Check A record (IPv4 address)
dig A example.com

# Query a specific DNS server
dig @1.1.1.1 example.com

# Get just the IP address (short answer)
dig +short example.com

# Trace the full DNS resolution path
dig +trace example.com

# Check multiple record types at once
dig example.com ANY

# Check with detailed information
dig example.com +noall +answer
```

---

## Additional Resources

- [Cloudflare Learning Center: What is DNS?](https://www.cloudflare.com/learning/dns/what-is-dns/)
- [How DNS Works (Comic)](https://howdns.works/)
- [DNS RFC (Original Specification)](https://www.rfc-editor.org/rfc/rfc1035) - For the deeply curious

---

**Take a break! DNS is foundational and can be mentally taxing. Let this settle before moving to Module 2.**

*Created using the Deep Learning Framework methodology for systematic technical education*