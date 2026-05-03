const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    title: "CyberTech RH - Desktop",
    icon: path.join(__dirname, 'public/logo-cybertech.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'), // Caso precise de preload no futuro
    },
    backgroundColor: '#0a0f1d', // Cor escura para combinar com a tela de bloqueio
    show: false, // Inicia oculto para evitar flash branco
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  // Flag para o React saber que está no Electron
  mainWindow.webContents.executeJavaScript('window.isElectron = true;');

  // Em desenvolvimento, carrega o localhost. Em produção, carrega o index.html da pasta dist.
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    mainWindow.setMenuBarVisibility(false);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
