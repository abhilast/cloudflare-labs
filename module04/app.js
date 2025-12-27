// app.js - Enhanced for HTTPS support
const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Helper functions
function isBehindCloudflare(req) {
    return req.get("CF-Ray") !== undefined;
}

function getHeader(req, headerName, defaultValue = "Not present") {
    return req.get(headerName) || defaultValue;
}

// HTTPS detection helper
function isHTTPS(req) {
    // Check various headers that indicate HTTPS
    return (
        req.secure ||
        req.get("X-Forwarded-Proto") === "https" ||
        req.get("CF-Visitor") === '{"scheme":"https"}'
    );
}

// Main route - Enhanced with HTTPS detection
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

// JSON endpoint for programmatic checking
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

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        https: isHTTPS(req),
        timestamp: new Date().toISOString(),
    });
});

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


// Create both HTTP and HTTPS servers
const HTTP_PORT = 80;
const HTTPS_PORT = 443;

// Load SSL certificates
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync("/etc/ssl/cloudflare/key.pem"),
        cert: fs.readFileSync("/etc/ssl/cloudflare/cert.pem"),
    };
    console.log("✅ SSL certificates loaded successfully");
} catch (error) {
    console.log("⚠️  SSL certificates not found, running HTTP only");
    console.log("   Place certificates at:");
    console.log("   - /etc/ssl/cloudflare/cert.pem");
    console.log("   - /etc/ssl/cloudflare/key.pem");
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