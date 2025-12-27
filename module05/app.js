// app.js - Enhanced for HTTPS support

// ============================================================================
// IMPORTS
// ============================================================================
const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const ipaddr = require("ipaddr.js");

// ============================================================================
// CONFIGURATION
// ============================================================================
const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const SSL_CERT_PATH = "/etc/ssl/cloudflare/cert.pem";
const SSL_KEY_PATH = "/etc/ssl/cloudflare/key.pem";

// ============================================================================
// APP INITIALIZATION
// ============================================================================
const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Checks if the request is coming through Cloudflare proxy
 * @param {Object} req - Express request object
 * @returns {boolean} - True if CF-Ray header is present
 */
function isBehindCloudflare(req) {
  return req.get("CF-Ray") !== undefined;
}

/**
 * Gets a header value from the request with a default fallback
 * @param {Object} req - Express request object
 * @param {string} headerName - Name of the header to retrieve
 * @param {string} defaultValue - Default value if header is not present
 * @returns {string} - Header value or default
 */
function getHeader(req, headerName, defaultValue = "Not present") {
  return req.get(headerName) || defaultValue;
}

/**
 * Checks if the request is using HTTPS
 * @param {Object} req - Express request object
 * @returns {boolean} - True if HTTPS is detected
 */
function isHTTPS(req) {
  return (
    req.secure ||
    req.get("X-Forwarded-Proto") === "https" ||
    req.get("CF-Visitor") === '{"scheme":"https"}'
  );
}

/**
 * Checks if an IP address is within a CIDR range (supports both IPv4 and IPv6)
 * @param {string} ip - IP address to check
 * @param {string} cidr - CIDR notation (e.g., "192.168.1.0/24" or "2400:cb00::/32")
 * @returns {boolean} - True if IP is in CIDR range
 */
function isIPInCIDR(ip, cidr) {
  try {
    const [network, prefixLength] = cidr.split('/');
    const ipAddr = ipaddr.process(ip);
    const networkAddr = ipaddr.process(network);

    // Ensure both IPs are of the same type
    if (ipAddr.kind() !== networkAddr.kind()) {
      return false;
    }

    // Check if IP is within the CIDR range
    return ipAddr.match(networkAddr, parseInt(prefixLength, 10));
  } catch (error) {
    // Invalid IP or CIDR format
    return false;
  }
}

/**
 * Checks if source IP is from Cloudflare's IP ranges using CIDR notation
 * Supports both IPv4 and IPv6 addresses
 * @param {string} sourceIP - Source IP address (IPv4 or IPv6)
 * @returns {boolean} - True if IP matches Cloudflare ranges
 */
function isFromCloudflareIP(sourceIP) {
  // Cloudflare IPv4 ranges in CIDR notation
  const cloudflareIPv4CIDRs = [
    '173.245.48.0/20',
    '103.21.244.0/22',
    '103.22.200.0/22',
    '103.31.4.0/22',
    '141.101.64.0/18',
    '108.162.192.0/18',
    '190.93.240.0/20',
    '188.114.96.0/20',
    '197.234.240.0/22',
    '198.41.128.0/17',
    '162.158.0.0/15',
    '104.16.0.0/13',
    '104.24.0.0/14',
    '172.64.0.0/13',
    '131.0.72.0/22'
  ];

  // Cloudflare IPv6 ranges in CIDR notation
  const cloudflareIPv6CIDRs = [
    '2400:cb00::/32',
    '2606:4700::/32',
    '2803:f800::/32',
    '2405:b500::/32',
    '2405:8100::/32',
    '2a06:98c0::/29',
    '2c0f:f248::/32'
  ];

  // Combine all CIDR ranges
  const cloudflareCIDRs = [...cloudflareIPv4CIDRs, ...cloudflareIPv6CIDRs];

  return cloudflareCIDRs.some(cidr => isIPInCIDR(sourceIP, cidr));
}

/**
 * Returns explanation text for security headers
 * @param {string} header - Header name
 * @returns {string} - Explanation HTML
 */
