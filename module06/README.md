# Module 6: How HTTP Caching Works

**Time Commitment:** 4-5 hours  
**Prerequisites:** Modules 0-5 completed, app running with HTTPS and origin protection  
**What You'll Build:** A deep understanding of HTTP caching, ability to control cache behavior, and a test suite to verify caching is working correctly

---

## Layer 1: The Intuitive Foundation - Why Caching Matters

### The Current State

After completing Module 5, you have an impressively secure setup:

- Full HTTPS encryption end-to-end
- Traffic proxied through Cloudflare's global network
- Origin server protected by multiple firewall layers
- DDoS protection and WAF active

But there's still a massive efficiency problem that caching solves.

### The Problem: Every Request Hits Your Server

Right now, when someone visits your site, here's what happens:

```
User in Tokyo visits your-domain.com
    ↓
Cloudflare edge server in Tokyo receives request
    ↓
Edge server thinks: "I need to ask the origin for this"
    ↓
Request travels from Tokyo → Mumbai (your AWS server)
    ↓
Your Node.js app processes the request
    ↓
Generates response, sends it back
    ↓
Response travels Mumbai → Tokyo
    ↓
User receives page
Total time: 300-500ms
```

**Now imagine 1,000 users in Tokyo all request the same page:**

```
1,000 requests travel: Tokyo → Mumbai → Tokyo
Your server processes the same request 1,000 times
You pay for bandwidth: 1,000 responses × size
Your server CPU: Working hard generating the same content 1,000 times
Total cost: High
Total server load: High
User experience: Slow (each waits 300-500ms)
```

This is wasteful. Your server is doing the exact same work 1,000 times to produce the exact same result.

### What Caching Does

Caching is like making photocopies. Instead of rewriting the same document 1,000 times by hand, you write it once and photocopy it 999 times.

**With caching enabled:**

```
First user in Tokyo visits your-domain.com
    ↓
Cloudflare edge in Tokyo: "I don't have this cached yet"
    ↓
Request travels Tokyo → Mumbai
    ↓
Your server generates response
    ↓
Response travels Mumbai → Tokyo
    ↓
Cloudflare edge server: "I'll save a copy of this"
    ↓
User receives page (300ms)
```

**Next 999 users in Tokyo request the same page:**

```
User requests page
    ↓
Cloudflare edge in Tokyo: "I have this cached!"
    ↓
Serves cached copy immediately
    ↓
User receives page (15ms)

Your server: Never even sees these requests
Bandwidth used: Zero (from your server)
Server CPU: Doing other work
Total cost: Massively reduced
User experience: 20x faster!
```

### Real-World Analogy: The Restaurant Kitchen

Think of your origin server as a restaurant kitchen, and Cloudflare's edge servers as satellite food trucks positioned around the city.

**Without caching (no food trucks):**

```
Customer in North City: "I want a burger"
    ↓ Drives 20 miles to main restaurant
Main kitchen: Makes burger
    ↓ Customer drives 20 miles back
Total time: 1 hour
```

Every customer, no matter where they are, drives to the main kitchen. The kitchen is overwhelmed making the same burgers over and over. Customers wait forever.

**With caching (food trucks deployed):**

```
First customer in North City: "I want a burger"
    ↓ Drives 20 miles to main restaurant
Main kitchen: Makes burger, sends recipe to North City food truck
    ↓ Customer drives 20 miles back
Total time: 1 hour

Next 999 customers in North City: "I want a burger"
    ↓ Walk 2 blocks to food truck
Food truck: Serves burger from pre-made batch (using main kitchen's recipe)
    ↓ Customer gets burger
Total time: 5 minutes each
```

The main kitchen (your origin) only makes the burger once. The food trucks (edge servers) serve copies to everyone nearby. The kitchen isn't overwhelmed, customers get served faster, and you save money on ingredients (bandwidth) and chef time (CPU).

### The Three Types of Costs Caching Reduces

Let me break down exactly what you save with caching:

**Cost 1: Bandwidth**

Every byte your server sends costs money. If you serve a 2MB image to 10,000 users:

```
Without caching:
    10,000 requests × 2MB = 20GB bandwidth
    AWS bandwidth: ~$0.12/GB in India
    Cost: $2.40 for one image!

With caching:
    Your server serves it once = 2MB
    Cloudflare serves the other 9,999 from cache
    Cost: $0.0002 (basically free)
```

For a popular site, this difference is hundreds or thousands of dollars per month.

**Cost 2: Server Resources (CPU/Memory)**

Every request your server handles consumes:

- CPU cycles to process the request
- Memory to generate the response
- Database queries (if needed)
- File system reads

```
Without caching:
    10,000 requests × 50ms CPU time = 500 seconds of CPU
    10,000 database queries
    Server might need to scale up to handle load

With caching:
    1 request × 50ms CPU time = 50ms
    1 database query
    Server stays small and cheap
```

**Cost 3: Time (User Experience)**

Time is money, especially for users. Every millisecond of delay reduces conversions and engagement.

```
Without caching:
    User in Singapore → Your server in Mumbai → Singapore
    Round trip: 200ms + processing time
    Total: 300-500ms per request

With caching:
    User in Singapore → Cloudflare Singapore (cached)
    Total: 10-30ms per request

10x-50x faster!
```

Studies show:

- 100ms of added latency = 1% drop in sales (Amazon)
- 2 seconds slower = 4.3% less revenue per visitor (Google)
- 53% of mobile users abandon sites that take >3 seconds (Google)

Caching directly improves your bottom line.

### What Can Be Cached vs What Shouldn't

Not everything should be cached. Understanding what to cache is critical.

**Should cache (static content):**

```
Images:           logo.png, banner.jpg
                 ✓ Never changes, cache forever

Stylesheets:      style.css
                 ✓ Changes rarely, cache for hours/days

JavaScript:       app.js, jquery.min.js
                 ✓ Changes with deployments, cache with version numbers

Fonts:            roboto.woff2
                 ✓ Never changes, cache forever

Videos:           demo.mp4
                 ✓ Large files, cache saves tons of bandwidth
```

**Should NOT cache (dynamic content):**

```
User dashboards:  /dashboard
                 ✗ Personal data, different for each user

Shopping carts:   /cart
                 ✗ Unique to each user, changes constantly

APIs with auth:   /api/user/profile
                 ✗ User-specific data

Live data:        /api/stock-price
                 ✗ Changes every second

Admin panels:     /admin
                 ✗ Sensitive, should bypass cache
```

**Can cache with care (semi-dynamic content):**

```
Blog posts:       /blog/my-post
                 ~ Content stable, cache for hours
                 ~ Invalidate when author updates

Product pages:    /products/laptop-x1
                 ~ Product details stable
                 ~ But stock count changes
                 ~ Cache page, but fetch stock dynamically with JS

Search results:   /search?q=cloudflare
                 ~ Same query = same results
                 ~ Cache per query string
                 ~ Expire after 10-30 minutes
```

The art of caching is knowing what to cache, for how long, and when to invalidate.

---

## Understanding Check #1

Before we dive into the mechanics, let's verify the foundation is solid:

**Question 1:** Your blog has a post that gets 50,000 views per day. The post is 500KB. Without caching, how much bandwidth does this single post consume daily? With caching (assuming content served once to edge, then cached), how much does your origin server actually send?

**Question 2:** You run an e-commerce site. Should you cache the product description page at `/products/laptop-x1`? What about the "Add to Cart" button click at `/api/cart/add`? Explain your reasoning for each.

**Question 3:** A user visits your homepage which is cached. They see content from 2 hours ago. The page has been updated since then, but they don't see the new version. Is this a bug or expected behavior? How would you handle this?

<details>
<summary>Click to reveal answers</summary>

**Answer 1:**
Without caching:

```
50,000 views × 500KB = 25,000,000 KB = 25GB per day
At ~$0.12/GB (AWS India): $3.00 per day = $90/month
Just for ONE blog post!
```

With caching:

```
Origin serves it once: 500KB
Cloudflare serves the other 49,999 from edge cache
Origin bandwidth: 500KB per day ≈ 0.0005GB
Cost: Basically free (< $0.01/month)

Savings: $89.99/month for one post!
```

For a site with 100 popular posts, caching saves $9,000/month in bandwidth alone. This doesn't even count the server CPU/memory savings or improved user experience.

**Answer 2:**

