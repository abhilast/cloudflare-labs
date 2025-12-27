# Cloudflare Mastery - Self-Paced Learning Lab

**Welcome to your hands-on journey from Cloudflare beginner to advanced practitioner!**

This learning lab provides a structured, practical approach to mastering Cloudflare, from basic DNS to advanced Workers and load balancing. Each module includes both conceptual learning and hands-on exercises with real infrastructure.

## Table of Contents

- [Learning Objectives](#learning-objectives)
- [Lab Structure](#lab-structure)
  - [Module Overview](#module-overview)
- [Learning Paths](#learning-paths)
  - [Recommended Sequential Path (8 Weeks)](#recommended-sequential-path-8-weeks)
  - [Fast Track (4 Weeks)](#fast-track-4-weeks)
  - [Weekend Warrior (Flexible)](#weekend-warrior-flexible)
- [Resources](#resources)
- [Practical Projects](#practical-projects)
  - [Project 1: Personal Blog with CDN](#project-1-personal-blog-with-cdn)
  - [Project 2: API Gateway with Rate Limiting](#project-2-api-gateway-with-rate-limiting)
  - [Project 3: Dynamic Web App](#project-3-dynamic-web-app)
- [Prerequisites](#prerequisites)
- [Daily Practice Recommendations](#daily-practice-recommendations)
- [Progress Tracking](#progress-tracking)
- [Getting Started](#getting-started)
- [Support and Community](#support-and-community)
- [License](#license)

## Learning Objectives

By completing this lab, you will:

- Understand how Cloudflare's CDN and edge network function
- Configure and manage DNS records with Cloudflare
- Implement SSL/TLS security with proper certificate management
- Protect your origin servers from direct access
- Master HTTP caching strategies and cache control
- Build and deploy Cloudflare Workers at the edge
- Configure Web Application Firewall (WAF) rules
- Implement advanced features like KV storage and load balancing
- Deploy production-ready applications with Cloudflare

## Lab Structure

This lab is organized into phases, progressing from foundational concepts to advanced implementations. Each module builds upon previous knowledge.

### Module Overview

| Module | Topic | Focus Area | Est. Time | Status |
|--------|-------|------------|-----------|--------|
| [Module 0](./module00/) | What and Why | Understanding Cloudflare's role and basic setup | 2-3 hours | Available |
| [Module 1](./module01/) | DNS Fundamentals | How DNS works and Cloudflare as DNS provider | 3-4 hours | Available |
| [Module 2](./module02/) | Your First DNS Records | Creating A records and understanding proxy modes | 2-3 hours | Available |
| [Module 3](./module03/) | Understanding the Proxy | How Cloudflare's edge network proxies requests | 3-4 hours | Available |
| [Module 4](./module04/) | SSL/TLS Basics | HTTPS, certificate management, SSL modes | 4-5 hours | Available |
| [Module 5](./module05/) | Origin Protection | Securing your origin with firewall rules | 2-3 hours | Available |
| [Module 6](./module06/) | How HTTP Caching Works | Cache headers, hit/miss statuses, caching chain | 4-5 hours | Available |
| Module 7 | Controlling the Cache | Page rules, cache everything, custom TTLs | 3-4 hours | Coming Soon |
| Module 8 | Your First Worker | Introduction to edge computing with Workers | 4-5 hours | Coming Soon |
| Module 9 | Practical Worker Patterns | Geolocation, A/B testing, redirects, auth | 5-6 hours | Coming Soon |
| Module 10 | Web Application Firewall | WAF rules, rate limiting, security | 3-4 hours | Coming Soon |
| Module 11 | Workers KV Storage | Edge storage with key-value database | 4-5 hours | Coming Soon |
| Module 12 | Load Balancing | Health checks, failover, geographic routing | 4-5 hours | Coming Soon |

**Total estimated time:** 45-56 hours

## Learning Paths

### Recommended Sequential Path (8 Weeks)

- **Week 1:** Modules 0-3 (Foundation: DNS & Basic Connectivity)
- **Week 2:** Modules 4-5 (Security & SSL)
- **Week 3:** Modules 6-7 (Caching Fundamentals)
- **Week 4:** Modules 8-9 (Edge Workers)
- **Week 5:** Module 10 (Firewall & Security)
- **Week 6:** Modules 11-12 (Advanced Topics)
- **Weeks 7-8:** Build practical projects

### Fast Track (4 Weeks)

For experienced developers who can dedicate 10-15 hours per week:

- **Week 1:** Modules 0-5
- **Week 2:** Modules 6-9
- **Week 3:** Modules 10-12
- **Week 4:** Practical projects

### Weekend Warrior (Flexible)

Complete one module per weekend at your own pace. Each module is self-contained with clear checkpoints.

## Resources

- **[Complete Syllabus](./syllabus.md)** - Detailed course outline with all hands-on exercises
- **[Cloudflare Docs](https://developers.cloudflare.com/)** - Official documentation
- **[Workers Examples](https://developers.cloudflare.com/workers/examples/)** - Code samples and patterns
- **[Cloudflare Blog](https://blog.cloudflare.com/)** - Latest features and best practices

## Practical Projects

After completing the modules, build these real-world projects to solidify your learning:

### Project 1: Personal Blog with CDN

**Skills:** Modules 1-7

Build a static blog with edge caching, image optimization, SSL, and origin protection.

### Project 2: API Gateway with Rate Limiting

**Skills:** Modules 8-10

Create a Worker-based API gateway with rate limiting, geolocation routing, and security headers.

### Project 3: Dynamic Web App

**Skills:** Modules 11-12

Deploy a load-balanced web application with Workers KV for session storage and A/B testing.

## Prerequisites

- Basic understanding of web technologies (HTTP, DNS concepts)
- Familiarity with command line/terminal
- A domain name (can be purchased through Cloudflare)
- AWS account or similar cloud provider (for origin server)
- Text editor or IDE for coding
- Cloudflare account (free tier is sufficient to start)

## Daily Practice Recommendations

For optimal learning, follow this daily routine:

1. **1 hour:** Read and understand concepts
2. **1-2 hours:** Complete hands-on exercises
3. **30 minutes:** Document what you learned
4. **Break things intentionally** to understand how they work
5. **Complete all checkpoints** before moving to the next module

## Progress Tracking

Use this checklist to track your progress:

- [ ] Pre-Flight Complete (Module 0)
- [ ] Phase 1: DNS & Basic Connectivity (Modules 1-3)
- [ ] Phase 2: Security & SSL (Modules 4-5)
- [ ] Phase 3: Caching Fundamentals (Modules 6-7)
- [ ] Phase 4: Edge Workers Introduction (Modules 8-9)
- [ ] Phase 5: Firewall & Security (Module 10)
- [ ] Phase 6: Advanced Topics (Modules 11-12)
- [ ] Project 1: Personal Blog with CDN
- [ ] Project 2: API Gateway with Rate Limiting
- [ ] Project 3: Dynamic Web App

## Getting Started

1. **Read the [syllabus](./syllabus.md)** to understand the full scope
2. **Start with [Module 0](./module00/)** - even if you have some Cloudflare experience
3. **Complete each checkpoint** before moving forward
4. **Take notes** and build your own reference guide
5. **Experiment beyond the exercises** - curiosity accelerates learning

## Support and Community

- Open an issue in this repository for questions
- Share your progress and learnings
- Contribute improvements to exercises and documentation

## License

This learning lab is provided for educational purposes. Please ensure you comply with Cloudflare's terms of service and acceptable use policies when completing the exercises.

---

**Remember:** The goal is not to rush through modules, but to build deep, practical understanding. Each checkpoint validates your comprehension before moving forward. Take your time and enjoy the learning journey!