function getHeaderExplanation(header) {
  const explanations = {
    "Strict-Transport-Security":
      "<p><small>Forces HTTPS connections. Enable via Cloudflare HSTS.</small></p>",
    "X-Content-Type-Options":
      "<p><small>Prevents MIME type sniffing. Add via Cloudflare Page Rules or Workers.</small></p>",
    "X-Frame-Options":
      "<p><small>Prevents clickjacking. Cloudflare can add this via Transform Rules.</small></p>",
    "X-XSS-Protection":
      "<p><small>Legacy XSS protection (modern browsers use CSP instead).</small></p>",
    "Content-Security-Policy":
      "<p><small>Controls which resources can load. Advanced security feature.</small></p>",
  };
  return explanations[header] || "";
}

// ============================================================================
// ROUTES - Health Check
// ============================================================================

/**
 * GET /health
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    https: isHTTPS(req),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// ROUTES - API Endpoints (JSON)
// ============================================================================

/**
 * GET /api/ssl-status
 * ----------------------------------------------
 * Returns SSL/TLS status details for the current request as JSON.
 * 
 * - Indicates whether the request is using HTTPS (isHTTPS)
 * - Detects if the request is passing through Cloudflare proxy (via headers)
 * - Reports if the origin connection is encrypted (req.socket.encrypted)
 * - Provides the protocol in use (http or https)
 * - Returns a summary of relevant proxy/SSL headers:
 *     - X-Forwarded-Proto
 *     - CF-Visitor (Cloudflare SSL info)
 *     - CF-Ray (Cloudflare trace)
 *
 * Pseudo code:
 * 
 * On GET /api/ssl-status:
 *    Determine if request uses HTTPS
 *    Check if Cloudflare proxy headers are present
 *    Get whether the Node.js server connection is encrypted (socket)
 *    Collect protocol information (http or https)
 *    Collect important SSL/proxy headers
 *    Respond with all fields as a JSON object
 */
app.get("/api/ssl-status", (req, res) => {
  res.json({
    https: isHTTPS(req),
    behindCloudflare: isBehindCloudflare(req),
    originEncrypted: req.socket.encrypted || false,
    protocol: req.protocol,
    headers: {
      "X-Forwarded-Proto": getHeader(req, "X-Forwarded-Proto", null),
      "CF-Visitor": getHeader(req, "CF-Visitor", null),
      "CF-Ray": getHeader(req, "CF-Ray", null),
    },
  });
});

/**
 * GET /api/headers
 * ------------------------------------------------------
 * Returns a comprehensive set of headers and request info, including Cloudflare-specific data, as JSON.
 *
 * - Detects if the request is coming through Cloudflare by checking for expected headers
 * - Collects all common Cloudflare headers:
 *     - CF-Ray: Cloudflare's unique identifier for the request
 *     - CF-Connecting-IP: The real client IP as seen by Cloudflare
 *     - CF-IPCountry: The country associated with the client IP
 *     - CF-Visitor: Cloudflare visitor protocol JSON string
 *     - CF-Request-ID: Optional unique identifier from Cloudflare
 * - Provides general request context like hostname, protocol, method, path, and IP details
 * - Includes a "realIP" field using 'CF-Connecting-IP' if present, or falls back to req.ip
 * - Returns all raw headers as received by Node.js for transparency
 * - Also returns a timestamp for reference
 *
 * Pseudo code:
 * 
 * On GET /api/headers:
 *    For each relevant Cloudflare header (CF-Ray, CF-Connecting-IP, CF-IPCountry, CF-Visitor, CF-Request-ID):
 *      Fetch the header from the request (if present, else null)
 *    Determine if request is behind Cloudflare using isBehindCloudflare(req)
 *    Build requestInfo object with hostname, protocol, method, path, ip, realIP (prefer CF-Connecting-IP)
 *    Attach allHeaders (raw request headers)
 *    Respond with a JSON object containing:
 *      - behindCloudflare
 *      - cloudflareHeaders
 *      - requestInfo
 *      - allHeaders
 *      - timestamp
 */
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