**Product page (`/products/laptop-x1`):** YES, cache it (with nuance)

Reasoning:

- Product title, description, specs, images rarely change
- Same for all users (not personalized)
- Can cache for 1-4 hours
- When product info changes, purge cache for that URL
- Stock count should be fetched dynamically via AJAX (don't cache that part)

Structure it like:

```html
<!-- This HTML is cached -->
<div class="product">
  <h1>Laptop X1</h1>
  <p>Description...</p>

  <!-- This is fetched fresh every time -->
  <div id="stock-status">
    <script>
      fetch("/api/stock/laptop-x1")
        .then((r) => r.json())
        .then((data) => {
          // Update stock display
        });
    </script>
  </div>
</div>
```

**Add to Cart API (`/api/cart/add`):** NO, never cache!

Reasoning:

- Every user's cart is different
- Action endpoint (modifies state)
- Must always hit origin to update database
- Caching this would show wrong cart counts or lose items
- Could even show User A's cart items to User B (security issue!)

APIs that modify data should always have `Cache-Control: no-store` headers.

**Answer 3:**

This is **expected behavior**, not a bug. Here's why:

When you set a cache TTL (Time To Live) of 2 hours, you're explicitly saying: "This content is valid for 2 hours, serve the cached version during that time even if the origin has newer content."

This is the fundamental tradeoff of caching:

- **Pro:** Lightning fast, no origin load, cheap
- **Con:** Users might see slightly stale content

How to handle it:

**Option 1: Shorter cache TTL**

- Set cache to 5-15 minutes for frequently updated content
- Balance: Still get caching benefits, but fresher content

**Option 2: Manual cache purge**

- When you publish an update, purge the cache for that URL
- Users immediately see new version on next request
- Best of both worlds: long cache + instant updates when needed

**Option 3: Cache with validation (ETag/Last-Modified)**

- Cache still stores copy, but checks with origin: "Is this still fresh?"
- If unchanged, origin says "304 Not Modified" (very fast, tiny response)
- If changed, origin sends new version

**Option 4: Accept staleness for some content**

- Blog posts from 2 years ago? Probably don't need updates every 5 minutes
- Cache for 24 hours, purge manually on rare edits

The right answer depends on your content:

- Live sports scores: 10-30 seconds
- News articles: 5-15 minutes
- Blog posts: 1-4 hours
- Static assets: Days or weeks (with versioned filenames)

There's no bug here - it's working as designed. The question is: did you design it right for your use case?

</details>

---

## Layer 2: Core Mechanics - How HTTP Caching Actually Works

### The Three-Tier Caching System

When you use Cloudflare with your browser, there are actually THREE caches in play:

```
Browser Cache
    ↓
Cloudflare Edge Cache
    ↓
Origin Server

Each one can store copies, each follows HTTP rules
```

Let me walk you through a request journey with caching:

**Request 1: First visitor (cache cold)**

```
Browser (no cache): "GET /style.css"
    ↓
Cloudflare Edge (no cache): "I don't have this, ask origin"
    ↓
Origin Server: "Here's style.css + Cache-Control: max-age=3600"
    ↓
Cloudflare Edge: "I'll store this for 3600 seconds (1 hour)"
    ↓
Browser: "I'll also store this for 1 hour"

Cache Status: MISS (not in Cloudflare cache)
```

**Request 2: Same visitor, 5 minutes later**

```
Browser (has cache): "I have style.css cached, still valid"
    ↓
Doesn't even make network request!
    ↓
Uses cached version from disk

No network traffic, instant load!
```

**Request 3: Different visitor (Browser cache empty, but Cloudflare has it)**

```
Browser (no cache): "GET /style.css"
    ↓
Cloudflare Edge (has cache): "I have this! Serving cached copy"
    ↓
Browser receives response (never touched origin)

Cache Status: HIT (found in Cloudflare cache)
Response time: 10-30ms
```

**Request 4: Different visitor, 2 hours later (cache expired)**

```
Browser (no cache): "GET /style.css"
    ↓
Cloudflare Edge (cache expired): "My copy is too old, ask origin again"
    ↓
Origin Server: "Here's style.css + Cache-Control: max-age=3600"
    ↓
Cloudflare Edge: "Refreshing my cache"
    ↓
Browser: "Storing in my cache"

Cache Status: EXPIRED (was cached, but TTL elapsed)
```

### Understanding HTTP Cache Headers

Caching behavior is controlled by HTTP headers that the origin server sends. These headers are instructions that tell browsers and CDNs what to cache and for how long.

**The Cache-Control Header (The Boss)**

This is the primary directive for caching:

```http
Cache-Control: public, max-age=3600
```

Let me break down what each part means:

**`public`** - "Anyone can cache this (browsers, CDNs, proxies)"

```
public = Cloudflare can cache, browser can cache, any proxy can cache
Good for: Images, CSS, JS, public content
```

**`private`** - "Only the user's browser can cache this, not CDNs"

```
private = Browser can cache, but Cloudflare shouldn't
Good for: User-specific pages, personalized content
```

**`no-cache`** - "You can store it, but always check with origin before using"

```
no-cache = Cache the file, but validate freshness on every request
Origin responds with 304 Not Modified if unchanged
Good for: Content that might change but doesn't always
```

**`no-store`** - "Never cache this anywhere, period"

```
no-store = Don't save this to disk, don't cache at all
Good for: Sensitive data, user dashboards, shopping carts
```

**`max-age=3600`** - "This is fresh for 3600 seconds (1 hour)"

```
max-age=3600 = Cache for 1 hour
max-age=86400 = Cache for 24 hours
max-age=31536000 = Cache for 1 year

Time is in seconds!
```

**Real examples:**

```http
# Static image - cache forever
Cache-Control: public, max-age=31536000, immutable

# CSS file - cache for a day
Cache-Control: public, max-age=86400

# API response - don't cache
Cache-Control: no-store, no-cache, must-revalidate

# User dashboard - browser only, short time
Cache-Control: private, max-age=300

# Blog post - cache but validate
Cache-Control: public, max-age=3600, must-revalidate
```

### ETag and Last-Modified (Smart Validation)

Sometimes you want caching but need to ensure freshness. That's where validation headers come in.

**Last-Modified Header:**

```http
Last-Modified: Mon, 15 Jan 2024 10:00:00 GMT
```

This tells the client when the resource was last changed.

**How it works:**

```
First request:
Browser → Server: "GET /article.html"
Server → Browser:
    Last-Modified: Mon, 15 Jan 2024 10:00:00 GMT
    [content]

Second request (cache expired):
Browser → Server:
    "GET /article.html"
    "If-Modified-Since: Mon, 15 Jan 2024 10:00:00 GMT"

Server checks: Has article changed since that date?
    ↓
If NO (not modified):
    Server → Browser: "304 Not Modified"
    (No content sent, browser uses cached version)
    Tiny response, very fast!

If YES (modified):
    Server → Browser: "200 OK" + new content + new Last-Modified
    Browser updates cache
```

**ETag (Entity Tag):**

An ETag is a unique identifier for a version of a resource. Think of it like a fingerprint or hash.

```http
ETag: "686897696a7c876b7e"
```

**How it works:**

```
First request:
Browser → Server: "GET /data.json"
Server → Browser:
    ETag: "abc123"
    [JSON data]

Second request:
Browser → Server:
    "GET /data.json"
    "If-None-Match: abc123"

Server checks: Is current ETag still "abc123"?
    ↓
If YES (match):
    Server → Browser: "304 Not Modified"
    (Content unchanged, use cache)

If NO (different ETag):
    Server → Browser: "200 OK"
    ETag: "def456"
    [New JSON data]
```

**When to use each:**

```
Last-Modified:
✓ Good for files that have timestamps
✓ Simple to implement
✗ Only 1-second precision
✗ Doesn't detect changes within same second

ETag:
✓ Detects any change, even within same second
✓ More accurate
✗ Requires computing hash (slightly more CPU)
✗ More complex to implement

Best practice: Use both!
```

### Understanding CF-Cache-Status Header

When you make a request to a Cloudflare-proxied site, Cloudflare adds a special header showing the cache status:

```http
CF-Cache-Status: HIT
```

Here are all the possible values and what they mean:

**`HIT`** - "Found in cache, served from edge"

```
✓ Request never touched your origin
✓ Fastest possible response
✓ This is what you want for static content!
```

**`MISS`** - "Not in cache, fetched from origin"

```
• First request for this resource
• Cache was purged
• Content not cacheable by default
→ Cloudflare will cache it now (if cacheable)
```

**`EXPIRED`** - "Was cached, but TTL elapsed"

```
• Content was in cache but max-age passed
• Cloudflare fetched fresh copy from origin
• Will now cache the new copy
```

**`DYNAMIC`** - "Not cached due to content type"

```
• HTML pages (by default)
• Content-Type not in Cloudflare's default cache list
• Can override with Page Rules to cache
```

**`BYPASS`** - "Intentionally not caching"

```
• Cache-Control: no-cache or no-store
• Set-Cookie header present
• Cloudflare Page Rule set to bypass cache
```

**`REVALIDATED`** - "Cache was validated and still fresh"

```
• Had cached copy
• Checked with origin (If-Modified-Since / If-None-Match)
• Origin said "304 Not Modified"
• Served cached copy
```

**Monitoring cache effectiveness:**

```bash
# Check cache status for multiple requests
for i in {1..5}; do
  curl -sI https://your-domain.com/style.css | grep "CF-Cache-Status"
  sleep 1
done

# Expected output:
# CF-Cache-Status: MISS    (first request)
# CF-Cache-Status: HIT     (second request)
# CF-Cache-Status: HIT     (third request)
# CF-Cache-Status: HIT     (fourth request)
# CF-Cache-Status: HIT     (fifth request)
```

If you see `MISS` every time, something's wrong with your caching setup.

### What Cloudflare Caches By Default

This is crucial to understand: **Cloudflare does NOT cache everything automatically.**

**Cached by default (based on file extension):**

```
Images:      .jpg, .jpeg, .png, .gif, .webp, .bmp, .svg, .ico
Styles:      .css
Scripts:     .js
Fonts:       .woff, .woff2, .ttf, .eot, .otf
Videos:      .mp4, .webm, .avi, .mpeg
Documents:   .pdf, .doc, .docx (but often set to bypass)
Archives:    .zip, .tar, .gz
```

**NOT cached by default:**

```
HTML:        .html, .htm (DYNAMIC status)
APIs:        Paths starting with /api/
Dynamic:     .php, .aspx, .jsp
No extension: /page, /product/123
```

**Why doesn't Cloudflare cache HTML by default?**

Because HTML is often dynamic and personalized:

```html
<!-- This HTML is different for each user -->
<header>
  Welcome back, John! ← User-specific You have 3 items in cart ← User-specific
</header>

<div class="content">
  Today's date: Jan 15, 2024 ← Time-sensitive Recommended for you: ←
  Personalized - Product A - Product B
</div>
```

If Cloudflare cached this HTML, User B might see "Welcome back, John!" and John's cart contents. Not good!

But **static HTML** (like blog posts) is perfectly safe to cache. You just need to tell Cloudflare to do it (we'll cover this in Module 7 with Page Rules).

### The Cache Key Concept

Cloudflare (and all caches) store content using a "cache key" - a unique identifier for each cached item.

**Default cache key:**

```
Protocol + Host + Path + Query String

Examples:
https://example.com/image.jpg
    → Cache key: "https://example.com/image.jpg"

https://example.com/search?q=cloudflare
    → Cache key: "https://example.com/search?q=cloudflare"

https://example.com/search?q=caching
    → Cache key: "https://example.com/search?q=caching"
    → Different cache key! Cached separately.
```

**Important implications:**

```
Same resource, different query strings = Different cache entries

/api/data?user=john      ← Cached separately
/api/data?user=mary      ← Cached separately
/api/data?user=alice     ← Cached separately

This is good for user-specific queries!
But means 3 cache entries instead of 1.
```

**Order matters in query strings (by default):**

```
/search?q=test&sort=new     ← Cache entry 1
/search?sort=new&q=test     ← Cache entry 2 (duplicate!)

Same results, but different cache keys
Wastes cache space
```

You can configure Cloudflare to normalize query strings, but that's advanced (Module 7).

---

## Understanding Check #2

Let's verify you understand the caching mechanics:

**Question 1:** Your server sends this header: `Cache-Control: public, max-age=7200`. A user requests the file at 10:00 AM. When will Cloudflare's edge cache consider this content expired and fetch a fresh copy from origin?

**Question 2:** You see these cache statuses in sequence for the same file from the same edge location:

```
Request 1: MISS
Request 2: HIT
Request 3: HIT
Request 4: MISS
```

What happened between Request 3 and Request 4 to cause the MISS?

**Question 3:** Your HTML file has this header: `Cache-Control: public, max-age=3600`. But every request shows `CF-Cache-Status: DYNAMIC`. Why isn't Cloudflare caching your HTML even though you set a cache header?

<details>
<summary>Click to reveal answers</summary>

**Answer 1:**

The content expires at **12:00 PM** (noon).

Here's the math:

```
max-age=7200 means cache for 7200 seconds
7200 seconds = 120 minutes = 2 hours

First request at 10:00 AM stores content in cache
Cache remains fresh until: 10:00 AM + 2 hours = 12:00 PM

Timeline:
10:00 AM - First request (MISS, now cached)
10:30 AM - Requests get HIT (still fresh)
11:45 AM - Requests get HIT (still fresh)
12:00 PM - Content expires
12:01 PM - Next request gets MISS or EXPIRED (fetches fresh from origin)
```

After fetching fresh content at 12:01 PM, the cache starts fresh again for another 2 hours (until 2:01 PM).

**Answer 2:**

Between Request 3 and Request 4, one of these happened:

**Option A: Cache was manually purged**

- Someone clicked "Purge Cache" in Cloudflare dashboard
- Or used API to purge specific URL
- Cache was intentionally cleared

**Option B: Content was updated at origin**

- If using `must-revalidate` or similar
- Cache checked with origin, got new version
- Depends on your exact configuration

**Option C: Cache expired naturally**

- TTL (max-age) elapsed between request 3 and 4
- Cache became stale
- Next request fetched fresh copy

**Option D: Evicted due to low popularity**

- Cloudflare edge caches have limited space
- If content is rarely accessed, it might get evicted to make room for more popular content
- LRU (Least Recently Used) eviction

Most likely it's Option A or C. The MISS means Cloudflare had to go back to origin, so the cached copy was either gone (purged/evicted) or too old (expired).

**Answer 3:**

Even though you set `Cache-Control: public, max-age=3600`, Cloudflare shows DYNAMIC because:

**HTML is not cached by default based on file extension**, regardless of cache headers!

Cloudflare's default caching policy:

```
File extension .html, .htm → DYNAMIC (bypass cache)
Even if Cache-Control says to cache it!
```

This is by design to prevent accidentally caching personalized content.

**To actually cache HTML, you need to:**

1. **Use a Page Rule** (Module 7):

   - Create rule: `*your-domain.com/*.html`
   - Set "Cache Level" to "Cache Everything"
   - Now HTML will respect Cache-Control headers

2. **Or use Workers** (Module 8):
   - Programmatically control caching
   - Override default behavior

Without explicit configuration telling Cloudflare "yes, cache this HTML," it will always show DYNAMIC status regardless of your cache headers.

The cache header is necessary but not sufficient for HTML caching. You need:

- Cache header from origin ✓ (you have this)
- Page Rule or Worker ✗ (missing this)

This is a common source of confusion! "I set cache headers but it's not caching!" - because default rules override headers for HTML.

</details>

---

## Layer 3: Advanced Understanding - Caching Strategies and Edge Cases

### The Caching Hierarchy and Invalidation

When you have multiple cache layers, invalidation (clearing the cache) becomes complex:

```
Cached in 3 places:
1. User's browser
2. Cloudflare edge (200+ locations)
3. ISP caches (sometimes)

When you update content, how do you clear all caches?
```

**The hard truth:** You can't easily clear browser caches. Once a browser caches something, it's cached until TTL expires or user manually clears it.

**Your control points:**

```
Your control:
✓ Cloudflare edge cache (you can purge via dashboard/API)
✓ Origin cache headers (you control max-age)
✗ Browser caches (users control this)
✗ ISP caches (they control this)
```

**Strategies to handle this:**

**Strategy 1: Short TTLs for frequently-updated content**

```http
Cache-Control: public, max-age=300
# 5 minutes - users see updates within 5 minutes
```

**Strategy 2: Cache busting with versioned URLs**

```html
<!-- Old version -->
<link rel="stylesheet" href="/style.css?v=1" />

<!-- New version - different URL, new cache entry! -->
<link rel="stylesheet" href="/style.css?v=2" />

Or with hash:
<link rel="stylesheet" href="/style.abc123.css" />
```

Because the URL changed, it's a new cache entry. Old cached pages still work (loading old CSS), new pages load new CSS.

**Strategy 3: Immutable + versioned URLs (best for static assets)**

```http
Cache-Control: public, max-age=31536000, immutable

# URL: /assets/app.abc123.js
# Cache for 1 year
# "immutable" = don't even validate, just use cached copy
```

When you deploy new version:

- Generate new hash: `app.def456.js`
- HTML references new URL
- Old version stays cached (harmless, no one links to it anymore)
- New version caches separately

**Strategy 4: Purge on update**

```
1. Update content at origin
2. Purge Cloudflare cache for that URL
3. Next request fetches fresh content
4. Cloudflare caches new version
```

### Conditional Requests and Bandwidth Savings

Even when cache expires, you can avoid re-downloading unchanged content:

**The smart revalidation dance:**

```
Browser has: style.css (ETag: "abc123", expired)

Browser → Cloudflare:
    GET /style.css
    If-None-Match: "abc123"

Cloudflare cache: Expired, must check origin

Cloudflare → Origin:
    GET /style.css
    If-None-Match: "abc123"

Origin checks: Is current ETag still "abc123"?
    Content hash: "abc123" (same!)

Origin → Cloudflare:
    304 Not Modified
    (No content body, just headers, ~200 bytes)

Cloudflare: "Content hasn't changed, my cached copy is still good"
    Updates TTL: Cache for another max-age period

Cloudflare → Browser:
    304 Not Modified

Browser: Uses cached copy

Bandwidth saved:
    Instead of transferring 50KB again
    Transferred only ~200 bytes
    250x smaller!
```

This is why ETags and Last-Modified headers are so powerful. Even "expired" caches can avoid full downloads.

### Cookies and Cache Busting

Cookies are a major cache complexity. Here's what you need to know:

**Cloudflare's cookie behavior:**

```
Request has Set-Cookie header → BYPASS cache
Request has Cookie header → Often BYPASS (depends on configuration)

Why?
Cookies often indicate:
- User is logged in
- Session active
- Personalized content
- Shopping cart data

Caching this would leak user data!
```

**Example scenario:**

```html
<!-- Login page sets cookie -->
Set-Cookie: session=abc123

<!-- Now user requests homepage -->
GET / Cookie: session=abc123 Cloudflare sees Cookie header → Bypasses cache
Fetches fresh from origin (which generates personalized page) This is correct
behavior!
```

**But it breaks caching for static content:**

```
<!-- Even your CSS request has cookies! -->
GET /style.css
Cookie: session=abc123

Cloudflare sees Cookie → Bypasses cache (even for CSS!)

This is problematic.
```

**Solutions:**

**Option 1: Serve static assets from cookieless domain**

```html
<!-- Main site has cookies -->
<html>
  <!-- Load CSS from separate domain without cookies -->
  <link rel="stylesheet" href="https://static.example.com/style.css" />
</html>

https://static.example.com doesn't set cookies → Cloudflare caches it normally
```

**Option 2: Configure Cloudflare to ignore cookies for static assets**

- Use Cache Rules or Page Rules
- Tell Cloudflare: "Cache \*.css even if cookies present"

**Option 3: Strip cookies with Workers**

```javascript
// Worker code (Module 8 will cover this)
addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // For static assets, create new request without cookies
  if (url.pathname.endsWith(".css") || url.pathname.endsWith(".js")) {
    const newRequest = new Request(request, {
      headers: new Headers(request.headers),
    });
    newRequest.headers.delete("Cookie");

    return fetch(newRequest);
  }

  return fetch(request);
});
```

### Query String Order and Cache Efficiency

Remember, cache key includes query string. Order matters:

```
/search?q=test&sort=date     → Cache entry A
/search?sort=date&q=test     → Cache entry B

Same results, duplicate cache entries!
```

**Cloudflare Cache Rules can normalize this:**

```
Sort query parameters alphabetically:
    Before: ?b=2&a=1&c=3
    After:  ?a=1&b=2&c=3

Always same cache key regardless of original order!
```

**Or ignore specific query parameters:**

```
Ignore tracking parameters:
    Original: /page?utm_source=twitter&utm_campaign=spring
    Cache as: /page

All tracking variations hit same cache entry
```

This dramatically improves cache hit rate.

### Vary Header and Cache Fragmentation

The `Vary` header tells caches to store different versions based on other headers:

```http
Vary: Accept-Encoding
```

This means: "Store separate cached copies for different encodings"

```
Request 1:
    Accept-Encoding: gzip
    → Cache stores gzipped version

Request 2:
    Accept-Encoding: br (Brotli)
    → Cache stores Brotli version

Request 3:
    Accept-Encoding: gzip
    → Cache hit! (gzipped version exists)
```

**Common Vary headers:**

```
Vary: Accept-Encoding
    Different cache per compression type
    Normal and expected

Vary: User-Agent
    Different cache per browser
    ⚠️ Fragments cache heavily (1000s of user agents!)
    Avoid if possible

Vary: Accept-Language
    Different cache per language
    Reasonable for multilingual sites

Vary: *
    Different cache for every request
    Essentially disables caching
    Avoid!
```

**Be careful with Vary:**

```
# Bad: Cache fragmentation nightmare
Vary: User-Agent, Accept-Language, Accept-Encoding

Why bad?
    Chrome + English + Gzip = Cache entry 1
    Chrome + Spanish + Gzip = Cache entry 2
    Firefox + English + Gzip = Cache entry 3
    Safari + English + Gzip = Cache entry 4
    Chrome + English + Brotli = Cache entry 5
    ... exponential explosion of cache entries!

Most content: Same regardless of user agent
Only vary when actually necessary
```

---

## Understanding Check #3

Let's test the advanced concepts:

**Question 1:** You deploy a new version of your CSS file. It's cached at Cloudflare edge with `max-age=86400` (24 hours). You need users to see the new version immediately. What are your three best options, and what are the tradeoffs of each?

**Question 2:** Your API endpoint `/api/user/profile` returns different data for each user (based on their authentication cookie). You accidentally set `Cache-Control: public, max-age=3600`. What's the security risk, and how does Cloudflare protect you by default?

**Question 3:** You have a search page: `/search?q=cloudflare&sort=recent&page=1`. Users can arrive at this URL with parameters in any order. Without cache key normalization, how many cache entries could theoretically exist for the same search results?

<details>
<summary>Click to reveal answers</summary>

**Answer 1:**

Three options to get users to see new CSS immediately:

**Option A: Purge Cloudflare cache**

```
Action:
    Dashboard → Caching → Configuration → Purge Everything
    Or: Purge by URL: https://your-domain.com/style.css

Pros:
    ✓ Immediate effect at Cloudflare edge
    ✓ Next request fetches new version
    ✓ Simple, one click

Cons:
    ✗ Browser caches still have old version (until their TTL expires)
    ✗ If you set browser cache to 24 hours, users wait 24 hours
    ✗ Purges ALL cached versions globally (slight performance hit)
```

**Option B: Change the URL (cache busting)**

```
Action:
    Old: <link href="/style.css">
    New: <link href="/style.css?v=2">
    Or:  <link href="/style.v2.css">

Pros:
    ✓ Bypasses ALL caches (Cloudflare AND browser)
    ✓ Users get new version on next page load
    ✓ Old version harmlessly stays cached
    ✓ Best practice for production

Cons:
    ✗ Requires updating HTML files that reference CSS
    ✗ If HTML is cached, still won't see new CSS
    ✗ Requires build process to generate version numbers
```

**Option C: Set very short TTL in the first place**

```
Original header: Cache-Control: public, max-age=86400 (24 hrs)
Better header:   Cache-Control: public, max-age=3600 (1 hr)

Pros:
    ✓ Users see updates within 1 hour automatically
    ✓ No manual purging needed

Cons:
    ✗ More origin requests (24x more in this case)
    ✗ Slightly higher bandwidth costs
    ✗ Less cache hit rate
    ✗ Doesn't help you RIGHT NOW (requires deployment before issue)
```

**Best practice combination:**

```
1. Use versioned URLs for static assets (Option B)
   <link href="/style.v2.abc123.css">

2. Cache these for 1 year with immutable
   Cache-Control: public, max-age=31536000, immutable

3. When you deploy:
   New version gets new URL automatically
   Old version stays cached (harmless)
   No purging needed!

This is how major sites handle it.
```

**Answer 2:**

The security risk is SEVERE - user data leakage:

**What would happen without protection:**

```
User Alice:
    Cookie: session=alice123
    Request: /api/user/profile
    Response: {name: "Alice", email: "alice@...", balance: "$1000"}
    Cloudflare caches this for 1 hour

User Bob (different user):
    Cookie: session=bob456
    Request: /api/user/profile
    Cloudflare: "I have /api/user/profile cached!"
    Returns: Alice's data!

Bob now sees Alice's name, email, and balance!
This is a critical security vulnerability.
```

**How Cloudflare protects you:**

Cloudflare has a default rule:

```
If response contains Set-Cookie header → BYPASS cache
If request contains Cookie header → Often BYPASS cache

For /api/* paths → Generally BYPASS by default
```

So even though you set `Cache-Control: public`, Cloudflare sees:

- This is an API endpoint
- Request has authentication cookie
- Response likely has Set-Cookie

Result: `CF-Cache-Status: BYPASS` - Cloudflare doesn't cache it.

**But don't rely on defaults!**

Best practice:

```javascript
// Explicitly set no-cache for user-specific content
app.get("/api/user/profile", (req, res) => {
  res.set("Cache-Control", "private, no-store, must-revalidate");
  res.json(getUserProfile(req.user));
});
```

Layers of protection:

1. Your code sets no-cache headers ✓
2. Cloudflare's smart defaults ✓
3. Defense in depth!

Never assume caching won't happen. Always explicitly control it for sensitive endpoints.

**Answer 3:**

With 3 parameters that can be in any order:

```
Parameters: q, sort, page
Number of orders: 3! (factorial) = 6

Possible URLs:
1. /search?q=cloudflare&sort=recent&page=1
2. /search?q=cloudflare&page=1&sort=recent
3. /search?sort=recent&q=cloudflare&page=1
4. /search?sort=recent&page=1&q=cloudflare
5. /search?page=1&q=cloudflare&sort=recent
6. /search?page=1&sort=recent&q=cloudflare

All return identical results, but create 6 separate cache entries!
```

**With 4 parameters:**

```
4! = 24 possible orderings = 24 cache entries
```

**With 5 parameters:**

```
5! = 120 possible orderings = 120 cache entries!
```

**The waste:**

```
Same search results cached 120 times
Cache storage wasted
Cache hit rate terrible (each ordering is rarely repeated)
More origin requests (lower hit rate)
```

**The solution (Cache Rules - Module 7):**

```
Sort query parameters alphabetically:
    All 120 variants → Same cache key
    ?a=1&b=2&c=3&d=4&e=5

Cache hit rate dramatically improved!
```

This is why query parameter normalization is so important for sites with complex URLs. Without it, cache efficiency tanks.

</details>

---

## Layer 4: Hands-On Practice - Building and Testing Cache Behavior

Now let's build a comprehensive test suite to see caching in action. We'll extend your existing `app.js` with endpoints specifically designed to demonstrate different caching behaviors.

### Step 1: Enhance Your Application with Cache Test Endpoints

Add these endpoints to your existing `app.js` file (after your current routes):

```javascript
// ========================================
// CACHING TEST ENDPOINTS
// ========================================

// 1. Static JavaScript - Should cache
app.get("/static.js", (req, res) => {
  res.set("Content-Type", "application/javascript");
  res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour

  const script = `
// Static JavaScript file
// Generated at: ${new Date().toISOString()}
console.log('This script was generated at ${new Date().toISOString()}');
console.log('If you see the same timestamp on refresh, it was cached!');

function showCacheInfo() {
  console.log('Script timestamp: ${new Date().toISOString()}');
  console.log('If timestamp doesn\'t match current time, this is from cache');
}

showCacheInfo();
  `;

  res.send(script);
});

// 2. Dynamic API - Should NOT cache
app.get("/api/time", (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.json({
    time: new Date().toISOString(),
    timestamp: Date.now(),
    message: "This should never be cached - always fresh from origin",
  });
});

// 3. HTML page - Won't cache by default (DYNAMIC status)
app.get("/page", (req, res) => {
  res.set("Content-Type", "text/html");
  res.set("Cache-Control", "public, max-age=3600");

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cache Test Page</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .timestamp-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <h1>HTML Page Cache Test</h1>
        <div class="timestamp-box">
          <h2>Generation Timestamp</h2>
          <p><strong>${new Date().toISOString()}</strong></p>
          <p>This page was generated at the timestamp above.</p>
        </div>
        
        <div class="warning">
          <strong>⚠️ Note:</strong> Even though this page has 
          <code>Cache-Control: public, max-age=3600</code>,
          Cloudflare will show <code>CF-Cache-Status: DYNAMIC</code>
          because HTML is not cached by default.
        </div>
        
        <p>To cache HTML, you need to:</p>
        <ol>
          <li>Create a Page Rule with "Cache Level: Cache Everything"</li>
          <li>Or use a Worker to override caching behavior</li>
        </ol>
        
        <p><a href="/page">Refresh this page</a> and check if timestamp changes.</p>
      </body>
    </html>
  `);
});

