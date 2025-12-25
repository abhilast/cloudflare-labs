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

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`=================================`);
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`=================================`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Server started at: ${new Date().toISOString()}`);
});