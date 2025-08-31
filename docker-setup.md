# Docker Setup Instructions for Puppeteer Scraper

## 1. Build the Docker Image
Open a terminal in your project directory and run:
```bash
docker build -t puppeteer-scraper .
```

## 2. Run the Container
```bash
docker run -p 3000:3000 puppeteer-scraper
```
This will start the Express server inside the container and expose port 3000 to your host.

## 3. Test Locally
- Send POST requests to `http://localhost:3000/scrape` as before.
- The container includes all required dependencies for Puppeteer and Chromium.

## 4. For Production (Ubuntu Linux)
- Use the same Dockerfile and commands.
- You can deploy the image to any VM with Docker installed.
- For background running, use:
  ```bash
  docker run -d -p 3000:3000 puppeteer-scraper
  ```

## 5. Useful Docker Commands
- List containers: `docker ps -a`
- Stop container: `docker stop <container_id>`
- Remove container: `docker rm <container_id>`
- Remove image: `docker rmi puppeteer-scraper`

---

This setup ensures your scraper works locally (WSL/Docker Desktop) and in production (Ubuntu Linux) with no manual dependency installation required.