// 4. Image endpoint (simulated)
app.get("/test-image.png", (req, res) => {
  res.set("Content-Type", "image/png");
  res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours

  // For this demo, we'll send a simple 1x1 transparent PNG
  // In production, you'd send actual image data
  const transparentPNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  res.send(transparentPNG);
});

// 5. Search endpoint with query parameters
app.get("/search", (req, res) => {
  const query = req.query.q || "none";
  const sort = req.query.sort || "relevance";
  const page = req.query.page || "1";

  res.set("Cache-Control", "public, max-age=1800"); // Cache for 30 minutes

  res.json({
    query: query,
    sort: sort,
    page: page,
    timestamp: new Date().toISOString(),
    message:
      "This response should be cached per unique query string combination",
    cacheKey: `q=${query}&sort=${sort}&page=${page}`,
  });
});

// 6. ETag demonstration endpoint
let documentVersion = 1;
let documentContent = "This is version 1 of the document";

app.get("/document", (req, res) => {
  // Generate ETag based on version
  const etag = `"v${documentVersion}"`;

  // Check if client sent If-None-Match header
  const clientETag = req.get("If-None-Match");

  if (clientETag === etag) {
    // Content hasn't changed
    res.status(304).send(); // Not Modified
    return;
  }

  // Content changed or first request, send full response
  res.set("ETag", etag);
  res.set("Cache-Control", "public, max-age=60"); // Short TTL to test revalidation
  res.json({
    version: documentVersion,
    content: documentContent,
    timestamp: new Date().toISOString(),
  });
});