/**
 * GET /api/protection-status
 * 
 * This API endpoint provides JSON information about whether the server's origin is protected behind Cloudflare,
 * and whether direct (unprotected) access is possible.
 *
 * - Checks if the request is coming through Cloudflare using the presence of CF-* headers.
 * - Determines if the direct source IP is one of Cloudflare's known IP ranges.
 * - Includes the sourceIP (the IP address seen by Node.js), and, if present, the real client IP as seen by Cloudflare via the CF-Connecting-IP header.
 * - Includes the Cloudflare Ray ID (if available), and a timestamp.
 * - The resulting JSON is useful for automated status checking or external tools.
 * 
 * Pseudo code:
 *   On GET /api/protection-status:
 *     isCF = isBehindCloudflare(req)
 *     sourceIP = req.ip
 *     isFromCloudflare = isFromCloudflareIP(sourceIP)
 *     clientIP = getHeader(req, 'CF-Connecting-IP', null)
 *     cfRay = getHeader(req, 'CF-Ray', null)
 *     timestamp = new Date().toISOString()
 *     Respond with JSON:
 *       {
 *         protected: isCF && isFromCloudflare,
 *         behindCloudflare: isCF,
 *         sourceIPFromCloudflare: isFromCloudflare,
 *         sourceIP: sourceIP,
 *         clientIP: clientIP,
 *         cfRay: cfRay,
 *         timestamp: timestamp
 *       }
 */
