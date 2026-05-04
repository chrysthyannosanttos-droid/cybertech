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
  // Determina a rota inicial
  const isTerminalMode = process.argv.includes('--terminal');
  const startUrl = isDev 
    ? (isTerminalMode ? 'http://localhost:5173/terminal' : 'http://localhost:5173')
    : `file://${path.join(__dirname, 'dist/index.html')}${isTerminalMode ? '#/terminal' : ''}`;

  if (isTerminalMode) {
    mainWindow.setFullScreen(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setMenuBarVisibility(false);
  }

  if (isDev) {
    mainWindow.loadURL(startUrl);
  } else {
    // Para React Router com HashHistory ou ajuste de rota no loadFile
    if (isTerminalMode) {
      mainWindow.loadFile(path.join(__dirname, 'dist/index.html'), { hash: '/terminal' });
    } else {
      mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    }
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