// 7. Update document endpoint (to test ETag changes)
app.post("/document/update", (req, res) => {
  documentVersion++;
  documentContent = `This is version ${documentVersion} of the document (updated at ${new Date().toISOString()})`;

  res.json({
    success: true,
    newVersion: documentVersion,
    message: "Document updated. Next request will get new ETag and content.",
  });
});

// 8. Last-Modified demonstration
const serverStartTime = new Date();

app.get("/info", (req, res) => {
  // Use server start time as Last-Modified
  const lastModified = serverStartTime.toUTCString();

  // Check if client sent If-Modified-Since
  const clientTime = req.get("If-Modified-Since");

  if (clientTime && new Date(clientTime) >= serverStartTime) {
    // Client's copy is up to date
    res.status(304).send();
    return;
  }

  // Send full response
  res.set("Last-Modified", lastModified);
  res.set("Cache-Control", "public, max-age=120");
  res.json({
    serverStartTime: serverStartTime.toISOString(),
    currentTime: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    message: "Server info - uses Last-Modified header",
  });
});

// 9. Cache status dashboard
app.get("/cache-dashboard", (req, res) => {
  const isCF = isBehindCloudflare(req);

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cache Testing Dashboard</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 30px auto;
            padding: 20px;
            background: #f0f2f5;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
          }
          .test-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin: 20px 0;
          }
          .test-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .test-card h3 {
            margin-top: 0;
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
          }
          .endpoint {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            margin: 10px 0;
            word-break: break-all;
          }
          .expected {
            background: #e7f3ff;
            border-left: 4px solid #2196f3;
            padding: 10px;
            margin: 10px 0;
          }
          .command {
            background: #1e1e1e;
            color: #4ec9b0;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
            margin: 10px 0;
            overflow-x: auto;
          }
          .instructions {
            background: #fff9e6;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          button {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin: 5px;
          }
          button:hover {
            background: #5568d3;
          }
          #results {
            background: #1e1e1e;
            color: #4ec9b0;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            margin: 20px 0;
            min-height: 100px;
            max-height: 400px;
            overflow-y: auto;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔍 Cache Testing Dashboard</h1>
          <p>Interactive testing suite for Cloudflare caching behavior</p>
        </div>

        ${
          !isCF
            ? `
          <div class="instructions">
            <strong>⚠️ Warning:</strong> You're accessing this directly (not through Cloudflare proxy).
            Cache testing requires Cloudflare to be active. Make sure:
            <ul>
              <li>DNS records are set to Orange Cloud (proxied)</li>
              <li>You're accessing via your domain, not IP</li>
            </ul>
          </div>
        `
            : ""
        }

        <div class="test-grid">
          <div class="test-card">
            <h3>1. Static JavaScript (Should Cache)</h3>
            <div class="endpoint">/static.js</div>
            <div class="expected">
              <strong>Expected:</strong><br>
              • First request: CF-Cache-Status: MISS<br>
              • Second request: CF-Cache-Status: HIT<br>
              • Timestamp should NOT change on second request
            </div>
            <button onclick="testEndpoint('/static.js', 'Static JS')">Test Now</button>
            <div class="command">curl -I https://your-domain.com/static.js</div>
          </div>

          <div class="test-card">
            <h3>2. Dynamic API (Should NOT Cache)</h3>
            <div class="endpoint">/api/time</div>
            <div class="expected">
              <strong>Expected:</strong><br>
              • Every request: CF-Cache-Status: BYPASS<br>
              • Timestamp always current<br>
              • Cache-Control: no-store
            </div>
            <button onclick="testEndpoint('/api/time', 'Dynamic API')">Test Now</button>
            <div class="command">curl https://your-domain.com/api/time</div>
          </div>

          <div class="test-card">
            <h3>3. HTML Page (DYNAMIC by Default)</h3>
            <div class="endpoint">/page</div>
            <div class="expected">
              <strong>Expected:</strong><br>
              • CF-Cache-Status: DYNAMIC<br>
              • Even with Cache-Control header<br>
              • HTML not cached without Page Rule
            </div>
            <button onclick="testEndpoint('/page', 'HTML Page')">Test Now</button>
            <div class="command">curl -I https://your-domain.com/page</div>
          </div>

          <div class="test-card">
            <h3>4. Image (Should Cache Long)</h3>
            <div class="endpoint">/test-image.png</div>
            <div class="expected">
              <strong>Expected:</strong><br>
              • First request: MISS<br>
              • Second request: HIT<br>
              • Cached for 24 hours
            </div>
            <button onclick="testEndpoint('/test-image.png', 'Image')">Test Now</button>
            <div class="command">curl -I https://your-domain.com/test-image.png</div>
          </div>

          <div class="test-card">
            <h3>5. Search with Query Params</h3>
            <div class="endpoint">/search?q=test&sort=new</div>
            <div class="expected">
              <strong>Expected:</strong><br>
              • Different query strings = different cache entries<br>
              • Same query string = cache HIT
            </div>
            <button onclick="testEndpoint('/search?q=cloudflare&sort=new', 'Search 1')">Test Query 1</button>
            <button onclick="testEndpoint('/search?q=cloudflare&sort=old', 'Search 2')">Test Query 2</button>
          </div>

          <div class="test-card">
            <h3>6. ETag Validation</h3>
            <div class="endpoint">/document</div>
            <div class="expected">
              <strong>Expected:</strong><br>
              • First request: 200 OK with ETag<br>
              • Repeat with If-None-Match: 304 Not Modified<br>
              • Update content: ETag changes
            </div>
            <button onclick="testEndpoint('/document', 'Document')">Test Document</button>
            <button onclick="updateDocument()">Update Document</button>
          </div>
        </div>

        <h2>📊 Test Results</h2>
        <div id="results">Click a test button to see results here...</div>

        <div class="instructions">
          <h3>💡 How to Use This Dashboard</h3>
          <ol>
            <li>Click any "Test Now" button to make a request</li>
            <li>Results show the response headers and cache status</li>
            <li>Click same button again to test cache HIT behavior</li>
            <li>Use browser DevTools Network tab for more details</li>
            <li>Compare results with expected behavior</li>
          </ol>
          
          <h3>🔧 Testing from Command Line</h3>
          <p>For more control, use curl commands shown in each card:</p>
          <div class="command">
