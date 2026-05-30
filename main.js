const { app, BrowserWindow, Menu, ipcMain, dialog, shell, session, nativeTheme, clipboard, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let downloadPath = app.getPath('downloads');

const userDataPath = app.getPath('userData');
const bookmarksPath = path.join(userDataPath, 'bookmarks.json');
const historyPath = path.join(userDataPath, 'history.json');
const settingsPath = path.join(userDataPath, 'settings.json');
const cookiesPath = path.join(userDataPath, 'cookies.json');

function loadData(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {}
  return defaultValue;
}

function saveData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {}
}

let bookmarks = loadData(bookmarksPath);
let history = loadData(historyPath);
let settings = loadData(settingsPath, {
  homepage: 'https://www.google.com',
  searchEngine: 'google',
  fontSize: 16,
  blockAds: false,
  doNotTrack: true,
  clearOnExit: false,
  showBookmarksBar: true,
  passwordSave: true,
  startupBehavior: 'continue',
  downloadsPath: downloadPath,
  zoomLevel: 1,
  theme: 'system',
  tabPosition: 'top',
  restoreSession: true
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 400,
    minHeight: 300,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#202124',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: false,
      spellcheck: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.setZoomFactor(settings.zoomLevel || 1);
  });

  setupMenu();
  setupIPC();
}

function setupMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: () => mainWindow.webContents.send('new-tab') },
        { label: 'New Window', accelerator: 'CmdOrCtrl+N', click: () => createWindow() },
        { label: 'New Incognito Window', accelerator: 'CmdOrCtrl+Shift+N', click: () => createIncognitoWindow() },
        { type: 'separator' },
        { label: 'Open File...', accelerator: 'CmdOrCtrl+O', click: () => openFile() },
        { label: 'Open Location...', accelerator: 'CmdOrCtrl+L', click: () => mainWindow.webContents.send('focus-address-bar') },
        { type: 'separator' },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => mainWindow.webContents.send('close-tab') },
        { label: 'Close Window', accelerator: 'Alt+F4', click: () => mainWindow.close() },
        { type: 'separator' },
        { label: 'Save Page As...', accelerator: 'CmdOrCtrl+S', click: () => savePage() },
        { label: 'Send Link...', click: () => sendLink() },
        { type: 'separator' },
        { label: 'Print...', accelerator: 'CmdOrCtrl+P', click: () => mainWindow.webContents.print() },
        { type: 'separator' },
        { label: 'Exit', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Paste and Go', accelerator: 'Ctrl+Shift+V', click: () => mainWindow.webContents.send('paste-and-go') },
        { label: 'Delete', accelerator: 'Delete', role: 'delete' },
        { type: 'separator' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find on Page...', accelerator: 'CmdOrCtrl+F', click: () => mainWindow.webContents.send('find-on-page') },
        { label: 'Find Next', accelerator: 'F3', click: () => mainWindow.webContents.send('find-next') },
        { label: 'Find Previous', accelerator: 'Shift+F3', click: () => mainWindow.webContents.send('find-previous') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.webContents.send('reload') },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow.webContents.send('force-reload') },
        { label: 'Stop', accelerator: 'Escape', click: () => mainWindow.webContents.send('stop-loading') },
        { type: 'separator' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: () => mainWindow.webContents.send('zoom-in') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.send('zoom-out') },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.send('zoom-reset') },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+1', click: () => mainWindow.webContents.setZoomFactor(1) },
        { label: 'Full Screen', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { type: 'separator' },
        { label: 'Toggle Developer Tools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow.webContents.send('toggle-devtools') },
        { label: 'View Source', accelerator: 'CmdOrCtrl+U', click: () => mainWindow.webContents.send('view-source') }
      ]
    },
    {
      label: 'History',
      submenu: [
        { label: 'Back', accelerator: 'Alt+Left', click: () => mainWindow.webContents.send('go-back') },
        { label: 'Forward', accelerator: 'Alt+Right', click: () => mainWindow.webContents.send('go-forward') },
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.webContents.send('reload') },
        { type: 'separator' },
        { label: 'Home', accelerator: 'Alt+Home', click: () => mainWindow.webContents.send('go-home') },
        { type: 'separator' },
        { label: 'Show History', accelerator: 'CmdOrCtrl+H', click: () => mainWindow.webContents.send('show-history') },
        { type: 'separator' }
      ]
    },
    {
      label: 'Bookmarks',
      submenu: [
        { label: 'Bookmark This Page...', accelerator: 'CmdOrCtrl+D', click: () => mainWindow.webContents.send('bookmark-page') },
        { label: 'Show Bookmarks Bar', accelerator: 'CmdOrCtrl+B', click: () => mainWindow.webContents.send('toggle-bookmarks-bar') },
        { label: 'Bookmark All Tabs...', accelerator: 'CmdOrCtrl+Shift+D', click: () => mainWindow.webContents.send('bookmark-all-tabs') },
        { type: 'separator' },
        { label: 'Show Bookmarks', click: () => mainWindow.webContents.send('show-bookmarks') }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        { label: 'Clear Browsing Data...', accelerator: 'CmdOrCtrl+Shift+Delete', click: () => mainWindow.webContents.send('clear-browsing-data') },
        { type: 'separator' },
        { label: 'Downloads', accelerator: 'CmdOrCtrl+J', click: () => mainWindow.webContents.send('show-downloads') },
        { type: 'separator' },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => mainWindow.webContents.send('show-settings') },
        { label: 'Manage Extensions', click: () => mainWindow.webContents.send('show-extensions') },
        { type: 'separator' },
        { label: 'Task Manager', click: () => showTaskManager() },
        { type: 'separator' },
        { label: 'Relaunch', click: () => { app.relaunch(); app.exit(); } },
        { label: 'Check for Updates...', click: () => checkForUpdates() }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About LiteBrowser', click: () => mainWindow.webContents.send('show-about') },
        { type: 'separator' },
        { label: 'LiteBrowser Help', accelerator: 'F1', click: () => shell.openExternal('https://support.google.com/chrome') },
        { label: 'Report an Issue...', click: () => shell.openExternal('https://github.com/litebrowser/issues') },
        { type: 'separator' },
        { label: 'Keyboard Shortcuts', click: () => mainWindow.webContents.send('show-shortcuts') }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setupIPC() {
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.on('window-close', () => mainWindow.close());
  ipcMain.on('window-fullscreen', () => mainWindow.setFullScreen(!mainWindow.isFullScreen()));

  ipcMain.handle('get-window-state', () => {
    return {
      isMaximized: mainWindow.isMaximized(),
      isFullScreen: mainWindow.isFullScreen()
    };
  });

  ipcMain.handle('get-bookmarks', () => bookmarks);
  ipcMain.handle('save-bookmarks', (event, data) => {
    bookmarks = data;
    saveData(bookmarksPath, bookmarks);
    return true;
  });

  ipcMain.handle('get-history', () => history);
  ipcMain.handle('save-history', (event, data) => {
    history = data;
    saveData(historyPath, history);
    return true;
  });
  ipcMain.handle('add-history', (event, entry) => {
    history.unshift(entry);
    if (history.length > 10000) history = history.slice(0, 10000);
    saveData(historyPath, history);
    return true;
  });
  ipcMain.handle('clear-history', () => {
    history = [];
    saveData(historyPath, history);
    return true;
  });

  ipcMain.handle('get-settings', () => settings);
  ipcMain.handle('save-settings', (event, data) => {
    settings = { ...settings, ...data };
    saveData(settingsPath, settings);
    mainWindow.webContents.send('settings-updated', settings);
    return true;
  });

  ipcMain.handle('select-download-path', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Download Location'
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.on('set-download-path', (event, path) => {
    downloadPath = path;
  });

  ipcMain.handle('save-file', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save As',
      defaultPath: options.defaultPath || path.join(downloadPath, options.fileName || 'download'),
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
    });
    if (!result.canceled && result.filePath) {
      return result.filePath;
    }
    return null;
  });

  ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
  });

  ipcMain.on('inspect-element', (event, x, y) => {
    mainWindow.webContents.inspectElement(x, y);
  });

  ipcMain.on('toggle-devtools', () => {
    mainWindow.webContents.toggleDevTools();
  });

  ipcMain.handle('get-theme', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });

  ipcMain.handle('get-zoom-factor', () => {
    return mainWindow.webContents.getZoomFactor();
  });

  ipcMain.on('set-zoom-factor', (event, factor) => {
    mainWindow.webContents.setZoomFactor(factor);
  });

  ipcMain.handle('get-session-cookies', async (event, url) => {
    return session.defaultSession.cookies.get({ url });
  });

  ipcMain.handle('get-spellcheck-languages', () => {
    return ['en-US', 'en-GB', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'zh', 'ja', 'ko'];
  });
}

function openFile() {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'HTML Files', extensions: ['html', 'htm'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      mainWindow.webContents.send('open-file', result.filePaths[0]);
    }
  });
}

function savePage() {
  dialog.showSaveDialog(mainWindow, {
    title: 'Save Page As',
    filters: [
      { name: 'HTML File', extensions: ['html'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      mainWindow.webContents.send('save-page', result.filePath);
    }
  });
}

function sendLink() {
  mainWindow.webContents.send('get-current-url');
}

function createIncognitoWindow() {
  const incognitoWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  incognitoWindow.loadFile(path.join(__dirname, 'index.html'));
}

function showTaskManager() {
  const taskManager = new BrowserWindow({
    width: 600,
    height: 400,
    parent: mainWindow,
    modal: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  taskManager.loadFile(path.join(__dirname, 'taskmanager.html'));
}

function checkForUpdates() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'LiteBrowser Update',
    message: 'You are running the latest version of LiteBrowser.',
    buttons: ['OK']
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (settings.clearOnExit) {
    const ses = session.defaultSession;
    ses.clearStorageData();
  }
});

app.commandLine.appendSwitch('disable-features', 'TranslateUI');
app.commandLine.appendSwitch('enable-features', 'HardwareAcceleration');
