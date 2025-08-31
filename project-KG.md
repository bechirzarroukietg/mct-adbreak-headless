# Knowledge Guide: Puppeteer Scraper Project

## Project Overview
This project is a Puppeteer-based web scraper designed to automate data extraction from video-related web pages. It includes scripts for scraping, exporting data, managing cookies, and utility functions.

## Project Structure
- `main.js`: Entry point for running the scraper.
- `scraper.js`: Contains the main scraping logic using Puppeteer.
- `export.js`: Handles exporting scraped data to files.
- `utils.js`: Utility functions for data processing and support.
- `cookies.json`: Stores session cookies for authenticated scraping.
- `videosListUrl.txt`: List of URLs to be scraped.
- `index.html`: May be used for local testing or preview.
- `StartScraper.bat`: Batch file to start the scraper on Windows.
- `package.json`: Project dependencies and scripts.

## How It Works
1. **Setup**
   - Install dependencies: `npm install`
   - Ensure `videosListUrl.txt` contains target URLs.
   - If authentication is required, update `cookies.json`.

2. **Running the Scraper**
   - Use `StartScraper.bat` or run `node main.js` in the terminal.
   - The scraper loads URLs from `videosListUrl.txt`, applies cookies if needed, and extracts relevant data.

3. **Exporting Data**
   - Scraped data is processed and exported using `export.js` (e.g., to JSON or CSV).

4. **Utilities**
   - Helper functions in `utils.js` assist with formatting, error handling, and other tasks.

## Customization
- Modify `scraper.js` to change what data is extracted.
- Update `videosListUrl.txt` to target different pages.
- Adjust `export.js` for different output formats.

## Best Practices
- Keep cookies up to date for authenticated scraping.
- Respect website terms and avoid overloading servers.
- Log errors and handle exceptions gracefully.

## Troubleshooting
- If scraping fails, check for changes in page structure or authentication issues.
- Review logs and error messages in the terminal.
- Update dependencies if Puppeteer or Node.js versions change.

## Resources
- [Puppeteer Documentation](https://pptr.dev/)
- [Node.js Documentation](https://nodejs.org/en/docs/)

---
This guide summarizes the structure and workflow of your Puppeteer scraper project. Adjust scripts and configuration files as needed for your specific use case.
