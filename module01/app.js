const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>My First Server</title>
        <style>
          body { 
            font-family: Arial; 
            max-width: 800px; 
            margin: 50px auto;
            padding: 20px;
          }
          .info { 
            background: #f0f0f0; 
            padding: 15px; 
            border-radius: 5px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <h1>🚀 Hello from AWS!</h1>
        <div class="info">
          <p><strong>Server time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Your IP:</strong> ${req.ip}</p>
          <p><strong>Request received at:</strong> ${req.get('host')}</p>
        </div>
        <p>This is running on my Ubuntu server in AWS! 🎉</p>
      </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log('✓ Server running on port 3000');
  console.log('✓ Access it at: http://YOUR_PUBLIC_IP:3000');
});