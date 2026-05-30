class LiteBrowser {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.tabCounter = 0;
    this.bookmarks = [];
    this.history = [];
    this.settings = {};
    this.downloads = [];
    this.zoomLevel = 1;
    this.isNewTabPage = true;
    this.currentUrl = '';
    this.searchEngines = {
      google: 'https://www.google.com/search?q=',
      bing: 'https://www.bing.com/search?q=',
      duckduckgo: 'https://duckduckgo.com/?q=',
      yahoo: 'https://search.yahoo.com/search?p=',
      brave: 'https://search.brave.com/search?q='
    };

    this.init();
  }

  async init() {
    this.bookmarks = await browserAPI.bookmarks.get() || [];
    this.history = await browserAPI.history.get() || [];
    this.settings = await browserAPI.settings.get() || {};

    this.zoomLevel = this.settings.zoomLevel || 1;
    this.setupEventListeners();
    this.setupIPCListeners();
    this.renderBookmarksBar();
    this.setupNTP();
    this.createTab('https://www.google.com');
    this.applySettings();
  }

  applySettings() {
    if (this.settings.showBookmarksBar) {
      document.getElementById('bookmarksBar').classList.add('visible');
    }
    if (this.settings.downloadsPath) {
      browserAPI.settings.setDownloadPath(this.settings.downloadsPath);
    }
  }

  setupEventListeners() {
    document.getElementById('newTabBtn').addEventListener('click', () => this.newTab());
    document.getElementById('backBtn').addEventListener('click', () => this.goBack());
    document.getElementById('forwardBtn').addEventListener('click', () => this.goForward());
    document.getElementById('reloadBtn').addEventListener('click', () => this.reload());
    document.getElementById('homeBtn').addEventListener('click', () => this.goHome());
    document.getElementById('menuBtn').addEventListener('click', (e) => this.toggleMenu(e));
    document.getElementById('bookmarkBtn').addEventListener('click', () => this.toggleBookmark());
    document.getElementById('downloadsBtn').addEventListener('click', () => this.toggleDownloadsPanel());
    document.getElementById('extensionsBtn').addEventListener('click', () => this.showExtensions());
    document.getElementById('siteInfoBtn').addEventListener('click', () => this.showSiteInfo());

    document.getElementById('minimizeBtn').addEventListener('click', () => browserAPI.window.minimize());
    document.getElementById('maximizeBtn').addEventListener('click', () => browserAPI.window.maximize());
    document.getElementById('closeBtn').addEventListener('click', () => browserAPI.window.close());

    document.getElementById('urlInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.navigate(document.getElementById('urlInput').value);
      }
    });

    document.getElementById('urlInput').addEventListener('focus', () => {
      document.getElementById('urlInput').select();
    });

    document.getElementById('urlInput').addEventListener('input', (e) => {
      this.handleUrlInput(e.target.value);
    });

    document.getElementById('ntpSearch').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.navigate(document.getElementById('ntpSearch').value);
      }
    });

    document.getElementById('findInput').addEventListener('input', (e) => {
      this.findInPage(e.target.value);
    });

    document.getElementById('findClose').addEventListener('click', () => this.closeFindBar());
    document.getElementById('findPrev').addEventListener('click', () => this.findPrevious());
    document.getElementById('findNext').addEventListener('click', () => this.findNext());

    document.addEventListener('contextmenu', (e) => this.showContextMenu(e));

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#contextMenu')) {
        document.getElementById('contextMenu').classList.add('hidden');
      }
      if (!e.target.closest('#menuOverlay') && !e.target.closest('#menuBtn')) {
        document.getElementById('menuOverlay').classList.add('hidden');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 't': e.preventDefault(); this.newTab(); break;
          case 'w': e.preventDefault(); this.closeTab(this.activeTabId); break;
          case 'Tab': e.preventDefault(); this.switchToNextTab(); break;
          case 'f': e.preventDefault(); this.showFindBar(); break;
          case 'd': e.preventDefault(); this.toggleBookmark(); break;
          case 'h': e.preventDefault(); this.showHistory(); break;
          case 'j': e.preventDefault(); this.toggleDownloadsPanel(); break;
          case 'l': e.preventDefault(); document.getElementById('urlInput').focus(); break;
          case 'p': e.preventDefault(); window.print(); break;
        }
      }
      if (e.key === 'F11') {
        e.preventDefault();
        browserAPI.window.fullscreen();
      }
      if (e.key === 'Escape') {
        this.closeFindBar();
        document.getElementById('contextMenu').classList.add('hidden');
        document.getElementById('menuOverlay').classList.add('hidden');
      }
    });

    this.setupMenuListeners();
  }

  setupIPCListeners() {
    browserAPI.tabs.onNewTab(() => this.newTab());
    browserAPI.tabs.onCloseTab(() => this.closeTab(this.activeTabId));

    browserAPI.navigation.onGoBack(() => this.goBack());
    browserAPI.navigation.onGoForward(() => this.goForward());
    browserAPI.navigation.onGoHome(() => this.goHome());
    browserAPI.navigation.onReload(() => this.reload());
    browserAPI.navigation.onForceReload(() => this.forceReload());
    browserAPI.navigation.onStopLoading(() => this.stopLoading());

    browserAPI.zoom.onZoomIn(() => this.zoomIn());
    browserAPI.zoom.onZoomOut(() => this.zoomOut());
    browserAPI.zoom.onZoomReset(() => this.zoomReset());

    browserAPI.bookmarks.onBookmarkPage(() => this.toggleBookmark());
    browserAPI.bookmarks.onBookmarkAllTabs(() => this.bookmarkAllTabs());
    browserAPI.bookmarks.onToggleBar(() => this.toggleBookmarksBar());
    browserAPI.bookmarks.onShowBookmarks(() => this.showBookmarks());

    browserAPI.history.onShow(() => this.showHistory());

    browserAPI.settings.onShow(() => this.showSettings());
    browserAPI.settings.onUpdate((event, settings) => {
      this.settings = settings;
      this.applySettings();
    });

    browserAPI.downloads.onShow(() => this.toggleDownloadsPanel());
    browserAPI.view.onToggleDevTools(() => this.toggleDevTools());
    browserAPI.view.onViewSource(() => this.viewSource());
    browserAPI.view.onFindOnPage(() => this.showFindBar());
    browserAPI.view.onFindNext(() => this.findNext());
    browserAPI.view.onFindPrevious(() => this.findPrevious());

    browserAPI.edit.onPasteAndGo(() => this.pasteAndGo());
    browserAPI.file.onOpenFile((event, filePath) => this.openFile(filePath));
    browserAPI.file.onSavePage((event, filePath) => this.savePage(filePath));

    browserAPI.about.onShowAbout(() => this.showAbout());
    browserAPI.about.onShowShortcuts(() => this.showShortcuts());
    browserAPI.extensions.onShow(() => this.showExtensions());

    browserAPI.theme.get().then(theme => {
      document.body.setAttribute('data-theme', theme);
    });

    this.setupWebViewEvents();
  }

  setupWebViewEvents() {
    const contentArea = document.getElementById('contentArea');

    contentArea.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    const observer = new MutationObserver(() => {
      this.updateNavigationButtons();
    });

    observer.observe(contentArea, { childList: true, subtree: true });
  }

  setupMenuListeners() {
    document.getElementById('menuNewTab').addEventListener('click', () => this.newTab());
    document.getElementById('menuNewWindow').addEventListener('click', () => browserAPI.external.open(''));
    document.getElementById('menuIncognito').addEventListener('click', () => this.newTab('chrome://incognito'));
    document.getElementById('menuHistory').addEventListener('click', () => this.showHistory());
    document.getElementById('menuDownloads').addEventListener('click', () => this.toggleDownloadsPanel());
    document.getElementById('menuBookmarks').addEventListener('click', () => this.showBookmarks());
    document.getElementById('menuZoomIn').addEventListener('click', () => this.zoomIn());
    document.getElementById('menuZoomOut').addEventListener('click', () => this.zoomOut());
    document.getElementById('menuPrint').addEventListener('click', () => window.print());
    document.getElementById('menuFind').addEventListener('click', () => this.showFindBar());
    document.getElementById('menuSettings').addEventListener('click', () => this.showSettings());
    document.getElementById('menuMoreTools').addEventListener('click', () => this.showMoreTools());
    document.getElementById('menuClearData').addEventListener('click', () => this.showClearBrowsingData());
    document.getElementById('menuHelp').addEventListener('click', () => this.showHelp());
    document.getElementById('menuExit').addEventListener('click', () => window.close());

    document.getElementById('ctxBack').addEventListener('click', () => this.goBack());
    document.getElementById('ctxForward').addEventListener('click', () => this.goForward());
    document.getElementById('ctxReload').addEventListener('click', () => this.reload());
    document.getElementById('ctxSaveAs').addEventListener('click', () => this.saveCurrentPage());
    document.getElementById('ctxPrint').addEventListener('click', () => window.print());
    document.getElementById('ctxViewSource').addEventListener('click', () => this.viewSource());
    document.getElementById('ctxInspect').addEventListener('click', () => this.toggleDevTools());
    document.getElementById('ctxCopyLink').addEventListener('click', () => this.copyLinkAddress());
    document.getElementById('ctxOpenNewTab').addEventListener('click', () => this.openLinkInNewTab());
    document.getElementById('ctxOpenNewWindow').addEventListener('click', () => this.openLinkInNewWindow());
    document.getElementById('ctxOpenIncognito').addEventListener('click', () => this.openLinkInIncognito());
  }

  setupNTP() {
    const shortcuts = [
      { name: 'Google', url: 'https://www.google.com', icon: 'G' },
      { name: 'YouTube', url: 'https://www.youtube.com', icon: '▶' },
      { name: 'GitHub', url: 'https://github.com', icon: '⚛' },
      { name: 'Twitter', url: 'https://twitter.com', icon: '𝕏' },
      { name: 'Reddit', url: 'https://reddit.com', icon: 'R' },
      { name: 'Wikipedia', url: 'https://wikipedia.org', icon: 'W' },
      { name: 'Amazon', url: 'https://amazon.com', icon: 'A' },
      { name: 'Netflix', url: 'https://netflix.com', icon: 'N' }
    ];

    const container = document.getElementById('ntpShortcuts');
    container.innerHTML = '';
    shortcuts.forEach(shortcut => {
      const el = document.createElement('div');
      el.className = 'ntp-shortcut';
      el.innerHTML = `
        <div class="ntp-shortcut-icon">${shortcut.icon}</div>
        <div class="ntp-shortcut-name">${shortcut.name}</div>
      `;
      el.addEventListener('click', () => this.navigate(shortcut.url));
      container.appendChild(el);
    });
  }

  createTab(url = 'about:blank', active = true) {
    const tabId = this.tabCounter++;
    const tab = {
      id: tabId,
      url: url,
      title: 'New Tab',
      favicon: '',
      history: [url],
      historyIndex: 0
    };
    this.tabs.push(tab);

    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.tabId = tabId;
    tabElement.innerHTML = `
      <div class="tab-favicon"></div>
      <div class="tab-title">New Tab</div>
      <button class="tab-close">&times;</button>
    `;

    tabElement.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) {
        this.switchTab(tabId);
      }
    });

    tabElement.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tabId);
    });

    tabElement.addEventListener('dblclick', (e) => {
      if (e.target.classList.contains('tab-title')) {
        document.getElementById('urlInput').focus();
      }
    });

    tabElement.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.closeTab(tabId);
      }
    });

    document.getElementById('tabsContainer').insertBefore(tabElement, document.getElementById('newTabBtn'));

    const contentElement = document.createElement('div');
    contentElement.className = 'tab-content';
    contentElement.dataset.tabId = tabId;
    contentElement.innerHTML = `
      <webview id="webview-${tabId}" class="webview" src="about:blank" partition="persist:main" style="width:100%;height:100%;"></webview>
    `;
    document.getElementById('tabContents').appendChild(contentElement);

    this.setupWebView(tabId, url);

    if (active) {
      this.switchTab(tabId);
    }

    return tabId;
  }

  setupWebView(tabId, url) {
    const webview = document.getElementById(`webview-${tabId}`);
    if (!webview) return;

    webview.addEventListener('did-start-loading', () => {
      const tab = this.tabs.find(t => t.id === tabId);
      if (tab) {
        this.updateTabLoading(tabId, true);
      }
    });

    webview.addEventListener('did-stop-loading', () => {
      this.updateTabLoading(tabId, false);
      const currentUrl = webview.getURL();
      this.addHistoryEntry(currentUrl, tabId);
    });

    webview.addEventListener('page-title-updated', (e) => {
      this.updateTabTitle(tabId, e.title);
    });

    webview.addEventListener('page-favicon-updated', (e) => {
      if (e.favicons && e.favicons.length > 0) {
        this.updateTabFavicon(tabId, e.favicons[0]);
      }
    });

    webview.addEventListener('did-navigate', (e) => {
      this.updateAddressBar(e.url);
      this.updateBookmarkButton(e.url);
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
      this.updateAddressBar(e.url);
      this.updateBookmarkButton(e.url);
    });

    webview.addEventListener('new-window', (e) => {
      e.preventDefault();
      this.navigate(e.url);
    });

    webview.addEventListener('did-fail-load', (e) => {
      if (e.errorCode !== -3) {
        this.showErrorPage(tabId, e.errorDescription);
      }
    });

    webview.addEventListener('console-message', (e) => {
      console.log('Webview console:', e.message);
    });

    webview.addEventListener('dom-ready', () => {
      webview.setZoomFactor(this.zoomLevel);
    });

    webview.addEventListener('did-create-popup', (e) => {
      e.preventDefault();
      this.navigate(e.url);
    });

    webview.addEventListener('did-redirect-navigation', (e) => {
      this.updateAddressBar(e.url);
    });

    if (url && url !== 'about:blank') {
      webview.src = url;
    }
  }

  switchTab(tabId) {
    this.activeTabId = tabId;
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));

    const tabElement = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    const contentElement = document.querySelector(`.tab-content[data-tab-id="${tabId}"]`);

    if (tabElement) tabElement.classList.add('active');
    if (contentElement) contentElement.classList.add('active');

    this.updateAddressBar(tab.url || '');
    this.updateBookmarkButton(tab.url);
    this.updateNavigationButtons();
    this.updateWindowTitle(tab.title);

    if (tab.url === 'about:blank' || !tab.url) {
      document.getElementById('newTabPage').classList.add('visible');
    } else {
      document.getElementById('newTabPage').classList.remove('visible');
    }
  }

  closeTab(tabId) {
    if (this.tabs.length <= 1) {
      window.close();
      return;
    }

    const index = this.tabs.findIndex(t => t.id === tabId);
    this.tabs.splice(index, 1);

    const tabElement = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    const contentElement = document.querySelector(`.tab-content[data-tab-id="${tabId}"]`);

    if (tabElement) tabElement.remove();
    if (contentElement) contentElement.remove();

    if (this.activeTabId === tabId) {
      const newIndex = Math.min(index, this.tabs.length - 1);
      this.switchTab(this.tabs[newIndex].id);
    }
  }

  newTab(url = 'about:blank') {
    this.createTab(url);
  }

  navigate(input) {
    let url = input.trim();
    if (!url) return;

    if (url === 'about:blank' || url === 'chrome://newtab') {
      this.showNewTabPage();
      return;
    }

    if (url.startsWith('chrome://')) {
      this.handleChromeUrl(url);
      return;
    }

    if (!url.includes('://') && !url.startsWith('data:')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        const searchEngine = this.settings.searchEngine || 'google';
        url = this.searchEngines[searchEngine] + encodeURIComponent(url);
      }
    }

    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview) {
      webview.src = url;
      document.getElementById('newTabPage').classList.remove('visible');
      this.updateTabUrl(this.activeTabId, url);
    }
  }

  handleChromeUrl(url) {
    switch (url) {
      case 'chrome://settings':
        this.showSettings();
        break;
      case 'chrome://history':
        this.showHistory();
        break;
      case 'chrome://bookmarks':
        this.showBookmarks();
        break;
      case 'chrome://downloads':
        this.toggleDownloadsPanel();
        break;
      case 'chrome://extensions':
        this.showExtensions();
        break;
      case 'chrome://about':
        this.showAbout();
        break;
      case 'chrome://flags':
        this.showFlags();
        break;
      default:
        break;
    }
  }

  goBack() {
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview && webview.canGoBack()) {
      webview.goBack();
    }
  }

  goForward() {
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview && webview.canGoForward()) {
      webview.goForward();
    }
  }

  reload() {
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview) {
      webview.reload();
    }
  }

  forceReload() {
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview) {
      webview.reloadIgnoringCache();
    }
  }

  stopLoading() {
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview) {
      webview.stop();
    }
  }

  goHome() {
    const homepage = this.settings.homepage || 'https://www.google.com';
    this.navigate(homepage);
  }

  updateAddressBar(url) {
    const urlInput = document.getElementById('urlInput');
    if (url && url !== 'about:blank') {
      urlInput.value = url;
      this.currentUrl = url;
      this.isNewTabPage = false;
    } else {
      urlInput.value = '';
      this.currentUrl = '';
    }
  }

  updateTabTitle(tabId, title) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.title = title || 'New Tab';
      const tabElement = document.querySelector(`.tab[data-tab-id="${tabId}"] .tab-title`);
      if (tabElement) {
        tabElement.textContent = title || 'New Tab';
      }
    }
    if (tabId === this.activeTabId) {
      this.updateWindowTitle(title);
    }
  }

  updateTabFavicon(tabId, favicon) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.favicon = favicon;
      const faviconElement = document.querySelector(`.tab[data-tab-id="${tabId}"] .tab-favicon`);
      if (faviconElement) {
        faviconElement.innerHTML = `<img src="${favicon}" alt="">`;
      }
    }
  }

  updateTabUrl(tabId, url) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.url = url;
    }
  }

  updateTabLoading(tabId, isLoading) {
    const tabElement = document.querySelector(`.tab[data-tab-id="${tabId}"] .tab-favicon`);
    if (tabElement) {
      if (isLoading) {
        tabElement.innerHTML = '<div class="loading">&#8635;</div>';
      } else {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab && tab.favicon) {
          tabElement.innerHTML = `<img src="${tab.favicon}" alt="">`;
        } else {
          tabElement.innerHTML = '';
        }
      }
    }
  }

  updateNavigationButtons() {
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview) {
      document.getElementById('backBtn').disabled = !webview.canGoBack();
      document.getElementById('forwardBtn').disabled = !webview.canGoForward();
    }
  }

  updateWindowTitle(title) {
    document.title = title ? `${title} - LiteBrowser` : 'LiteBrowser';
  }

  updateBookmarkButton(url) {
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const isBookmarked = this.bookmarks.some(b => b.url === url);
    bookmarkBtn.classList.toggle('bookmarked', isBookmarked);
  }

  addHistoryEntry(url, tabId) {
    if (!url || url === 'about:blank' || url.startsWith('chrome://')) return;

    const tab = this.tabs.find(t => t.id === tabId);
    const title = tab ? tab.title : url;

    const entry = {
      url: url,
      title: title || url,
      timestamp: Date.now(),
      favicon: tab ? tab.favicon : ''
    };

    browserAPI.history.add(entry);
    this.history.unshift(entry);
    if (this.history.length > 10000) {
      this.history = this.history.slice(0, 10000);
    }
  }

  toggleBookmark() {
    const url = this.currentUrl;
    if (!url) return;

    const existingIndex = this.bookmarks.findIndex(b => b.url === url);

    if (existingIndex >= 0) {
      this.bookmarks.splice(existingIndex, 1);
    } else {
      const tab = this.tabs.find(t => t.id === this.activeTabId);
      this.bookmarks.push({
        id: Date.now(),
        url: url,
        title: tab ? tab.title : url,
        favicon: tab ? tab.favicon : '',
        timestamp: Date.now()
      });
    }

    browserAPI.bookmarks.save(this.bookmarks);
    this.renderBookmarksBar();
    this.updateBookmarkButton(url);
  }

  renderBookmarksBar() {
    const container = document.getElementById('bookmarksList');
    container.innerHTML = '';

    this.bookmarks.forEach(bookmark => {
      const item = document.createElement('button');
      item.className = 'bookmark-item';
      item.innerHTML = `
        ${bookmark.favicon ? `<img src="${bookmark.favicon}" alt="">` : ''}
        <span>${bookmark.title || bookmark.url}</span>
      `;
      item.addEventListener('click', () => this.navigate(bookmark.url));
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showBookmarkContextMenu(e, bookmark);
      });
      container.appendChild(item);
    });
  }

  toggleBookmarksBar() {
    const bar = document.getElementById('bookmarksBar');
    bar.classList.toggle('visible');
    this.settings.showBookmarksBar = bar.classList.contains('visible');
    browserAPI.settings.save(this.settings);
  }

  bookmarkAllTabs() {
    this.tabs.forEach(tab => {
      if (tab.url && !this.bookmarks.some(b => b.url === tab.url)) {
        this.bookmarks.push({
          id: Date.now() + Math.random(),
          url: tab.url,
          title: tab.title,
          favicon: tab.favicon,
          timestamp: Date.now()
        });
      }
    });
    browserAPI.bookmarks.save(this.bookmarks);
    this.renderBookmarksBar();
  }

  zoomIn() {
    if (this.zoomLevel < 3) {
      this.zoomLevel = Math.min(3, this.zoomLevel + 0.1);
      this.applyZoom();
    }
  }

  zoomOut() {
    if (this.zoomLevel > 0.25) {
      this.zoomLevel = Math.max(0.25, this.zoomLevel - 0.1);
      this.applyZoom();
    }
  }

  zoomReset() {
    this.zoomLevel = 1;
    this.applyZoom();
  }

  applyZoom() {
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview) {
      webview.setZoomFactor(this.zoomLevel);
    }
    document.getElementById('zoomIndicator').textContent = `${Math.round(this.zoomLevel * 100)}%`;
    document.getElementById('menuZoomValue').textContent = `${Math.round(this.zoomLevel * 100)}%`;
    this.settings.zoomLevel = this.zoomLevel;
    browserAPI.settings.save(this.settings);
  }

  showFindBar() {
    const findBar = document.getElementById('findBar');
    findBar.classList.remove('hidden');
    document.getElementById('findInput').focus();
  }

  closeFindBar() {
    document.getElementById('findBar').classList.add('hidden');
    document.getElementById('findInput').value = '';
    document.getElementById('findCount').textContent = '0/0';
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview && webview.stopFindInPage) {
      webview.stopFindInPage('clearSelection');
    }
  }

  findInPage(text) {
    if (!text) {
      document.getElementById('findCount').textContent = '0/0';
      return;
    }
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview && webview.findInPage) {
      webview.findInPage(text, { forward: true, findNext: false });
    }
  }

  findNext() {
    const text = document.getElementById('findInput').value;
    if (!text) return;
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview && webview.findInPage) {
      webview.findInPage(text, { forward: true, findNext: true });
    }
  }

  findPrevious() {
    const text = document.getElementById('findInput').value;
    if (!text) return;
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview && webview.findInPage) {
      webview.findInPage(text, { forward: false, findNext: true });
    }
  }

  toggleMenu(e) {
    const menu = document.getElementById('menuOverlay');
    menu.classList.toggle('hidden');
    e.stopPropagation();
  }

  showContextMenu(e) {
    e.preventDefault();
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.classList.remove('hidden');
    contextMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 220)}px`;
    contextMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 300)}px`;
  }

  showHistory() {
    document.getElementById('menuOverlay').classList.add('hidden');
    const panel = document.createElement('div');
    panel.className = 'history-panel fade-in';
    panel.innerHTML = `
      <div class="history-header">
        <h2>History</h2>
        <button class="history-close">&times;</button>
      </div>
      <div class="history-search">
        <input type="text" class="history-search-input" placeholder="Search history">
      </div>
      <div class="history-content" id="historyContent"></div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('.history-close').addEventListener('click', () => panel.remove());

    const historyContent = panel.querySelector('#historyContent');
    this.renderHistory(historyContent);

    panel.querySelector('.history-search-input').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = this.history.filter(h =>
        h.title.toLowerCase().includes(query) || h.url.toLowerCase().includes(query)
      );
      this.renderHistory(historyContent, filtered);
    });
  }

  renderHistory(container, items = this.history) {
    container.innerHTML = '';
    const grouped = {};

    items.forEach(item => {
      const date = new Date(item.timestamp).toLocaleDateString();
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });

    Object.keys(grouped).forEach(date => {
      const dateHeader = document.createElement('div');
      dateHeader.className = 'history-date';
      dateHeader.textContent = date;
      container.appendChild(dateHeader);

      grouped[date].forEach(item => {
        const el = document.createElement('div');
        el.className = 'history-item';
        el.innerHTML = `
          <div class="history-item-icon">🌐</div>
          <div class="history-item-info">
            <div class="history-item-title">${item.title || item.url}</div>
            <div class="history-item-url">${item.url}</div>
          </div>
          <div class="history-item-time">${new Date(item.timestamp).toLocaleTimeString()}</div>
        `;
        el.addEventListener('click', () => {
          this.navigate(item.url);
          container.closest('.history-panel').remove();
        });
        container.appendChild(el);
      });
    });

    if (items.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">No history found</div>';
    }
  }

  showBookmarks() {
    document.getElementById('menuOverlay').classList.add('hidden');
    const panel = document.createElement('div');
    panel.className = 'history-panel fade-in';
    panel.innerHTML = `
      <div class="history-header">
        <h2>Bookmarks</h2>
        <button class="history-close">&times;</button>
      </div>
      <div class="history-content" id="bookmarksContent"></div>
    `;

    document.body.appendChild(panel);
    panel.querySelector('.history-close').addEventListener('click', () => panel.remove());

    const content = panel.querySelector('#bookmarksContent');
    if (this.bookmarks.length === 0) {
      content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">No bookmarks yet</div>';
    } else {
      this.bookmarks.forEach(bookmark => {
        const el = document.createElement('div');
        el.className = 'history-item';
        el.innerHTML = `
          <div class="history-item-icon">${bookmark.favicon ? `<img src="${bookmark.favicon}" width="16" height="16">` : '⭐'}</div>
          <div class="history-item-info">
            <div class="history-item-title">${bookmark.title || bookmark.url}</div>
            <div class="history-item-url">${bookmark.url}</div>
          </div>
        `;
        el.addEventListener('click', () => {
          this.navigate(bookmark.url);
          panel.remove();
        });
        content.appendChild(el);
      });
    }
  }

  showBookmarkContextMenu(e, bookmark) {
    const menu = document.getElementById('contextMenu');
    menu.classList.remove('hidden');
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
  }

  showSettings() {
    document.getElementById('menuOverlay').classList.add('hidden');
    const panel = document.createElement('div');
    panel.className = 'settings-panel fade-in';
    panel.innerHTML = `
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="settings-close">&times;</button>
      </div>
      <div class="settings-content">
        <div class="settings-nav">
          <button class="settings-nav-item active" data-section="appearance">🎨 Appearance</button>
          <button class="settings-nav-item" data-section="search">🔍 Search engine</button>
          <button class="settings-nav-item" data-section="startup">🚀 On startup</button>
          <button class="settings-nav-item" data-section="privacy">🔒 Privacy and security</button>
          <button class="settings-nav-item" data-section="downloads">💾 Downloads</button>
          <button class="settings-nav-item" data-section="languages">🌐 Languages</button>
          <button class="settings-nav-item" data-section="accessibility">♿ Accessibility</button>
          <button class="settings-nav-item" data-section="reset">⚙ Reset settings</button>
          <button class="settings-nav-item" data-section="about">ℹ️ About</button>
        </div>
        <div class="settings-section" id="settingsSection"></div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('.settings-close').addEventListener('click', () => panel.remove());

    const navItems = panel.querySelectorAll('.settings-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        this.renderSettingsSection(item.dataset.section, panel.querySelector('#settingsSection'));
      });
    });

    this.renderSettingsSection('appearance', panel.querySelector('#settingsSection'));
  }

  renderSettingsSection(section, container) {
    const sections = {
      appearance: () => `
        <h3>Appearance</h3>
        <div class="settings-group">
          <div class="settings-group-title">Theme</div>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Theme</div>
              <div class="settings-item-desc">Choose your theme</div>
            </div>
            <div class="settings-item-control">
              <select class="settings-select" id="settingTheme">
                <option value="system" ${this.settings.theme === 'system' ? 'selected' : ''}>System default</option>
                <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>Light</option>
              </select>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Show bookmarks bar</div>
              <div class="settings-item-desc">Show bookmarks bar below the address bar</div>
            </div>
            <div class="settings-item-control">
              <div class="toggle-switch ${this.settings.showBookmarksBar ? 'active' : ''}" id="settingBookmarksBar"></div>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Font size</div>
              <div class="settings-item-desc">Default font size for web pages</div>
            </div>
            <div class="settings-item-control">
              <select class="settings-select" id="settingFontSize">
                <option value="12" ${this.settings.fontSize === 12 ? 'selected' : ''}>Small</option>
                <option value="16" ${this.settings.fontSize === 16 ? 'selected' : ''}>Medium</option>
                <option value="20" ${this.settings.fontSize === 20 ? 'selected' : ''}>Large</option>
                <option value="24" ${this.settings.fontSize === 24 ? 'selected' : ''}>Extra large</option>
              </select>
            </div>
          </div>
        </div>
      `,
      search: () => `
        <h3>Search engine</h3>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Default search engine</div>
              <div class="settings-item-desc">Choose which search engine to use in the address bar</div>
            </div>
            <div class="settings-item-control">
              <select class="settings-select" id="settingSearchEngine">
                <option value="google" ${this.settings.searchEngine === 'google' ? 'selected' : ''}>Google</option>
                <option value="bing" ${this.settings.searchEngine === 'bing' ? 'selected' : ''}>Bing</option>
                <option value="duckduckgo" ${this.settings.searchEngine === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo</option>
                <option value="yahoo" ${this.settings.searchEngine === 'yahoo' ? 'selected' : ''}>Yahoo</option>
                <option value="brave" ${this.settings.searchEngine === 'brave' ? 'selected' : ''}>Brave</option>
              </select>
            </div>
          </div>
        </div>
      `,
      startup: () => `
        <h3>On startup</h3>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Continue where you left off</div>
              <div class="settings-item-desc">Reopen the pages that were open last time</div>
            </div>
            <div class="settings-item-control">
              <div class="toggle-switch ${this.settings.restoreSession ? 'active' : ''}" id="settingRestoreSession"></div>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Homepage</div>
              <div class="settings-item-desc">Page to open when you click the Home button</div>
            </div>
            <div class="settings-item-control">
              <input type="text" class="settings-input" id="settingHomepage" value="${this.settings.homepage || 'https://www.google.com'}">
            </div>
          </div>
        </div>
      `,
      privacy: () => `
        <h3>Privacy and security</h3>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Do Not Track</div>
              <div class="settings-item-desc">Send a Do Not Track request with your browsing traffic</div>
            </div>
            <div class="settings-item-control">
              <div class="toggle-switch ${this.settings.doNotTrack ? 'active' : ''}" id="settingDoNotTrack"></div>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Block ads</div>
              <div class="settings-item-desc">Block advertisements on websites</div>
            </div>
            <div class="settings-item-control">
              <div class="toggle-switch ${this.settings.blockAds ? 'active' : ''}" id="settingBlockAds"></div>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Save passwords</div>
              <div class="settings-item-desc">Offer to save passwords when you sign in</div>
            </div>
            <div class="settings-item-control">
              <div class="toggle-switch ${this.settings.passwordSave ? 'active' : ''}" id="settingPasswordSave"></div>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Clear browsing data on exit</div>
              <div class="settings-item-desc">Clear history, cookies, and cache when you close the browser</div>
            </div>
            <div class="settings-item-control">
              <div class="toggle-switch ${this.settings.clearOnExit ? 'active' : ''}" id="settingClearOnExit"></div>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Clear browsing data</div>
              <div class="settings-item-desc">Delete browsing history, cookies, cached images and files</div>
            </div>
            <div class="settings-item-control">
              <button class="settings-btn" id="clearBrowsingData">Clear data</button>
            </div>
          </div>
        </div>
      `,
      downloads: () => `
        <h3>Downloads</h3>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Download location</div>
              <div class="settings-item-desc">Choose where to save downloaded files</div>
            </div>
            <div class="settings-item-control">
              <button class="settings-btn" id="changeDownloadPath">Change</button>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Ask where to save each file</div>
              <div class="settings-item-desc">Show a save dialog before each download</div>
            </div>
            <div class="settings-item-control">
              <div class="toggle-switch ${this.settings.askDownload ? 'active' : ''}" id="settingAskDownload"></div>
            </div>
          </div>
        </div>
      `,
      languages: () => `
        <h3>Languages</h3>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Spell check</div>
              <div class="settings-item-desc">Check spelling while you type</div>
            </div>
            <div class="settings-item-control">
              <div class="toggle-switch ${this.settings.spellCheck !== false ? 'active' : ''}" id="settingSpellCheck"></div>
            </div>
          </div>
        </div>
      `,
      accessibility: () => `
        <h3>Accessibility</h3>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Accessibility features</div>
              <div class="settings-item-desc">Configure accessibility settings</div>
            </div>
          </div>
        </div>
      `,
      reset: () => `
        <h3>Reset settings</h3>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">Restore settings to their original defaults</div>
              <div class="settings-item-desc">Reset all browser settings to default</div>
            </div>
            <div class="settings-item-control">
              <button class="settings-btn" id="resetSettings">Reset</button>
            </div>
          </div>
        </div>
      `,
      about: () => `
        <h3>About LiteBrowser</h3>
        <div class="settings-group">
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-title">LiteBrowser</div>
              <div class="settings-item-desc">Version 1.0.0</div>
            </div>
          </div>
        </div>
      `
    };

    container.innerHTML = sections[section] ? sections[section]() : '';
    this.setupSettingsListeners(container);
  }

  setupSettingsListeners(container) {
    const toggleSwitch = (id, key) => {
      const el = container.querySelector(`#${id}`);
      if (el) {
        el.addEventListener('click', () => {
          el.classList.toggle('active');
          this.settings[key] = el.classList.contains('active');
          browserAPI.settings.save(this.settings);
        });
      }
    };

    toggleSwitch('settingBookmarksBar', 'showBookmarksBar');
    toggleSwitch('settingDoNotTrack', 'doNotTrack');
    toggleSwitch('settingBlockAds', 'blockAds');
    toggleSwitch('settingPasswordSave', 'passwordSave');
    toggleSwitch('settingClearOnExit', 'clearOnExit');
    toggleSwitch('settingRestoreSession', 'restoreSession');
    toggleSwitch('settingAskDownload', 'askDownload');
    toggleSwitch('settingSpellCheck', 'spellCheck');

    const selectSetting = (id, key) => {
      const el = container.querySelector(`#${id}`);
      if (el) {
        el.addEventListener('change', (e) => {
          this.settings[key] = e.target.value;
          browserAPI.settings.save(this.settings);
        });
      }
    };

    selectSetting('settingTheme', 'theme');
    selectSetting('settingSearchEngine', 'searchEngine');
    selectSetting('settingFontSize', 'fontSize');

    const homepageInput = container.querySelector('#settingHomepage');
    if (homepageInput) {
      homepageInput.addEventListener('change', (e) => {
        this.settings.homepage = e.target.value;
        browserAPI.settings.save(this.settings);
      });
    }

    const changeDownloadPath = container.querySelector('#changeDownloadPath');
    if (changeDownloadPath) {
      changeDownloadPath.addEventListener('click', async () => {
        const path = await browserAPI.settings.selectDownloadPath();
        if (path) {
          this.settings.downloadsPath = path;
          browserAPI.settings.save(this.settings);
          browserAPI.settings.setDownloadPath(path);
        }
      });
    }

    const clearBrowsingDataBtn = container.querySelector('#clearBrowsingData');
    if (clearBrowsingDataBtn) {
      clearBrowsingDataBtn.addEventListener('click', () => this.showClearBrowsingData());
    }

    const resetSettingsBtn = container.querySelector('#resetSettings');
    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all settings to default?')) {
          browserAPI.settings.save({
            homepage: 'https://www.google.com',
            searchEngine: 'google',
            fontSize: 16,
            blockAds: false,
            doNotTrack: true,
            clearOnExit: false,
            showBookmarksBar: true,
            passwordSave: true,
            theme: 'system',
            zoomLevel: 1
          });
          location.reload();
        }
      });
    }
  }

  toggleDownloadsPanel() {
    document.getElementById('menuOverlay').classList.add('hidden');
    let panel = document.querySelector('.downloads-panel');
    if (panel) {
      panel.remove();
      return;
    }

    panel = document.createElement('div');
    panel.className = 'downloads-panel fade-in';
    panel.innerHTML = `
      <div class="downloads-header">
        <h3>Downloads</h3>
        <button class="history-close">&times;</button>
      </div>
      <div class="downloads-list" id="downloadsList"></div>
    `;

    document.body.appendChild(panel);
    panel.querySelector('.history-close').addEventListener('click', () => panel.remove());

    const list = panel.querySelector('#downloadsList');
    if (this.downloads.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">No downloads</div>';
    } else {
      this.downloads.forEach(download => {
        const el = document.createElement('div');
        el.className = 'download-item';
        el.innerHTML = `
          <div class="download-icon">📄</div>
          <div class="download-info">
            <div class="download-name">${download.name}</div>
            <div class="download-size">${this.formatSize(download.size)}</div>
            <div class="download-progress">
              <div class="download-progress-bar" style="width:${download.progress}%"></div>
            </div>
          </div>
          <div class="download-actions">
            <button class="download-action-btn" title="Open">📂</button>
          </div>
        `;
        list.appendChild(el);
      });
    }
  }

  formatSize(bytes) {
    if (!bytes) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  showSiteInfo() {
    const url = this.currentUrl;
    if (!url) return;

    const dialog = document.getElementById('dialogOverlay');
    const title = document.getElementById('dialogTitle');
    const body = document.getElementById('dialogBody');
    const footer = document.getElementById('dialogFooter');

    title.textContent = 'Site Information';
    body.innerHTML = `
      <div style="padding:8px 0;">
        <p><strong>URL:</strong> ${url}</p>
        <p style="margin-top:8px;"><strong>Connection:</strong> ${url.startsWith('https') ? '🔒 Secure' : '⚠️ Not secure'}</p>
      </div>
    `;
    footer.innerHTML = '<button class="dialog-btn primary" onclick="document.getElementById(\'dialogOverlay\').classList.add(\'hidden\')">OK</button>';

    dialog.classList.remove('hidden');
  }

  showClearBrowsingData() {
    document.getElementById('menuOverlay').classList.add('hidden');
    const dialog = document.getElementById('dialogOverlay');
    const title = document.getElementById('dialogTitle');
    const body = document.getElementById('dialogBody');
    const footer = document.getElementById('dialogFooter');

    title.textContent = 'Clear browsing data';
    body.innerHTML = `
      <div style="padding:8px 0;">
        <p>Choose what to clear:</p>
        <div style="margin-top:16px;">
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <input type="checkbox" id="clearHistory" checked> Browsing history
          </label>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <input type="checkbox" id="clearCookies" checked> Cookies and other site data
          </label>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <input type="checkbox" id="clearCache" checked> Cached images and files
          </label>
        </div>
      </div>
    `;
    footer.innerHTML = `
      <button class="dialog-btn secondary" onclick="document.getElementById('dialogOverlay').classList.add('hidden')">Cancel</button>
      <button class="dialog-btn primary" id="clearDataConfirm">Clear data</button>
    `;

    dialog.classList.remove('hidden');

    document.getElementById('clearDataConfirm').addEventListener('click', async () => {
      const clearHistory = document.getElementById('clearHistory').checked;
      const clearCookies = document.getElementById('clearCookies').checked;
      const clearCache = document.getElementById('clearCache').checked;

      if (clearHistory) {
        await browserAPI.history.clear();
        this.history = [];
      }
      if (clearCookies || clearCache) {
        const ses = require('electron').remote?.session || null;
      }

      dialog.classList.add('hidden');
    });
  }

  showExtensions() {
    document.getElementById('menuOverlay').classList.add('hidden');
    const dialog = document.getElementById('dialogOverlay');
    const title = document.getElementById('dialogTitle');
    const body = document.getElementById('dialogBody');
    const footer = document.getElementById('dialogFooter');

    title.textContent = 'Extensions';
    body.innerHTML = `
      <div style="padding:16px 0;text-align:center;color:var(--text-secondary);">
        <p>Extensions are not yet supported in LiteBrowser.</p>
        <p style="margin-top:8px;">This feature will be added in a future update.</p>
      </div>
    `;
    footer.innerHTML = '<button class="dialog-btn primary" onclick="document.getElementById(\'dialogOverlay\').classList.add(\'hidden\')">OK</button>';

    dialog.classList.remove('hidden');
  }

  showAbout() {
    document.getElementById('menuOverlay').classList.add('hidden');
    const panel = document.createElement('div');
    panel.className = 'about-panel fade-in';
    panel.innerHTML = `
      <div class="about-logo">
        <svg viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="45" fill="#8ab4f8"/>
          <path d="M30 50 L45 35 L45 45 L70 45 L70 55 L45 55 L45 65 Z" fill="white"/>
        </svg>
      </div>
      <div class="about-title">LiteBrowser</div>
      <div class="about-version">Version 1.0.0</div>
      <div class="about-info">
        <p>A lightweight, fast, and secure web browser</p>
        <p>Built with Electron</p>
      </div>
      <button class="about-close">Close</button>
    `;

    document.body.appendChild(panel);
    panel.querySelector('.about-close').addEventListener('click', () => panel.remove());
  }

  showShortcuts() {
    document.getElementById('menuOverlay').classList.add('hidden');
    const dialog = document.getElementById('dialogOverlay');
    const title = document.getElementById('dialogTitle');
    const body = document.getElementById('dialogBody');
    const footer = document.getElementById('dialogFooter');

    title.textContent = 'Keyboard Shortcuts';
    body.innerHTML = `
      <div style="max-height:400px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">New tab</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+T</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">New window</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+N</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Close tab</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+W</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Reopen closed tab</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+Shift+T</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Go to address bar</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+L</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Find in page</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+F</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Reload</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+R</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Force reload</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+Shift+R</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Zoom in</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl++</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Zoom out</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+-</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Reset zoom</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+0</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Full screen</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">F11</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Bookmark page</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+D</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">History</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+H</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Downloads</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+J</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Settings</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+,</td></tr>
          <tr><td style="padding:6px;border-bottom:1px solid var(--border);">Developer tools</td><td style="padding:6px;border-bottom:1px solid var(--border);text-align:right;color:var(--text-secondary);">Ctrl+Shift+I</td></tr>
          <tr><td style="padding:6px;">Print</td><td style="padding:6px;text-align:right;color:var(--text-secondary);">Ctrl+P</td></tr>
        </table>
      </div>
    `;
    footer.innerHTML = '<button class="dialog-btn primary" onclick="document.getElementById(\'dialogOverlay\').classList.add(\'hidden\')">Close</button>';

    dialog.classList.remove('hidden');
  }

  showMoreTools() {
    const dialog = document.getElementById('dialogOverlay');
    const title = document.getElementById('dialogTitle');
    const body = document.getElementById('dialogBody');
    const footer = document.getElementById('dialogFooter');

    title.textContent = 'More tools';
    body.innerHTML = `
      <div style="padding:8px 0;">
        <button class="settings-btn" style="width:100%;margin-bottom:8px;" onclick="document.getElementById('dialogOverlay').classList.add('hidden')">Developer tools</button>
        <button class="settings-btn" style="width:100%;margin-bottom:8px;" onclick="document.getElementById('dialogOverlay').classList.add('hidden')">Task manager</button>
        <button class="settings-btn" style="width:100%;margin-bottom:8px;" onclick="document.getElementById('dialogOverlay').classList.add('hidden')">Relaunch</button>
      </div>
    `;
    footer.innerHTML = '<button class="dialog-btn secondary" onclick="document.getElementById(\'dialogOverlay\').classList.add(\'hidden\')">Cancel</button>';

    dialog.classList.remove('hidden');
  }

  showFlags() {
    const dialog = document.getElementById('dialogOverlay');
    const title = document.getElementById('dialogTitle');
    const body = document.getElementById('dialogBody');
    const footer = document.getElementById('dialogFooter');

    title.textContent = 'LiteBrowser Flags';
    body.innerHTML = `
      <div style="padding:8px 0;color:var(--text-secondary);">
        <p>Experimental features are not available in this version.</p>
      </div>
    `;
    footer.innerHTML = '<button class="dialog-btn primary" onclick="document.getElementById(\'dialogOverlay\').classList.add(\'hidden\')">OK</button>';

    dialog.classList.remove('hidden');
  }

  showNewTabPage() {
    document.getElementById('newTabPage').classList.add('visible');
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview) {
      webview.src = 'about:blank';
    }
    this.isNewTabPage = true;
    document.getElementById('urlInput').value = '';
    document.getElementById('urlInput').focus();
  }

  showErrorPage(tabId, error) {
    const webview = document.getElementById(`webview-${tabId}`);
    if (webview) {
      webview.loadURL(`data:text/html,<html><body style="background:#202124;color:#e8eaed;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h1 style="font-size:24px;">Something went wrong</h1><p style="color:#9aa0a6;margin-top:12px;">${error || 'Unable to load the page'}</p><button onclick="history.back()" style="margin-top:20px;padding:10px 24px;background:#8ab4f8;border:none;border-radius:4px;cursor:pointer;">Go back</button></div></body></html>`);
    }
  }

  handleUrlInput(value) {
    if (value.includes('://') || value.includes('.')) {
      document.getElementById('urlInput').style.color = 'var(--text-primary)';
    }
  }

  copyLinkAddress() {
    if (this.currentUrl) {
      browserAPI.clipboard.writeText(this.currentUrl);
    }
    document.getElementById('contextMenu').classList.add('hidden');
  }

  openLinkInNewTab() {
    document.getElementById('contextMenu').classList.add('hidden');
  }

  openLinkInNewWindow() {
    document.getElementById('contextMenu').classList.add('hidden');
  }

  openLinkInIncognito() {
    document.getElementById('contextMenu').classList.add('hidden');
  }

  saveCurrentPage() {
    document.getElementById('contextMenu').classList.add('hidden');
  }

  viewSource() {
    document.getElementById('contextMenu').classList.add('hidden');
  }

  toggleDevTools() {
    document.getElementById('contextMenu').classList.add('hidden');
  }

  pasteAndGo() {
    const text = browserAPI.clipboard.readText();
    if (text) {
      this.navigate(text);
    }
  }

  openFile(filePath) {
    this.navigate('file://' + filePath);
  }

  savePage(filePath) {
    const webview = document.getElementById(`webview-${this.activeTabId}`);
    if (webview && webview.getPrintMargins) {
      browserAPI.external.open('file://' + filePath);
    }
  }

  switchToNextTab() {
    const currentIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
    const nextIndex = (currentIndex + 1) % this.tabs.length;
    this.switchTab(this.tabs[nextIndex].id);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.browser = new LiteBrowser();
});