# Test cache status<br>
curl -I https://your-domain.com/static.js | grep CF-Cache-Status<br>
<br>
# Test multiple times<br>
for i in {1..3}; do<br>
  echo "Request $i:"<br>
  curl -sI https://your-domain.com/static.js | grep CF-Cache-Status<br>
  sleep 1<br>
done
          </div>
        </div>

        <script>
          const resultsDiv = document.getElementById('results');
          
          function log(message) {
            const timestamp = new Date().toLocaleTimeString();
            resultsDiv.innerHTML += \`[\${timestamp}] \${message}\\n\`;
            resultsDiv.scrollTop = resultsDiv.scrollHeight;
          }
          
          function clearLog() {
            resultsDiv.innerHTML = '';
          }
          
          async function testEndpoint(path, name) {
            log(\`\\n=== Testing: \${name} ===\`);
            log(\`URL: \${path}\`);
            
            try {
              const response = await fetch(path);
              
              log(\`Status: \${response.status} \${response.statusText}\`);
              
              // Show important headers
              const headers = {
                'CF-Cache-Status': response.headers.get('CF-Cache-Status'),
                'CF-Ray': response.headers.get('CF-Ray'),
                'Cache-Control': response.headers.get('Cache-Control'),
                'ETag': response.headers.get('ETag'),
                'Last-Modified': response.headers.get('Last-Modified'),
                'Content-Type': response.headers.get('Content-Type')
              };
              
              for (const [key, value] of Object.entries(headers)) {
                if (value) {
                  log(\`\${key}: \${value}\`);
                }
              }
              
              // Try to show response body if JSON
              const contentType = response.headers.get('Content-Type');
              if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                log(\`Body: \${JSON.stringify(data, null, 2)}\`);
              }
              
              log(\`✓ Test completed\`);
              
            } catch (error) {
              log(\`✗ Error: \${error.message}\`);
            }
          }
          
          async function updateDocument() {
            log(\`\\n=== Updating Document ===\`);
            try {
              const response = await fetch('/document/update', {
                method: 'POST'
              });
              const data = await response.json();
              log(\`Document updated to version \${data.newVersion}\`);
              log(\`Next /document request will have new ETag\`);
            } catch (error) {
              log(\`✗ Error: \${error.message}\`);
            }
          }
          
          // Initial message
          log('Cache Testing Dashboard Ready');
          log('Click any test button to begin');
          log('');
        </script>
      </body>
    </html>
  `);
});
```

### Step 2: Restart Your Application

```bash
# If using PM2
sudo pm2 restart cloudflare-inspector

