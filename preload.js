const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browserAPI', {
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    fullscreen: () => ipcRenderer.send('window-fullscreen'),
    getState: () => ipcRenderer.invoke('get-window-state')
  },

  tabs: {
    onNewTab: (callback) => ipcRenderer.on('new-tab', callback),
    onCloseTab: (callback) => ipcRenderer.on('close-tab', callback)
  },

  navigation: {
    onGoBack: (callback) => ipcRenderer.on('go-back', callback),
    onGoForward: (callback) => ipcRenderer.on('go-forward', callback),
    onGoHome: (callback) => ipcRenderer.on('go-home', callback),
    onReload: (callback) => ipcRenderer.on('reload', callback),
    onForceReload: (callback) => ipcRenderer.on('force-reload', callback),
    onStopLoading: (callback) => ipcRenderer.on('stop-loading', callback)
  },

  zoom: {
    onZoomIn: (callback) => ipcRenderer.on('zoom-in', callback),
    onZoomOut: (callback) => ipcRenderer.on('zoom-out', callback),
    onZoomReset: (callback) => ipcRenderer.on('zoom-reset', callback),
    getFactor: () => ipcRenderer.invoke('get-zoom-factor'),
    setFactor: (factor) => ipcRenderer.send('set-zoom-factor', factor)
  },

  bookmarks: {
    get: () => ipcRenderer.invoke('get-bookmarks'),
    save: (data) => ipcRenderer.invoke('save-bookmarks', data),
    onBookmarkPage: (callback) => ipcRenderer.on('bookmark-page', callback),
    onBookmarkAllTabs: (callback) => ipcRenderer.on('bookmark-all-tabs', callback),
    onToggleBar: (callback) => ipcRenderer.on('toggle-bookmarks-bar', callback),
    onShowBookmarks: (callback) => ipcRenderer.on('show-bookmarks', callback)
  },

  history: {
    get: () => ipcRenderer.invoke('get-history'),
    save: (data) => ipcRenderer.invoke('save-history', data),
    add: (entry) => ipcRenderer.invoke('add-history', entry),
    clear: () => ipcRenderer.invoke('clear-history'),
    onShow: (callback) => ipcRenderer.on('show-history', callback)
  },

  settings: {
    get: () => ipcRenderer.invoke('get-settings'),
    save: (data) => ipcRenderer.invoke('save-settings', data),
    onShow: (callback) => ipcRenderer.on('show-settings', callback),
    onUpdate: (callback) => ipcRenderer.on('settings-updated', callback),
    selectDownloadPath: () => ipcRenderer.invoke('select-download-path'),
    setDownloadPath: (path) => ipcRenderer.send('set-download-path', path)
  },

  downloads: {
    onShow: (callback) => ipcRenderer.on('show-downloads', callback),
    saveFile: (options) => ipcRenderer.invoke('save-file', options)
  },

  view: {
    onToggleDevTools: (callback) => ipcRenderer.on('toggle-devtools', callback),
    onViewSource: (callback) => ipcRenderer.on('view-source', callback),
    onFindOnPage: (callback) => ipcRenderer.on('find-on-page', callback),
    onFindNext: (callback) => ipcRenderer.on('find-next', callback),
    onFindPrevious: (callback) => ipcRenderer.on('find-previous', callback)
  },

  edit: {
    onPasteAndGo: (callback) => ipcRenderer.on('paste-and-go', callback),
    onPaste: (callback) => ipcRenderer.on('paste', callback)
  },

  file: {
    onOpenFile: (callback) => ipcRenderer.on('open-file', callback),
    onSavePage: (callback) => ipcRenderer.on('save-page', callback),
    onGetUrl: (callback) => ipcRenderer.on('get-current-url', callback)
  },

  about: {
    onShowAbout: (callback) => ipcRenderer.on('show-about', callback),
    onShowShortcuts: (callback) => ipcRenderer.on('show-shortcuts', callback)
  },

  extensions: {
    onShow: (callback) => ipcRenderer.on('show-extensions', callback)
  },

  external: {
    open: (url) => ipcRenderer.send('open-external', url)
  },

  context: {
    inspectElement: (x, y) => ipcRenderer.send('inspect-element', x, y)
  },

  theme: {
    get: () => ipcRenderer.invoke('get-theme')
  },

  clipboard: {
    readText: () => {
      const { clipboard } = require('electron');
      return clipboard.readText();
    },
    writeText: (text) => {
      const { clipboard } = require('electron');
      clipboard.writeText(text);
    }
  },

  session: {
    getCookies: (url) => ipcRenderer.invoke('get-session-cookies', url)
  },

  spellcheck: {
    getLanguages: () => ipcRenderer.invoke('get-spellcheck-languages')
  }
});
