# NGINX Proxy for Origin Server Testing

This directory contains a simple NGINX reverse proxy setup for testing Cloudflare configurations in the learning lab. It acts as a local origin server that proxies requests to your application running on port 8080.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
  - [NGINX Configuration File](#nginx-configuration-file)
  - [Customizing the Configuration](#customizing-the-configuration)
- [Usage](#usage)
  - [Starting the Proxy](#starting-the-proxy)
  - [Stopping the Proxy](#stopping-the-proxy)
  - [Removing the Proxy](#removing-the-proxy)
  - [Viewing Logs](#viewing-logs)
  - [Checking Status](#checking-status)
- [Troubleshooting](#troubleshooting)
  - [Port 80 Already in Use](#port-80-already-in-use)
  - [Application Not Responding on Port 8080](#application-not-responding-on-port-8080)
  - [NGINX Configuration Errors](#nginx-configuration-errors)
  - [Docker Permission Issues](#docker-permission-issues)
- [Use Cases in the Lab](#use-cases-in-the-lab)
- [Advanced Configuration](#advanced-configuration)
  - [Adding HTTPS Support](#adding-https-support)
  - [Custom Backend Port](#custom-backend-port)
  - [Adding Multiple Locations](#adding-multiple-locations)
- [Additional Resources](#additional-resources)

## Overview

This setup provides:

- **NGINX reverse proxy** running on port 80
- **Automatic proxying** to your application on `http://127.0.0.1:8080`
- **Proper headers** for proxied requests (Host, X-Real-IP, X-Forwarded-For, etc.)
- **Docker-based deployment** for easy setup and teardown
- **Host networking** for local development testing

## Prerequisites

Before using this NGINX proxy, ensure you have:

1. **Docker installed and running**
   ```bash
   docker --version
   ```

2. **An application running on port 8080**
   - This could be your test web server, API, or any HTTP service
   - The proxy will forward all incoming requests to this port

3. **Port 80 available** on your local machine
   - No other services should be listening on port 80
   - You may need sudo/admin privileges depending on your OS

## Quick Start

1. **Navigate to this directory:**
   ```bash
   cd tools/nginx
   ```

2. **Start your application on port 8080** (in another terminal):
   ```bash
   # Example: Simple Python HTTP server
   python3 -m http.server 8080

   # Or any other application that listens on port 8080
   ```

3. **Run the NGINX proxy:**
   ```bash
   ./run-nginx.sh
   ```

4. **Test the proxy:**
   ```bash
   curl http://localhost
   ```

   You should see the response from your application running on port 8080.

## Configuration

### NGINX Configuration File

The [nginx.conf](nginx.conf) file contains the basic reverse proxy configuration:

```nginx
events {}

http {
  server {
    listen 80;
    server_name _;

    location / {
      proxy_pass http://127.0.0.1:8080;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}
```

**Key configuration elements:**

- `listen 80` - NGINX listens on port 80
- `proxy_pass http://127.0.0.1:8080` - Forwards requests to your app on port 8080
- `proxy_set_header` directives - Preserve client information in forwarded requests

### Customizing the Configuration

To modify the proxy behavior:

1. Edit [nginx.conf](nginx.conf)
2. Restart the proxy:
   ```bash
   ./run-nginx.sh
   ```

Common modifications:

- **Change origin port:** Modify the `proxy_pass` line
- **Add SSL/TLS:** Uncomment and configure the server block for port 443
- **Add custom headers:** Add more `proxy_set_header` directives
- **Configure caching:** Add cache-related directives

## Usage

### Starting the Proxy

```bash
./run-nginx.sh
```

The script will:
- Check if [nginx.conf](nginx.conf) exists
- Remove any existing `nginx-proxy` container
- Start a new NGINX container with your configuration

### Stopping the Proxy

```bash
docker stop nginx-proxy
```

### Removing the Proxy

```bash
docker rm nginx-proxy
```

Or simply run `./run-nginx.sh` again - it automatically removes the old container.

### Viewing Logs

```bash
docker logs nginx-proxy

# Follow logs in real-time
docker logs -f nginx-proxy
```

### Checking Status

```bash
docker ps | grep nginx-proxy
```

## Troubleshooting

### Port 80 Already in Use

**Error:** `docker: Error response from daemon: driver failed programming external connectivity on endpoint nginx-proxy`

**Solution:**

1. Find what's using port 80:

   ```bash
   # On macOS/Linux
   sudo lsof -i :80

   # On Windows
   netstat -ano | findstr :80
   ```

2. Stop the conflicting service or change NGINX to use a different port:


   ```nginx
   listen 8000;  # Change in nginx.conf
   ```

### Application Not Responding on Port 8080

**Error:** `502 Bad Gateway`

**Solution:**

1. Verify your application is running:

   ```bash
   curl http://localhost:8080
   ```

2. Check your application logs

3. Ensure your application is listening on `127.0.0.1:8080` or `0.0.0.0:8080`

### NGINX Configuration Errors

**Error:** NGINX fails to start

**Solution:**

1. Check the NGINX logs:

   ```bash
   docker logs nginx-proxy
   ```

2. Test the configuration syntax:

   ```bash
   docker run --rm -v "$PWD/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t
   ```

### Docker Permission Issues

**Error:** Permission denied errors

**Solution:**

- On Linux, you may need to run with sudo or add your user to the docker group
- Ensure Docker Desktop is running (macOS/Windows)

## Use Cases in the Lab

This NGINX proxy is useful for several modules in the Cloudflare Mastery lab:

### Module 2-3: DNS and Proxy Testing

- Acts as your local origin server
- Allows testing Cloudflare's proxy behavior
- Demonstrates how requests flow through Cloudflare to your origin

### Module 4: SSL/TLS Configuration

- Provides an HTTP origin for testing SSL modes
- Can be extended to support HTTPS origin (see comment in nginx.conf)

### Module 5: Origin Protection

- Serves as the origin to protect with firewall rules
- Demonstrates why exposing port 80 directly is a security risk

### Module 6-7: Caching Behavior

- Allows testing different cache headers
- Shows how origin responses affect Cloudflare's cache

### Module 8-9: Workers Development

- Provides a consistent origin for testing Workers
- Useful for proxying requests through Workers to your local app

## Advanced Configuration

### Adding HTTPS Support

To add TLS termination at the origin:

1. Generate self-signed certificates:

   ```bash
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout server.key -out server.crt
   ```

2. Update [nginx.conf](nginx.conf) to include the commented HTTPS server block

3. Mount certificates in [run-nginx.sh](run-nginx.sh):

   ```bash
   -v "$PWD/server.crt:/etc/nginx/server.crt:ro" \
   -v "$PWD/server.key:/etc/nginx/server.key:ro" \
   ```

### Custom Backend Port

To proxy to a different port, edit the `proxy_pass` directive in [nginx.conf](nginx.conf):

```nginx
proxy_pass http://127.0.0.1:3000;  # For Node.js/Express
proxy_pass http://127.0.0.1:5000;  # For Flask/Python
```

### Adding Multiple Locations

```nginx
location /api {
  proxy_pass http://127.0.0.1:8080;
}

location /static {
  proxy_pass http://127.0.0.1:9000;
}
```

## Additional Resources

- [NGINX Official Documentation](https://nginx.org/en/docs/)
- [NGINX Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Docker NGINX Image](https://hub.docker.com/_/nginx)
- [Cloudflare Origin Server Documentation](https://developers.cloudflare.com/fundamentals/basic-tasks/protect-your-origin-server/)

---

**Need help?** Check the main [Cloudflare Mastery README](../../README.md) or refer to the specific module you're working on.