# Or if running directly
sudo node app.js
```

Verify it starts successfully:

```bash
sudo pm2 logs cloudflare-inspector --lines 20
```

### Step 3: Access the Cache Testing Dashboard

Visit the dashboard:

```
https://your-domain.com/cache-dashboard
```

You should see an interactive testing interface with cards for each cache test scenario.

### Step 4: Testing Cache Behavior with curl

While the dashboard is convenient, let's also test from the command line for precise control:

**Test 1: Static JavaScript (Should Cache)**

```bash
# First request - should be MISS
curl -I https://your-domain.com/static.js

# Look for these headers:
# CF-Cache-Status: MISS
# Cache-Control: public, max-age=3600
# Content-Type: application/javascript
```

Wait 2 seconds, then:

```bash
# Second request - should be HIT
curl -I https://your-domain.com/static.js

# Look for:
# CF-Cache-Status: HIT  ← Served from cache!
```

**Test 2: Dynamic API (Should NOT Cache)**

```bash
# Multiple requests - all should be BYPASS
for i in {1..3}; do
  echo "Request $i:"
  curl -s https://your-domain.com/api/time | jq .
  sleep 1
done

# Each timestamp should be different
# Check headers:
curl -I https://your-domain.com/api/time
# CF-Cache-Status: BYPASS
# Cache-Control: no-store, no-cache, must-revalidate
```

**Test 3: HTML Page (DYNAMIC Status)**

```bash
# Even with cache headers, HTML shows DYNAMIC
curl -I https://your-domain.com/page