app.get('/api/protection-status', (req, res) => {
  const isCF = isBehindCloudflare(req);
  const sourceIP = req.ip;
  const isFromCloudflare = isFromCloudflareIP(sourceIP);

  res.json({
    protected: isCF && isFromCloudflare,
    behindCloudflare: isCF,
    sourceIPFromCloudflare: isFromCloudflare,
    sourceIP: sourceIP,
    clientIP: getHeader(req, 'CF-Connecting-IP', null),
    cfRay: getHeader(req, 'CF-Ray', null),
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// ROUTES - HTML Pages (Diagnostic)
// ============================================================================

/**
 * GET /
 * 
 * Renders the home/diagnostic page for checking SSL/TLS and Cloudflare proxy status.
 * 
 * This route provides a detailed HTML dashboard that visually shows:
 *   - Whether the request is proxied by Cloudflare or coming direct to origin, using CF-* headers
 *   - If the request is using HTTPS (secure transport) or not
 *   - The encryption status and protocol details for both browser→proxy and proxy→origin
 *   - Connection/meta info like request headers, Cloudflare info (Ray ID, country, connecting IP)
 *   - UI warnings, next steps, and next diagnostics
 *   - The raw request headers for troubleshooting
 * 
 * Useful for quickly diagnosing SSL configs, seeing security headers, and confirming Cloudflare protection is active.
 * 
 * Pseudo code:
 *   On GET "/":
 *     behindCF = isBehindCloudflare(req)
 *     usingHTTPS = isHTTPS(req)
 *     Render HTML page which includes:
 *       - Section showing detection of HTTP vs HTTPS usage
 *       - If behindCF, display Cloudflare-specific info (CF-Ray, country, connecting IP, etc)
 *       - SSL/TLS protocol and encryption info for the current connection
 *       - Raw request headers
 *       - Info/warnings if not protected via Cloudflare or not using HTTPS
 *       - UI status badges (secure/insecure/proxied/etc)
 */
app.get("/", (req, res) => {
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
          <span class="status-badge ${usingHTTPS ? "https-yes" : "https-no"}">
            ${usingHTTPS ? "✅ HTTPS Enabled" : "❌ HTTP Only"}
          </span>
          <span class="status-badge ${behindCF ? "proxied" : "direct"}">
            ${behindCF ? "🟠 Proxied through Cloudflare" : "⚪ Direct connection"}
          </span>

          <div class="security-check">
            <span class="check-icon">${usingHTTPS ? "✅" : "❌"}</span>
            <div>
              <strong>Browser → Cloudflare encryption:</strong>
              ${usingHTTPS ? "Encrypted (HTTPS)" : "Not encrypted (HTTP)"}
            </div>
          </div>

          <div class="security-check">
            <span class="check-icon">${behindCF && req.socket.encrypted ? "✅" : "❌"}</span>
            <div>
              <strong>Cloudflare → Origin encryption:</strong>
              ${req.socket.encrypted ? "Encrypted (Origin has SSL)" : "Not encrypted (Origin on HTTP)"}
            </div>
          </div>

          ${usingHTTPS && req.socket.encrypted
      ? `
            <div class="success">
              <strong>🎉 Perfect! Full end-to-end encryption is active.</strong><br>
              Both connections (Browser→CF and CF→Origin) are encrypted.
            </div>
          `
      : !usingHTTPS
        ? `
            <div class="warning">
              <strong>⚠️ Warning: No HTTPS detected</strong><br>
              You're accessing this page over HTTP. Data is not encrypted.
              Try accessing via <a href="https://${req.hostname}">https://${req.hostname}</a>
            </div>
          `
        : `
            <div class="warning">
              <strong>⚠️ Partial encryption</strong><br>
              Browser to Cloudflare is encrypted, but Cloudflare to origin might not be.
            </div>
          `
    }
        </div>

        <div class="card">
          <h2>🔍 SSL/TLS Details</h2>
          <pre>${JSON.stringify(
      {
        protocol: req.protocol,
        secure: req.secure,
        "X-Forwarded-Proto": getHeader(req, "X-Forwarded-Proto", null),
        "CF-Visitor": getHeader(req, "CF-Visitor", null),
        socketEncrypted: req.socket.encrypted || false,
        tlsVersion: req.socket.encrypted
          ? req.socket.getProtocol()
          : "N/A",
      },
      null,
      2,
    )}</pre>
        </div>

        ${behindCF
      ? `
          <div class="card">
            <h2>☁️ Cloudflare Information</h2>
            <div class="info">
              <strong>CF-Ray:</strong> ${getHeader(req, "CF-Ray")}<br>
              <strong>Country:</strong> ${getHeader(req, "CF-IPCountry")}<br>
              <strong>Connecting IP:</strong> ${getHeader(req, "CF-Connecting-IP")}<br>
              <strong>Visitor Protocol:</strong> ${getHeader(req, "CF-Visitor")}
            </div>
          </div>
        `
      : ""
    }

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
              <li>Browser sees: ${usingHTTPS ? "🔒 Secure (HTTPS)" : "⚠️ Not Secure (HTTP)"}</li>
              <li>Origin connection: ${req.socket.encrypted ? "🔒 Encrypted" : "❌ Unencrypted"}</li>
            </ul>
          </div>
        </div>

        <div class="card">
          <h2>🎯 Next Steps</h2>
          ${!usingHTTPS
      ? `
            <div class="warning">
              <p><strong>You should be using HTTPS!</strong></p>
              <ol>
                <li>Visit <a href="https://${req.hostname}">https://${req.hostname}</a> instead</li>
                <li>Enable "Always Use HTTPS" in Cloudflare SSL/TLS settings</li>
              </ol>
            </div>
          `
      : !req.socket.encrypted
        ? `
            <div class="warning">
              <p><strong>Origin server should use HTTPS!</strong></p>
              <ol>
                <li>Install SSL certificate on origin</li>
                <li>Configure Node.js to use HTTPS</li>
                <li>Set Cloudflare to "Full (Strict)" mode</li>
              </ol>
            </div>
          `
        : `
            <div class="success">
              <p><strong>✅ Your setup is secure!</strong></p>
              <p>Both connections are encrypted. Great job!</p>
            </div>
          `
    }
        </div>
      </body>
    </html>
  `);
});

/**
 * GET /mixed-content-test
 * ----------------------------------------------
 * Serves a test page to help users verify if their browser/browser settings and the site
 * properly handle "mixed content" — i.e., when an HTTPS site embeds resources (like images) via HTTP.
 * - If loaded over HTTPS, shows two images:
 *     - One loaded over HTTPS (should always work)
 *     - One loaded over HTTP (modern browsers block or warn about this)
 * - If loaded over HTTP, tells user to use HTTPS.
 *
 * This page is useful for site owners/staff to confirm HSTS, proper redirects, and browser security.
 *
 * Pseudocode:
 *   On GET /mixed-content-test:
 *     Determine if request is using HTTPS (isSecure = isHTTPS(req))
 *     If HTTPS:
 *       Render page with:
 *         - HTTPS image (loads)
 *         - HTTP image (should trigger a browser warning or block)
 *         - Text explanations
 *     Else:
 *       Render page with message: test only works over HTTPS; suggest correct URL.
 */
app.get("/mixed-content-test", (req, res) => {
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
  
          ${isSecure
      ? `
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
          `
      : `
            <div class="test-item">
              <p>⚠️ This test only works when accessing via HTTPS</p>
              <p>Visit: <a href="https://${req.hostname}/mixed-content-test">https://${req.hostname}/mixed-content-test</a></p>
            </div>
          `
    }
  
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

/**
 * GET /security-headers
 * ------------------------------------------------------------------
 * This route inspects and displays the values of common security-related HTTP headers
 * that are present in the response from the origin server or set via a reverse proxy (such as Cloudflare).
 * It provides a user-friendly HTML summary showing whether each header is present, its value,
 * and a brief explanation for each security header.
 *
 * Security headers checked include:
 *  - Strict-Transport-Security
 *  - X-Content-Type-Options
 *  - X-Frame-Options
 *  - X-XSS-Protection
 *  - Content-Security-Policy
 *
 * The purpose of this route is to let users or administrators quickly verify
 * that recommended security headers are enabled and see their content.
 *
 * Pseudocode:
 * 
 * On GET /security-headers:
 *   For each security header of interest:
 *     - Retrieve its value from the request headers (as received by the server)
 *   For all checked headers:
 *     - Mark whether present or missing
 *     - Show its value (if present)
 *     - Display an explanation of its purpose
 *   Render an HTML page showing the summary table/list of all headers and their status
 */

app.get("/security-headers", (req, res) => {
  const securityHeaders = {
    "Strict-Transport-Security": req.get("Strict-Transport-Security"),
    "X-Content-Type-Options": req.get("X-Content-Type-Options"),
    "X-Frame-Options": req.get("X-Frame-Options"),
    "X-XSS-Protection": req.get("X-XSS-Protection"),
    "Content-Security-Policy": req.get("Content-Security-Policy"),
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
          ${Object.entries(securityHeaders)
      .map(
        ([header, value]) => `
            <div class="header-item ${value ? "present" : "missing"}">
              <strong>${value ? "✅" : "❌"} ${header}</strong><br>
              ${value ? `<code>${value}</code>` : "<em>Not present</em>"}
              ${getHeaderExplanation(header)}
            </div>
          `,
      )
      .join("")}
        </body>
      </html>
    `);
});

/**
 * GET /cert-info
 * 
 * This route displays the SSL/TLS certificate information for the current connection.
 * It is only available on HTTPS (encrypted) connections.
 * If accessed over HTTP (unencrypted), it responds with a page indicating that SSL is not enabled.
 * On HTTPS requests, it retrieves the peer certificate from the underlying socket and displays:
 *   - The subject details of the certificate (who the certificate was issued to)
 *   - The issuer details (who issued the certificate)
 *   - The period during which the certificate is valid
 *   - The full certificate object as JSON for detailed inspection
 * 
 * Pseudo code:
 * 
 * if (the request is not over an encrypted connection)
 *     respond with a page stating "No SSL on Origin"
 *     return
 * certificate = get the peer certificate from the request socket
 * respond with HTML page displaying:
 *     - certificate subject
 *     - certificate issuer
 *     - validity period
 *     - full certificate details (as JSON)
 */
app.get("/cert-info", (req, res) => {
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

/**
 * GET /cert-info
 * -------------------------------------------
 * Returns details about the SSL certificate used for the current (origin) connection.
 * 
 * - If the connection is not encrypted (not HTTPS on the origin), display a message explaining that the info is unavailable.
 * - If the connection is encrypted, retrieve the peer SSL certificate information from the socket and display:
 *     - Subject (to whom the certificate was issued)
 *     - Issuer (who issued the certificate)
 *     - Validity period
 *     - The full certificate object (all available certificate fields)
 * - Output is formatted as a user-friendly HTML page with all relevant certificate data.
 * 
 * Pseudo code:
 * 
 * if (connection is not HTTPS/secure) {
 *     render simple HTML page stating "No SSL on Origin"
 * } else {
 *     cert = get certificate from req.socket
 *     render HTML page showing:
 *         - cert subject
 *         - cert issuer
 *         - cert valid_from/to
 *         - full cert object
 * }
 */
app.get('/origin-protection', (req, res) => {
  const isCF = isBehindCloudflare(req);
  const sourceIP = req.ip;
  const isFromCloudflare = isFromCloudflareIP(sourceIP);

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Origin Protection Status</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 900px;
            margin: 30px auto;
            padding: 20px;
            background: #f5f7fa;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 20px;
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
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            margin: 10px 0;
          }
          .protected {
            background: #10b981;
            color: white;
          }
          .exposed {
            background: #ef4444;
            color: white;
          }
          .warning {
            background: #f59e0b;
            color: white;
          }
          .info-box {
            background: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
          }
          .success-box {
            background: #f0fdf4;
            border-left: 4px solid #22c55e;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
          }
          .warning-box {
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
          }
          .danger-box {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
          }
          ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          li {
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🛡️ Origin Protection Status</h1>
          <p>Security Configuration Checker</p>
        </div>

        <div class="card">
          <h2>🔒 Protection Status</h2>
          
          ${isCF && isFromCloudflare ? `
            <span class="status-badge protected">
              ✅ FULLY PROTECTED
            </span>
            
            <div class="success-box">
              <strong>Excellent! Your origin is properly protected.</strong>
              <ul>
                <li>✅ Traffic is flowing through Cloudflare</li>
                <li>✅ Source IP is from Cloudflare's ranges</li>
                <li>✅ Direct IP access is likely blocked by firewall</li>
                <li>✅ CF-* headers are present</li>
              </ul>
              <p><strong>This request came from Cloudflare IP:</strong> ${sourceIP}</p>
            </div>
          ` : !isCF ? `
            <span class="status-badge exposed">
              ❌ ORIGIN EXPOSED
            </span>
            
            <div class="danger-box">
              <strong>⚠️ Critical: Direct access detected!</strong>
              <p>You accessed this server directly, bypassing Cloudflare. This means:</p>
              <ul>
                <li>❌ Your origin IP is accessible to anyone who knows it</li>
                <li>❌ No DDoS protection</li>
                <li>❌ No WAF protection</li>
                <li>❌ No caching benefits</li>
                <li>❌ Origin protection is NOT configured</li>
              </ul>
              <p><strong>Your IP:</strong> ${sourceIP}</p>
              <p><strong>Action needed:</strong> Configure AWS Security Groups and UFW to only allow Cloudflare IPs!</p>
            </div>
          ` : `
            <span class="status-badge warning">
              ⚠️ PARTIAL PROTECTION
            </span>
            
            <div class="warning-box">
              <strong>Configuration may need review</strong>
              <p>Traffic is going through Cloudflare, but source IP doesn't match known Cloudflare ranges.</p>
              <ul>
                <li>✅ CF-* headers present (proxied traffic)</li>
                <li>⚠️ Source IP unexpected: ${sourceIP}</li>
              </ul>
              <p>This could mean:</p>
              <ul>
                <li>Cloudflare added new IP ranges</li>
                <li>You're using a Cloudflare tunnel</li>
                <li>Load balancer or proxy in front of origin</li>
              </ul>
            </div>
          `}
        </div>

        <div class="card">
          <h2>🔍 Connection Details</h2>
          <div class="info-box">
            <p><strong>Request Source IP:</strong> ${sourceIP}</p>
            <p><strong>Real Client IP:</strong> ${getHeader(req, 'CF-Connecting-IP', 'N/A')}</p>
            <p><strong>Cloudflare Ray ID:</strong> ${getHeader(req, 'CF-Ray', 'N/A')}</p>
            <p><strong>Client Country:</strong> ${getHeader(req, 'CF-IPCountry', 'N/A')}</p>
            <p><strong>Protocol:</strong> ${req.protocol.toUpperCase()}</p>
            <p><strong>Hostname:</strong> ${req.hostname}</p>
          </div>
        </div>

        <div class="card">
          <h2>🔍 How to Test Protection</h2>
          <div class="info-box">
            <p><strong>To verify your origin is protected:</strong></p>
            <ol>
              <li>Access via domain: <code>https://your-domain.com/origin-protection</code><br>
                  <em>Should show "FULLY PROTECTED"</em></li>
              <li>Try direct IP access: <code>https://YOUR_IP/origin-protection</code><br>
                  <em>Should timeout/fail (connection blocked by firewall)</em></li>
              <li>If direct IP works, your firewall rules need configuration</li>
            </ol>
          </div>
        </div>

        ${isCF && isFromCloudflare ? `
          <div class="card">
            <h2>✅ Security Checklist</h2>
            <div class="success-box">
              <p>Your origin protection is configured correctly! Here's what's protecting you:</p>
              <ul>
                <li>✅ <strong>DNS Protection:</strong> Domain resolves to Cloudflare IPs only</li>
                <li>✅ <strong>Proxy Active:</strong> Traffic flows through Cloudflare edge</li>
                <li>✅ <strong>Firewall Rules:</strong> Only Cloudflare IPs can reach origin</li>
                <li>✅ <strong>HTTPS:</strong> End-to-end encryption active</li>
                <li>✅ <strong>Headers Present:</strong> Cloudflare is adding security headers</li>
              </ul>
              <p><strong>Additional recommendations:</strong></p>
              <ul>
                <li>Test direct IP access periodically</li>
                <li>Update Cloudflare IP ranges every 3-6 months</li>
                <li>Monitor firewall logs for blocked attempts</li>
                <li>Keep SSH restricted to your IP only</li>
                <li>Consider AWS Session Manager for SSH access</li>
              </ul>
            </div>
          </div>
        ` : ''}

        <div class="card">
          <h2>📊 Raw Headers</h2>
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(req.headers, null, 2)}</pre>
        </div>
      </body>
    </html>
  `);
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

// Load SSL certificates
let sslOptions;
try {
  sslOptions = {
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_CERT_PATH),
  };
  console.log("✅ SSL certificates loaded successfully");
} catch (error) {
  console.log("⚠️  SSL certificates not found, running HTTP only");
  console.log("   Place certificates at:");
  console.log(`   - ${SSL_CERT_PATH}`);
  console.log(`   - ${SSL_KEY_PATH}`);
}

// Start HTTP server
http.createServer(app).listen(HTTP_PORT, () => {
  console.log("=".repeat(60));
  console.log("✅ HTTP Server running");
  console.log("=".repeat(60));
  console.log(`📡 Port: ${HTTP_PORT}`);
  console.log(`🔗 URL: http://localhost:${HTTP_PORT}`);
  console.log("⚠️  Warning: HTTP is not encrypted!");
  console.log("=".repeat(60));
});

// Start HTTPS server if certificates are available
if (sslOptions) {
  https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
    console.log("=".repeat(60));
    console.log("✅ HTTPS Server running");
    console.log("=".repeat(60));
    console.log(`📡 Port: ${HTTPS_PORT}`);
    console.log(`🔗 URL: https://localhost:${HTTPS_PORT}`);
    console.log("🔒 SSL/TLS encryption active");
    console.log("=".repeat(60));
  });
}

console.log(`⏰ Started: ${new Date().toISOString()}`);
