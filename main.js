const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 500,
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.on('run-scraper', (event) => {
  const scraper = spawn('node', [path.join(__dirname, 'scraper.js')]);
  scraper.stdout.on('data', (data) => {
    event.sender.send('scraper-output', data.toString());
  });
  scraper.stderr.on('data', (data) => {
    event.sender.send('scraper-output', data.toString());
  });
  scraper.on('close', (code) => {
    event.sender.send('scraper-output', `Scraper exited with code ${code}`);
  });
});