# Look for:
# CF-Cache-Status: DYNAMIC  ← Not cached by default
# Cache-Control: public, max-age=3600  ← Header is there but ignored
```

**Test 4: Image (Should Cache)**

```bash
# First request
curl -I https://your-domain.com/test-image.png
# CF-Cache-Status: MISS

# Second request
curl -I https://your-domain.com/test-image.png
# CF-Cache-Status: HIT  ← Images cache by default
```

**Test 5: Query String Variations**

```bash
# Request 1 - First query
curl -s "https://your-domain.com/search?q=cloudflare&sort=new" | jq .

# Request 2 - Same query (should cache)
curl -I "https://your-domain.com/search?q=cloudflare&sort=new" | grep CF-Cache-Status
# Should show: HIT

# Request 3 - Different query (different cache entry)
curl -I "https://your-domain.com/search?q=caching&sort=new" | grep CF-Cache-Status
# Should show: MISS (new cache entry)

# Request 4 - Same query as #3
curl -I "https://your-domain.com/search?q=caching&sort=new" | grep CF-Cache-Status
# Should show: HIT
```

**Test 6: ETag Validation**

```bash
# First request - Get ETag
curl -I https://your-domain.com/document
# Note the ETag value: ETag: "v1"

# Request with If-None-Match
curl -I -H 'If-None-Match: "v1"' https://your-domain.com/document
# Should return: 304 Not Modified (content hasn't changed)

# Update the document
curl -X POST https://your-domain.com/document/update

# Request again with old ETag
curl -I -H 'If-None-Match: "v1"' https://your-domain.com/document
# Should return: 200 OK (content changed, new ETag: "v2")
```

### Step 5: Testing with Browser DevTools

Open your browser's DevTools (F12) and go to the Network tab:

**Test Static JavaScript:**

1. Visit `https://your-domain.com/static.js`
2. In Network tab, click on the `static.js` request
3. Go to "Headers" tab
4. Look for:
   - `CF-Cache-Status: MISS` (first time)
5. Refresh the page (F5)
6. Check again:
   - `CF-Cache-Status: HIT` (served from cache!)
7. Look at the "Size" column:
   - First request: "2.3 KB" (transferred)
   - Second request: "(from disk cache)" or shows cache hit

**Test Cache with Disable Cache:**

1. In DevTools Network tab, check "Disable cache" checkbox
2. Refresh page
3. Every request shows MISS because DevTools is sending `Cache-Control: no-cache`
4. Uncheck "Disable cache"
5. Refresh again - back to HIT

**Test Query Strings:**

1. Visit `https://your-domain.com/search?q=test`
2. Note CF-Cache-Status: MISS
3. Refresh - CF-Cache-Status: HIT
4. Change URL to `https://your-domain.com/search?q=different`
5. CF-Cache-Status: MISS (different cache key!)

### Step 6: Manual Cache Purging

Let's test manual cache purging:

**Test scenario:**

```bash
# 1. Request file - gets cached
curl https://your-domain.com/static.js

# 2. Verify it's cached
curl -I https://your-domain.com/static.js
# CF-Cache-Status: HIT
```

**Now purge cache:**

1. **Cloudflare Dashboard → Caching → Configuration**
2. **Click "Purge Cache"**
3. **Choose one:**
   - **Purge Everything** - Clears all cached content (affects entire site)
   - **Purge by URL** - Clears specific URLs
4. **For testing, use "Purge by URL":**
   - Enter: `https://your-domain.com/static.js`
   - Click "Purge"

**Verify purge worked:**

```bash
# Request again immediately after purge
curl -I https://your-domain.com/static.js
# CF-Cache-Status: MISS  ← Cache was cleared!

# Request again
curl -I https://your-domain.com/static.js
# CF-Cache-Status: HIT  ← Now cached again
```

### Step 7: Understanding Cache Statistics

Visit Cloudflare Dashboard → Caching → Cache Insights:

You'll see:

- **Total Requests**
- **Cached Requests** (HIT)
- **Uncached Requests** (MISS, DYNAMIC, BYPASS)
- **Cache Hit Ratio** (percentage)

**Good cache hit ratios:**

```
Excellent: 95%+   (Most content cached)
Good:      80-95% (Decent caching)
Fair:      60-80% (Room for improvement)
Poor:      <60%   (Check your cache strategy)
```

If your ratio is low:

- More content might be DYNAMIC (HTML not cached)
- Too many unique URLs (query strings)
- Short cache TTLs
- Cookies present on static assets
- Need Page Rules to cache more

---

## Practical Exercises

### Exercise 1: Cache Hit Ratio Analysis

Create a script to test cache efficiency:

```bash
#!/bin/bash
# cache-hit-test.sh

URL="https://your-domain.com"

echo "Testing cache hit ratio over 20 requests..."
echo ""

hits=0
misses=0
total=20

for i in $(seq 1 $total); do
  status=$(curl -sI "$URL/static.js" | grep "CF-Cache-Status" | awk '{print $2}' | tr -d '\r')

  echo "Request $i: $status"

  if [ "$status" = "HIT" ]; then
    ((hits++))
  else
    ((misses++))
  fi

  sleep 0.5
done

echo ""
echo "Results:"
echo "--------"
echo "Hits: $hits"
echo "Misses: $misses"
echo "Hit Ratio: $(( hits * 100 / total ))%"
```

Run it:

```bash
chmod +x cache-hit-test.sh
./cache-hit-test.sh
```

Expected: First request MISS, all others HIT = 95% hit ratio

### Exercise 2: Cache Key Experimentation

Test how query parameters affect caching:

```bash
# Create different query string combinations
curl -I "https://your-domain.com/search?q=test&sort=new" | grep CF-Cache-Status
# MISS

curl -I "https://your-domain.com/search?q=test&sort=new" | grep CF-Cache-Status
# HIT (same query string)

curl -I "https://your-domain.com/search?sort=new&q=test" | grep CF-Cache-Status
# MISS! (different order = different cache key)

curl -I "https://your-domain.com/search?q=test&sort=new&page=2" | grep CF-Cache-Status
# MISS (additional parameter = different cache key)
```

This demonstrates why query string normalization matters.

### Exercise 3: ETag Workflow

Simulate a real content update workflow:

```bash
# 1. Get current document version
curl https://your-domain.com/document | jq .
# version: 1

# 2. Make note of ETag
ETAG=$(curl -sI https://your-domain.com/document | grep -i "etag" | awk '{print $2}' | tr -d '\r')
echo "Current ETag: $ETAG"

# 3. Request with If-None-Match
curl -I -H "If-None-Match: $ETAG" https://your-domain.com/document
# 304 Not Modified (efficient!)

# 4. Update content
curl -X POST https://your-domain.com/document/update

# 5. Request again with old ETag
curl -I -H "If-None-Match: $ETAG" https://your-domain.com/document
# 200 OK (content changed, ETag mismatch)

# 6. Get new content
curl https://your-domain.com/document | jq .
# version: 2 (updated!)
```

This shows conditional requests saving bandwidth.

### Exercise 4: Browser Cache vs Edge Cache

Test the difference between browser and edge caching:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Visit:** `https://your-domain.com/static.js`
3. **DevTools Network:**
   - Size: "2.3 KB" (downloaded)
   - CF-Cache-Status: MISS or HIT
4. **Refresh (F5):**
   - Size: "(disk cache)"
   - Request might not even reach Cloudflare!
5. **Hard refresh (Ctrl+F5):**
   - Bypasses browser cache
   - Hits Cloudflare edge
   - CF-Cache-Status: HIT (from edge)
6. **Wait 1 hour (max-age expires), then refresh:**
   - Browser cache expired
   - Cloudflare cache might still be valid
   - Fetches from Cloudflare edge (HIT)

This demonstrates the two-tier caching system.

---

## Troubleshooting Guide

### Problem: All Requests Show BYPASS

**Symptom:** `CF-Cache-Status: BYPASS` on every request, even for static.js

