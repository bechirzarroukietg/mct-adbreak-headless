# Setup Guide: Deploying Puppeteer Scraper Project to a VM

This guide will help you prepare, transfer, and run your Puppeteer scraper project on a virtual machine (VM).

---

## 1. Prerequisites
- A VM running Windows, Linux, or macOS
- Node.js (v18+ recommended) installed on the VM
- Chrome/Chromium installed (optional, Puppeteer downloads its own by default)
- Internet access for the VM

---

## 2. Prepare Your Project Locally
- Ensure your project contains:
  - All source files (`*.js`, `package.json`, etc.)
  - Any required assets or configuration files
- Remove sensitive data (API keys, cookies, etc.) before transfer

---

## 3. Transfer Project to VM
- Zip your project folder or use a tool like `scp`, `rsync`, or file sharing
- Example (Linux/macOS):
  ```bash
  scp -r ./puppeteer user@vm-ip:/home/user/puppeteer
  ```
- For Windows, use RDP, WinSCP, or upload via cloud storage

---

## 4. Install Dependencies on VM
- SSH/RDP into your VM
- Navigate to your project directory
- Run:
  ```bash
  npm install
  ```
- If you use native modules, ensure build tools are installed (`build-essential` for Linux, Visual Studio Build Tools for Windows)

---

## 5. Configure Environment
- Set environment variables if needed (e.g., API endpoints)
- Open required ports (default Express port is 3000)
- If running headless, ensure the VM has necessary libraries:
  - For Linux: `apt-get install -y libx11-dev libxss1 libasound2 libatk1.0-0 libatk-bridge2.0-0 libgtk-3-0 libnss3 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libpangocairo-1.0-0 libx11-xcb1 libxext6 libxfixes3 libxrender1 libxi6 libxtst6 libxcb1 libxcb-dri3-0`

---

## 6. Start the Server
- Run:
  ```bash
  node scraper.js
  ```
- The Express server will listen on port 3000 by default
- Test with a POST request to `/scrape` from your client

---

## 7. Troubleshooting
- Check logs for errors
- Ensure all dependencies are installed
- Open firewall ports if needed
- For Puppeteer errors, check for missing libraries (see step 5)

---

## 8. Security & Maintenance
- Do not expose the server to the public internet without authentication
- Regularly update Node.js and dependencies
- Monitor resource usage on the VM

---

## 9. Optional: Run as a Service
- Use `pm2`, `systemd`, or Windows Services to keep the server running
- Example (Linux):
  ```bash
  npm install -g pm2
  pm2 start scraper.js
  pm2 startup
  pm2 save
  ```

---

## 10. Useful Commands
- Install Node.js: https://nodejs.org/en/download/
- Install Chrome (optional): https://www.google.com/chrome/
- Check Node version: `node -v`
- Check npm version: `npm -v`

---

This guide covers the essentials for deploying your Puppeteer scraper project to a VM. Adjust steps for your specific OS and environment.
