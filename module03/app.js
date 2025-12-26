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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('✅ Cloudflare Proxy Inspector Running');
  console.log('='.repeat(50));
  console.log(`📍 Port: ${PORT}`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log('='.repeat(50));
});