**Possible causes:**

1. **Cookies present on request:**

```bash
# Check if cookies are being sent
curl -I -v https://your-domain.com/static.js 2>&1 | grep Cookie
```

**Solution:** Serve static assets from cookieless subdomain or use Cache Rules to ignore cookies

2. **Development mode enabled:**

   - Cloudflare Dashboard → Caching → Configuration
   - Check "Development Mode" is OFF

3. **Page Rule overriding cache:**

   - Dashboard → Rules → Page Rules
   - Check if any rules set "Bypass Cache"

4. **Origin sending no-cache headers:**

```bash
# Check what headers origin is sending
curl -I http://YOUR_AWS_IP/static.js
# Make sure Cache-Control is public, max-age=...
```

### Problem: HTML Still Shows DYNAMIC

**Symptom:** `/page` endpoint has Cache-Control but shows CF-Cache-Status: DYNAMIC

**Cause:** This is **expected behavior**. HTML is not cached by default.

**Solution:**

- This is correct for now
- Module 7 will show how to cache HTML with Page Rules
- For now, understand this is intentional

### Problem: Cache HIT on First Request

**Symptom:** First request shows HIT instead of MISS

**Possible causes:**

1. **Already cached from previous test:**

   - Purge cache and try again

2. **Another user/location cached it:**

   - Cloudflare has 200+ edge locations
   - If someone in your region cached it, you get HIT

3. **Tiered Cache enabled:**
   - Advanced Cloudflare feature
   - Edge asks another Cloudflare datacenter before origin

**Verification:**

```bash
# Purge cache
# Then immediately test
curl -I https://your-domain.com/static.js
# Should show MISS now
```

### Problem: Query String Tests All Show MISS

**Symptom:** Same query string keeps showing MISS

**Diagnosis:**

```bash
# Test exact same URL multiple times
for i in {1..3}; do
  curl -I "https://your-domain.com/search?q=test" | grep CF-Cache-Status
done

# Should see:
# MISS
# HIT
# HIT
```

**If all MISS:**

1. **Check Cache-Control header:**

```bash
curl -I "https://your-domain.com/search?q=test" | grep Cache-Control
# Should be: public, max-age=1800
```

2. **Check response size:**

   - Very large responses (>512MB) might not cache
   - Check: `curl -I "..." | grep Content-Length`

3. **Check for cookies:**
   - Set-Cookie header prevents caching
   - Check: `curl -I "..." | grep Set-Cookie`

### Problem: ETag Not Working

**Symptom:** Always get 200 OK, never 304 Not Modified

**Check header capitalization:**

```bash
# Wrong (lowercase e)
curl -I -H "if-none-match: \"v1\"" https://your-domain.com/document

# Right (proper capitalization)
curl -I -H "If-None-Match: \"v1\"" https://your-domain.com/document
```

**Check ETag format:**

```bash
# ETag should be in quotes
ETag: "v1"      ✓ Correct
ETag: v1        ✗ Wrong
```

**Verify endpoint is sending ETag:**

```bash
curl -I https://your-domain.com/document | grep -i etag
# Should see: ETag: "v1"
```

### Problem: Purge Doesn't Work

**Symptom:** After purging cache, still seeing HIT

**Diagnosis:**

1. **Check purge was successful:**

   - Dashboard shows "Purge successful"
   - Wait 5-10 seconds before testing

2. **Browser cache interfering:**

   - Browser might still serve from disk cache
   - Test with curl instead of browser
   - Or hard refresh (Ctrl+F5)

3. **Purged wrong URL:**

```bash
# These are different URLs:
https://your-domain.com/static.js      ← URL 1
https://www.your-domain.com/static.js  ← URL 2 (different!)

# Make sure you purged the exact URL you're testing
```

4. **Query string variations:**

```bash
# These are different cache entries:
/search?q=test
/search?q=test&page=1

# Purging one doesn't purge the other
```

**Solution:** Use "Purge Everything" for testing to clear all variations.

---

## What You've Accomplished

Congratulations! You've built a comprehensive understanding of HTTP caching. You now know:

✅ **Why caching matters** - bandwidth savings, performance, user experience  
✅ **The three-tier cache system** - browser, Cloudflare edge, origin  
✅ **HTTP cache headers** - Cache-Control, max-age, public/private, no-cache/no-store  
✅ **ETag and Last-Modified** - conditional requests and bandwidth savings  
✅ **CF-Cache-Status values** - HIT, MISS, EXPIRED, DYNAMIC, BYPASS, REVALIDATED  
✅ **What Cloudflare caches by default** - images, CSS, JS (but NOT HTML)  
✅ **Cache keys and query strings** - how parameters affect caching  
✅ **Testing cache behavior** - using curl, browser DevTools, and custom dashboard  
✅ **Manual cache purging** - clearing cached content when needed

### Your Current Architecture

```
User Request
    ↓
Browser Cache (if previously visited)
    ↓ (if not in browser cache)
Cloudflare Edge Cache
    ↓ (if MISS/EXPIRED)
Your Origin Server
    ↓
Response with Cache-Control headers
    ↓
Cached at edge (if cacheable)
    ↓
Cached in browser (if cacheable)
    ↓
User sees page
```

**Cache efficiency gains:**

```
Before caching:
    1000 requests = 1000 origin hits
    Bandwidth: High
    Server load: High
    User experience: Slow

After caching:
    1000 requests = 1 origin hit + 999 edge serves
    Bandwidth: 99.9% reduction
    Server load: 99.9% reduction
    User experience: 20x faster
```

### The Path Forward

In **Module 7: Controlling the Cache**, you'll learn:

- Page Rules to cache HTML ("Cache Everything")
- Custom cache TTLs per URL pattern
- Cache bypass for specific paths
- Browser vs Edge cache TTL differences
- Advanced cache key manipulation

Before moving on, ensure you can:

- Explain the difference between public and private cache directives
- Demonstrate cache HIT vs MISS with curl
- Understand why HTML shows DYNAMIC by default
- Use ETags for conditional requests
- Purge cache manually when needed

---

## Quick Reference

### Common Cache-Control Directives

```http
# Cache for 1 hour, anyone can cache
Cache-Control: public, max-age=3600

# Cache for 5 minutes, browser only
Cache-Control: private, max-age=300

# Never cache, always revalidate
Cache-Control: no-store, no-cache, must-revalidate

# Cache for 1 year, never revalidate
Cache-Control: public, max-age=31536000, immutable
```

### CF-Cache-Status Values

```
HIT         - Served from Cloudflare cache
MISS        - Not in cache, fetched from origin
EXPIRED     - Was cached but TTL elapsed
DYNAMIC     - Not cached (default for HTML)
BYPASS      - Intentionally not caching
REVALIDATED - Validated with origin, still fresh
```

### Testing Commands

```bash
# Check cache status
curl -I https://your-domain.com/file | grep CF-Cache-Status

# Test multiple times
for i in {1..3}; do
  curl -sI https://your-domain.com/file | grep CF-Cache-Status
  sleep 1
done

# Test with ETag
curl -I -H 'If-None-Match: "etag-value"' https://your-domain.com/file

# Test with If-Modified-Since
curl -I -H 'If-Modified-Since: Mon, 15 Jan 2024 10:00:00 GMT' https://your-domain.com/file
```

### Default Caching by Extension

```
Cached:      .jpg, .png, .gif, .css, .js, .woff, .woff2, .svg, .ico
Not Cached:  .html, .htm, .php, /api/* paths

Override with Page Rules or Workers
```

---

## Additional Resources

**Cloudflare Documentation:**

- [Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/)
- [How Caching Works](https://developers.cloudflare.com/cache/concepts/cache-control/)
- [Edge Cache TTL](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/)

**HTTP Caching Standards:**

- [RFC 7234 - HTTP Caching](https://tools.ietf.org/html/rfc7234)
- [MDN - HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)

**Tools:**

- [RedBot - Cache Header Analyzer](https://redbot.org/)
- [Cloudflare Cache Analytics](https://www.cloudflare.com/analytics/)

---

**Excellent work!** You now understand how HTTP caching works at a deep level. Take a break before Module 7, where we'll learn to control and customize caching behavior with Page Rules!

**Next:** Module 7 - Controlling the Cache (3-4 hours)

_Created using the Deep Learning Framework methodology - Building performance through intelligent caching_ 🚀
