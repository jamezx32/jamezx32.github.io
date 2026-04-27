(function () {
  const STORAGE_KEYS = {
    sidebarCollapsed: "sxy-site-sidebar-collapsed",
    tocCollapsed: "sxy-site-toc-collapsed",
    safariSidebarLayoutVersion: "sxy-site-safari-sidebar-layout-version",
  };
  const SAFARI_SIDEBAR_LAYOUT_VERSION = "2026-04-09-v5";
  const EARLY_USER_AGENT = navigator.userAgent || "";
  const EARLY_VENDOR = navigator.vendor || "";
  const NON_SAFARI_UA_RE = /Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS|DuckDuckGo|Electron|Atlas|Android/i;
  const IS_EARLY_SAFARI =
    /Safari/i.test(EARLY_USER_AGENT) &&
    /Apple/i.test(EARLY_VENDOR) &&
    !NON_SAFARI_UA_RE.test(EARLY_USER_AGENT);

  function migrateEarlySafariSidebarState() {
    try {
      if (!IS_EARLY_SAFARI) return;

      const currentVersion = window.localStorage.getItem(STORAGE_KEYS.safariSidebarLayoutVersion);
      if (currentVersion === SAFARI_SIDEBAR_LAYOUT_VERSION) {
        return;
      }

      window.localStorage.removeItem(STORAGE_KEYS.sidebarCollapsed);
      window.localStorage.removeItem(STORAGE_KEYS.tocCollapsed);
      window.localStorage.setItem(
        STORAGE_KEYS.safariSidebarLayoutVersion,
        SAFARI_SIDEBAR_LAYOUT_VERSION
      );
    } catch {
      // Ignore storage failures in private or restricted environments.
    }
  }

  migrateEarlySafariSidebarState();

  try {
    if (window.localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === "true") {
      document.documentElement.classList.add("sidebar-collapsed");
    }
    if (window.localStorage.getItem(STORAGE_KEYS.tocCollapsed) === "true") {
      document.documentElement.classList.add("toc-collapsed");
    }
  } catch {
    // Ignore storage failures in private or restricted environments.
  }

  const SELECTORS = {
    footerRoot: ".md-footer",
    footerInner: ".md-footer-meta__inner",
    footerTime: ".custom-footer-time",
    headerRoot: ".md-header",
    headerTitle: '.md-header__title[data-md-component="header-title"]',
    headerSiteTopicText:
      '.md-header__title .md-header__topic:not([data-md-component="header-topic"]) .md-ellipsis',
    headerTopic: '.md-header__topic[data-md-component="header-topic"]',
    headerTopicText: '.md-header__topic[data-md-component="header-topic"] .md-ellipsis',
    pageHeading: ".md-content__inner h1",
    sidebarToggle: ".site-sidebar-toggle",
    tabsRoot: ".md-tabs",
    topButton: '[data-md-component="top"]',
    tocRoot: ".md-sidebar--secondary",
    tocInner: ".md-sidebar--secondary .md-sidebar__inner",
    tocLinks: ".md-sidebar--secondary .md-nav__link[href]",
    tocHeading: ".site-toc-heading",
    tocToggle: ".site-toc-toggle",
    paletteForm: '.md-header__option[data-md-component="palette"]',
    codeBlocks: ".md-typeset .highlight",
  };
  const APP = {
    timers: {
      footer: null,
    },
    observers: {
      footer: null,
      headerTitle: null,
    },
  };

  const TOP_BUTTON_LABEL = "回到顶部";

  const LANGUAGE_ALIASES = {
    js: "Javascript",
    javascript: "Javascript",
    ts: "Typescript",
    typescript: "Typescript",
    py: "Python",
    python: "Python",
    c: "C",
    cpp: "C++",
    "c++": "C++",
    cc: "C++",
    cxx: "C++",
    java: "Java",
    kotlin: "Kotlin",
    rust: "Rust",
    go: "Go",
    php: "PHP",
    ruby: "Ruby",
    swift: "Swift",
    html: "HTML",
    xml: "XML",
    css: "CSS",
    scss: "SCSS",
    sass: "Sass",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    toml: "TOML",
    ini: "INI",
    bash: "Bash",
    shell: "Shell",
    sh: "Shell",
    zsh: "Zsh",
    powershell: "PowerShell",
    ps1: "PowerShell",
    markdown: "Markdown",
    md: "Markdown",
    sql: "SQL",
    diff: "Diff",
    text: "Text",
    plaintext: "Text",
  };

  function isElement(node) {
    return node instanceof Element;
  }

  function isHTMLElement(node) {
    return node instanceof HTMLElement;
  }

  function resolveRoot(root) {
    return root instanceof Document || root instanceof Element ? root : document;
  }

  function queryAll(root, selector) {
    if (!root || !selector) return [];
    return Array.from(root.querySelectorAll(selector));
  }

  function getTextContent(node) {
    if (!node) return "";
    return node.textContent.replace(/\s+/g, " ").trim();
  }

  function getPageHeadingText() {
    const heading = document.querySelector(SELECTORS.pageHeading);
    if (!heading) return "";

    const clone = heading.cloneNode(true);
    if (clone instanceof HTMLElement) {
      queryAll(clone, ".headerlink").forEach(function (node) {
        node.remove();
      });
    }

    return getTextContent(clone);
  }

  function normalizeHref(href) {
    if (!href) return "";

    try {
      const url = new URL(href, window.location.origin);
      let pathname = url.pathname.replace(/index\.html$/, "");
      if (pathname.length > 1) {
        pathname = pathname.replace(/\/+$/, "");
      }
      return pathname;
    } catch {
      return href.trim();
    }
  }

  function isSameDocumentUrl(url) {
    return (
      url.origin === window.location.origin &&
      normalizeHref(url.pathname) === normalizeHref(window.location.pathname) &&
      url.search === window.location.search
    );
  }

  function resolveHashTarget(hash) {
    if (!hash || hash === "#") return null;

    let decoded = hash.slice(1);
    if (!decoded) return null;

    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // Keep the raw fragment when decoding fails.
    }

    const byId = document.getElementById(decoded);
    if (byId) return byId;

    const escaped = window.CSS && typeof window.CSS.escape === "function"
      ? window.CSS.escape(decoded)
      : decoded.replace(/["\\]/g, "\\$&");

    return (
      document.querySelector('[id="' + escaped + '"]') ||
      document.querySelector('[name="' + escaped + '"]')
    );
  }

  function isSafariBrowser() {
    const ua = navigator.userAgent || "";
    const vendor = navigator.vendor || "";

    return (
      /Safari/i.test(ua) &&
      /Apple/i.test(vendor) &&
      !NON_SAFARI_UA_RE.test(ua)
    );
  }

  function isAtlasBrowser() {
    const ua = navigator.userAgent || "";
    const vendor = navigator.vendor || "";

    return (
      /Atlas/i.test(ua) ||
      /Atlas/i.test(vendor) ||
      /OpenAI/i.test(ua) ||
      /ChatGPT/i.test(ua) ||
      /ChatGPT/i.test(vendor)
    );
  }

  function isEdgeBrowser() {

    return /Edg\//i.test(navigator.userAgent || "");

  }

  function subscribePageChanges(callback) {
    if (typeof document$ !== "undefined" && document$.subscribe) {
      document$.subscribe(function () {
        callback(document);
      });
      return;
    }

    document.addEventListener("DOMContentLoaded", function () {
      callback(document);
    });
  }

  const pageTypeModule = (function () {
    const PAGE_CLASSES = ["page-home", "page-overview", "page-article"];
    const OVERVIEW_PATHS = ["/v8", "/jsc", "/chakracore"];

    function getPageType() {
      const pathname = normalizeHref(window.location.pathname);

      if (!pathname || pathname === "/") {
        return "home";
      }

      if (OVERVIEW_PATHS.indexOf(pathname) !== -1) {
        return "overview";
      }

      return "article";
    }

    return {
      init: function () {
        const root = document.documentElement;
        if (!root) return;

        root.classList.remove.apply(root.classList, PAGE_CLASSES);
        root.classList.add("page-" + getPageType());
      },
    };
  })();

  const footerModule = (function () {
    function syncFooterMetrics() {
      if (!document.documentElement) return;

      const footerRoot = document.querySelector(SELECTORS.footerRoot);
      if (!isHTMLElement(footerRoot)) {
        document.documentElement.style.removeProperty("--site-footer-height");
        return;
      }

      document.documentElement.style.setProperty(
        "--site-footer-height",
        Math.ceil(footerRoot.getBoundingClientRect().height) + "px"
      );
    }

    function observeFooterMetrics() {
      if (APP.observers.footer) {
        APP.observers.footer.disconnect();
        APP.observers.footer = null;
      }

      if (typeof ResizeObserver !== "function") {
        syncFooterMetrics();
        return;
      }

      const footerRoot = document.querySelector(SELECTORS.footerRoot);
      if (!isHTMLElement(footerRoot)) {
        return;
      }

      APP.observers.footer = new ResizeObserver(syncFooterMetrics);
      APP.observers.footer.observe(footerRoot);
    }

    function formatChinaTime() {
      const formatter = new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const parts = formatter.formatToParts(new Date());
      const map = {};

      for (const part of parts) {
        if (part.type !== "literal") {
          map[part.type] = part.value;
        }
      }

      return (
        map.year +
        "年" +
        map.month +
        "月" +
        map.day +
        "日 " +
        map.hour +
        ":" +
        map.minute +
        ":" +
        map.second
      );
    }

    return {
      init: function () {
        const footer = document.querySelector(SELECTORS.footerInner);

        if (APP.timers.footer) {
          clearInterval(APP.timers.footer);
          APP.timers.footer = null;
        }

        syncFooterMetrics();
        observeFooterMetrics();

        if (!footer) return;

        let timeBlock = document.querySelector(SELECTORS.footerTime);
        if (!timeBlock) {
          timeBlock = document.createElement("div");
          timeBlock.className = "custom-footer-time";
          footer.appendChild(timeBlock);
        }

        function update() {
          timeBlock.textContent = formatChinaTime();
        }

        update();
        syncFooterMetrics();
        APP.timers.footer = window.setInterval(update, 1000);
      },
    };
  })();

  const browserClassModule = (function () {
    return {
      init: function () {
        const isSafari = isSafariBrowser();
        const isEdge = isEdgeBrowser();
        const forcedAtlas =
          !isSafari &&
          (
            window.location.search.includes("force_atlas=1") ||
            window.localStorage.getItem("sxy-force-atlas") === "true"
          );
        const isAtlas = !isSafari && (forcedAtlas || isAtlasBrowser());

        document.documentElement.classList.toggle("site-browser-safari", isSafari);
        document.documentElement.classList.toggle("site-browser-atlas", isAtlas);
        document.documentElement.classList.toggle("site-browser-edge", isEdge);

        if (document.body) {
          document.body.classList.toggle("is-atlas", isAtlas);
          document.body.classList.toggle("is-safari", isSafari);
          document.body.classList.toggle("is-edge", isEdge);
        }
      },
    };
  })();

  const headerTitleModule = (function () {
    function isDesktopTabsViewport() {
      return window.matchMedia("(min-width: 45em)").matches;
    }

    function syncHeaderTitle() {
      const root = document.documentElement;
      const headerTopic = document.querySelector(SELECTORS.headerTopicText);
      const headerSiteTopic = document.querySelector(SELECTORS.headerSiteTopicText);
      const headerTitle = document.querySelector(SELECTORS.headerTitle);
      const title = getPageHeadingText();

      if (!headerTitle) return;

      const defaultTitle =
        headerTitle.dataset.siteTitleDefault ||
        getTextContent(headerSiteTopic) ||
        "SXY Research Notes";

      headerTitle.dataset.siteTitleDefault = defaultTitle;

      if (!isDesktopTabsViewport()) {
        headerTitle.removeAttribute("data-site-title-ready");
        headerTitle.removeAttribute("data-site-title-mode");
        if (headerSiteTopic) {
          headerSiteTopic.textContent = defaultTitle;
        }
        if (headerTopic && title) {
          headerTopic.textContent = title;
        }
        return;
      }

      if (title) {
        headerTitle.setAttribute("data-page-title", title);
      } else {
        headerTitle.removeAttribute("data-page-title");
      }

      if (headerSiteTopic) {
        headerSiteTopic.textContent = defaultTitle;
      }

      if (headerTopic && title) {
        headerTopic.textContent = title;
      }

      headerTitle.setAttribute("data-site-title-ready", "true");
      headerTitle.setAttribute(
        "data-site-title-mode",
        root.classList.contains("site-tabs-collapsed") && title ? "page" : "site"
      );
    }

    function observeHeaderState() {
      if (APP.observers.headerTitle) {
        APP.observers.headerTitle.disconnect();
        APP.observers.headerTitle = null;
      }

      if (typeof MutationObserver !== "function" || !document.documentElement) {
        return;
      }

      APP.observers.headerTitle = new MutationObserver(function (mutations) {
        const shouldSync = mutations.some(function (mutation) {
          return mutation.type === "attributes" && mutation.attributeName === "class";
        });

        if (shouldSync) {
          window.requestAnimationFrame(syncHeaderTitle);
        }
      });

      APP.observers.headerTitle.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    function bindEvents() {
      if (document.documentElement.dataset.siteHeaderTitleBound === "true") {
        return;
      }

      window.addEventListener("resize", function () {
        window.requestAnimationFrame(syncHeaderTitle);
      }, { passive: true });
      document.documentElement.dataset.siteHeaderTitleBound = "true";
    }

    return {
      init: function () {
        bindEvents();
        observeHeaderState();
        window.requestAnimationFrame(syncHeaderTitle);
      },
    };
  })();

  const tocModule = (function () {
    let activeEntries = [];

    function ensureHeading(title) {
      const tocInner = document.querySelector(SELECTORS.tocInner);
      if (!tocInner) return;

      let heading = tocInner.querySelector(SELECTORS.tocHeading);
      if (!title) {
        if (heading) {
          heading.remove();
        }
        return;
      }

      if (!heading) {
        heading = document.createElement("div");
        heading.className = "site-toc-heading";
        heading.innerHTML =
          '<div class="site-toc-heading__eyebrow">On this page</div>' +
          '<div class="site-toc-heading__title"></div>';

        const nav = tocInner.querySelector(".md-nav--secondary, .md-nav[data-md-level='1']");
        if (nav) {
          tocInner.insertBefore(heading, nav);
        } else {
          tocInner.appendChild(heading);
        }
      }

      const titleNode = heading.querySelector(".site-toc-heading__title");
      if (titleNode) {
        titleNode.textContent = title;
      }
    }

    function applyTitle() {
      const tocRoot = document.querySelector(SELECTORS.tocRoot);
      if (!tocRoot) return;

      const title = getPageHeadingText();
      const titleLabels = Array.from(tocRoot.querySelectorAll(".md-nav__title"));
      if (title) {
        tocRoot.setAttribute("data-page-title", title);
        titleLabels.forEach(function (label) {
          label.setAttribute("data-page-title", title);
        });
      } else {
        tocRoot.removeAttribute("data-page-title");
        titleLabels.forEach(function (label) {
          label.removeAttribute("data-page-title");
        });
      }

      ensureHeading(title);
    }

    function getTopOffset() {
      let offset = 24;
      const header = document.querySelector(SELECTORS.headerRoot);
      const tabs = document.querySelector(SELECTORS.tabsRoot);
      const tabsCollapsed = document.documentElement.classList.contains("site-tabs-collapsed");

      if (isHTMLElement(header)) {
        offset += header.getBoundingClientRect().height;
      }

      if (isHTMLElement(tabs) && !tabsCollapsed) {
        offset += tabs.getBoundingClientRect().height;
      }

      return offset;
    }

    function normalizeHash(hash) {
      if (!hash) return "";

      try {
        return "#" + decodeURIComponent(hash.slice(1));
      } catch {
        return hash;
      }
    }

    function hashesMatch(left, right) {
      if (!left || !right) return false;

      return normalizeHash(left) === normalizeHash(right);
    }

    function clearMaterialTocState() {
      const tocRoot = document.querySelector(SELECTORS.tocRoot);
      if (!tocRoot) return;

      queryAll(tocRoot, ".md-nav__link").forEach(function (link) {
        if (!isHTMLElement(link)) return;
        link.classList.remove("md-nav__link--active", "md-nav__link--passed");
      });
    }

    function clearInteractiveState() {
      const tocRoot = document.querySelector(SELECTORS.tocRoot);
      if (!tocRoot) return;

      queryAll(tocRoot, ".md-nav__link").forEach(function (link) {
        if (!isHTMLElement(link)) return;
        link.classList.remove("site-toc-link--current", "site-toc-link--hovered");
        link.removeAttribute("aria-current");
      });
    }

    function isSupportedTocHeading(target) {
      if (!isHTMLElement(target)) return false;

      const tagName = target.tagName.toUpperCase();
      return tagName === "H1" || tagName === "H2";
    }

    function getEntries() {
      const tocRoot = document.querySelector(SELECTORS.tocRoot);
      if (!tocRoot) return [];

      const seen = new Set();

      return queryAll(tocRoot, SELECTORS.tocLinks)
        .map(function (link) {
          let url;

          try {
            url = new URL(link.href, window.location.href);
          } catch {
            return null;
          }

          if (!isSameDocumentUrl(url) || !url.hash) {
            return null;
          }

          const target = resolveHashTarget(url.hash);
          if (!isSupportedTocHeading(target)) {
            return null;
          }

          return {
            hash: url.hash,
            link: link,
            target: target,
          };
        })
        .filter(Boolean)
        .filter(function (entry) {
          const key = normalizeHash(entry.hash);
          if (seen.has(key)) {
            return false;
          }

          seen.add(key);
          return true;
        });
    }

    function findEntryByHash(entries, hash) {
      if (!hash) return null;

      return entries.find(function (entry) {
        return hashesMatch(entry.hash, hash);
      }) || null;
    }

    function getTargetScrollMarginTop(target) {
      if (!isHTMLElement(target)) {
        return getTopOffset();
      }

      const rawValue =
        window.getComputedStyle(target).scrollMarginTop ||
        window.getComputedStyle(target).getPropertyValue("scroll-margin-top");
      const marginTop = parseFloat(rawValue);

      if (Number.isFinite(marginTop) && marginTop > 0) {
        return marginTop;
      }

      return getTopOffset();
    }

    function getTargetScrollTop(target) {
      if (!isHTMLElement(target)) return window.scrollY;

      const scrollTop =
        window.scrollY + target.getBoundingClientRect().top - getTargetScrollMarginTop(target);
      const maxScrollTop = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );

      return Math.min(Math.max(0, scrollTop), maxScrollTop);
    }

    function scrollToEntry(entry, behavior) {
      if (!entry) return;

      window.scrollTo({
        top: getTargetScrollTop(entry.target),
        behavior: behavior || "smooth",
      });
    }

    function refreshEntries() {
      applyTitle();

      activeEntries = getEntries();
      document.documentElement.classList.toggle("toc-empty", !activeEntries.length);
      if (!activeEntries.length) {
        return [];
      }

      clearMaterialTocState();
      clearInteractiveState();
      return activeEntries;
    }

    function syncFromHash(hash, options) {
      const settings = options || {};
      const entries = refreshEntries();
      const currentEntry = findEntryByHash(entries, hash);

      if (settings.scroll) {
        scrollToEntry(currentEntry, settings.behavior);
      }
    }

    function handleHashNavigation() {
      window.requestAnimationFrame(function () {
        syncFromHash(window.location.hash || "");
      });
    }

    function handleHistoryNavigation() {
      window.requestAnimationFrame(function () {
        syncFromHash(window.location.hash || "");
      });
    }

    function handleViewportResize() {
      window.requestAnimationFrame(function () {
        refreshEntries();
      });
    }

    function handleTocClick(event) {
      const target = event.target;
      if (!isElement(target)) return;

      const link = target.closest(SELECTORS.tocLinks);
      if (!link) return;

      let url;
      try {
        url = new URL(link.href, window.location.href);
      } catch {
        return;
      }

      if (!isSameDocumentUrl(url) || !url.hash) {
        return;
      }

      const normalizedHash = normalizeHash(url.hash);
      const nextUrl = window.location.pathname + window.location.search + normalizedHash;
      const entries = activeEntries.length ? activeEntries : refreshEntries();
      const currentEntry = findEntryByHash(entries, normalizedHash);
      if (!currentEntry) return;

      event.preventDefault();

      if (normalizeHash(window.location.hash) === normalizedHash) {
        history.replaceState(history.state, "", nextUrl);
      } else {
        history.pushState(history.state, "", nextUrl);
      }

      scrollToEntry(currentEntry, "smooth");
      window.requestAnimationFrame(function () {
        if (typeof link.blur === "function") {
          link.blur();
        }
      });
    }

    function bindEvents() {
      if (document.documentElement.dataset.siteTocBound === "true") {
        return;
      }

      document.addEventListener("click", handleTocClick, true);
      window.addEventListener("hashchange", handleHashNavigation);
      window.addEventListener("popstate", handleHistoryNavigation);
      window.addEventListener("resize", handleViewportResize, { passive: true });
      if (window.visualViewport && typeof window.visualViewport.addEventListener === "function") {
        window.visualViewport.addEventListener("resize", handleViewportResize, { passive: true });
      }
      document.documentElement.dataset.siteTocBound = "true";
    }

    return {
      init: function () {
        bindEvents();
        activeEntries = [];

        window.requestAnimationFrame(function () {
          syncFromHash(window.location.hash || "", {
            scroll: !!window.location.hash,
            behavior: "auto",
          });
        });
      },
    };
  })();

  const layoutToggleModule = (function () {
    const BUTTONS = [
      {
        selector: SELECTORS.sidebarToggle,
        controlType: "sidebar",
        className: "sidebar-collapsed",
        storageKey: STORAGE_KEYS.sidebarCollapsed,
        classNames: "site-header-control__button site-sidebar-toggle",
        textSelector: ".site-sidebar-toggle__text",
        defaultText: "隐藏目录",
        collapsedText: "显示目录",
        defaultLabel: "隐藏目录",
        collapsedLabel: "显示目录",
        innerHTML:
          '<span class="site-sidebar-toggle__icon" aria-hidden="true"></span>' +
          '<span class="site-sidebar-toggle__text">隐藏目录</span>',
        requiresToc: false,
      },
      {
        selector: SELECTORS.tocToggle,
        controlType: "toc",
        className: "toc-collapsed",
        storageKey: STORAGE_KEYS.tocCollapsed,
        classNames: "site-header-control__button site-toc-toggle",
        textSelector: ".site-toc-toggle__text",
        defaultText: "隐藏标题目录",
        collapsedText: "显示标题目录",
        defaultLabel: "隐藏标题目录",
        collapsedLabel: "显示标题目录",
        innerHTML:
          '<span class="site-toc-toggle__icon" aria-hidden="true"></span>' +
          '<span class="site-toc-toggle__text">隐藏标题目录</span>',
        requiresToc: true,
      },
    ];

    function isDesktopViewport() {
      return window.matchMedia("(min-width: 76.25em)").matches;
    }

    function readStoredState(key) {
      try {
        return window.localStorage.getItem(key) === "true";
      } catch {
        return false;
      }
    }

    function writeStoredState(key, value) {
      try {
        window.localStorage.setItem(key, value ? "true" : "false");
      } catch {
        // Ignore storage failures.
      }
    }

    function tocHasItems() {
      return queryAll(document, SELECTORS.tocLinks).some(function (link) {
        if (!isHTMLElement(link)) return false;

        let url;
        try {
          url = new URL(link.href, window.location.href);
        } catch {
          return false;
        }

        if (!isSameDocumentUrl(url) || !url.hash) {
          return false;
        }

        const target = resolveHashTarget(url.hash);
        if (!isHTMLElement(target)) {
          return false;
        }

        const tagName = target.tagName.toUpperCase();
        return tagName === "H1" || tagName === "H2";
      });
    }

    function getHost() {
      const paletteOption = document.querySelector(SELECTORS.paletteForm);
      return paletteOption && paletteOption.parentElement ? paletteOption.parentElement : null;
    }

    function getWrapper(config, button) {
      if (!button) return null;

      const wrapper = button.closest(".site-header-control");
      if (wrapper) return wrapper;

      const nextWrapper = document.createElement("div");
      nextWrapper.className = "md-header__option site-header-control";
      nextWrapper.setAttribute("data-site-control", config.controlType);
      button.replaceWith(nextWrapper);
      nextWrapper.appendChild(button);
      return nextWrapper;
    }

    function syncButton(config) {
      const button = document.querySelector(config.selector);
      const wrapper = getWrapper(config, button);
      const hasToc = tocHasItems();

      if (!button || !wrapper) return;

      if (!isDesktopViewport() || (config.requiresToc && !hasToc)) {
        wrapper.hidden = true;
        return;
      }

      wrapper.hidden = false;
      const collapsed = document.documentElement.classList.contains(config.className);
      const label = collapsed ? config.collapsedLabel : config.defaultLabel;
      const text = collapsed ? config.collapsedText : config.defaultText;

      button.setAttribute("aria-pressed", collapsed ? "true" : "false");
      button.setAttribute("title", label);
      button.setAttribute("aria-label", label);

      const textNode = button.querySelector(config.textSelector);
      if (textNode) {
        textNode.textContent = text;
      }
    }

    function syncButtons() {
      const hasToc = tocHasItems();
      document.documentElement.classList.toggle("toc-empty", !hasToc);
      BUTTONS.forEach(syncButton);
    }

    function setCollapsed(config, collapsed) {
      document.documentElement.classList.toggle(config.className, collapsed);
      writeStoredState(config.storageKey, collapsed);
      syncButtons();
    }

    function ensureButton(config) {
      let button = document.querySelector(config.selector);
      let wrapper = button ? getWrapper(config, button) : null;

      if (!button) {
        wrapper = document.createElement("div");
        wrapper.className = "md-header__option site-header-control";
        wrapper.setAttribute("data-site-control", config.controlType);

        button = document.createElement("button");
        button.type = "button";
        button.className = config.classNames;
        button.innerHTML = config.innerHTML;
        wrapper.appendChild(button);

        button.addEventListener("click", function () {
          setCollapsed(
            config,
            !document.documentElement.classList.contains(config.className)
          );
        });
      }

      const host = getHost();
      const paletteOption = document.querySelector(SELECTORS.paletteForm);
      if (host && paletteOption && wrapper && wrapper.parentElement !== host) {
        host.insertBefore(wrapper, paletteOption);
      } else if (wrapper && !wrapper.parentElement) {
        document.body.appendChild(wrapper);
      }
    }

    function restoreState() {
      const desktop = isDesktopViewport();
      const hasToc = tocHasItems();

      BUTTONS.forEach(function (config) {
        const collapsed = desktop &&
          (!config.requiresToc || hasToc) &&
          readStoredState(config.storageKey);

        document.documentElement.classList.toggle(config.className, collapsed);
      });

      if (!desktop) {
        document.documentElement.classList.remove("sidebar-collapsed", "toc-collapsed");
      }

      if (!hasToc) {
        document.documentElement.classList.remove("toc-collapsed");
      }

      syncButtons();
    }

    return {
      init: function () {
        BUTTONS.forEach(ensureButton);

        if (document.documentElement.dataset.siteLayoutToggleBound !== "true") {
          window.addEventListener("resize", restoreState, { passive: true });
          document.documentElement.dataset.siteLayoutToggleBound = "true";
        }

        restoreState();
      },
    };
  })();

  const scrollCoordinatorModule = (function () {
    const subscribers = new Set();
    let currentScrollTop = Math.max(window.scrollY || 0, 0);
    let ticking = false;

    function notifySubscribers() {
      ticking = false;
      currentScrollTop = Math.max(window.scrollY || 0, 0);

      subscribers.forEach(function (callback) {
        callback(currentScrollTop);
      });
    }

    function requestSync() {
      if (ticking) return;

      ticking = true;
      window.requestAnimationFrame(notifySubscribers);
    }

    function bindEvents() {
      if (document.documentElement.dataset.siteScrollCoordinatorBound === "true") {
        return;
      }

      window.addEventListener("scroll", requestSync, { passive: true });
      document.documentElement.dataset.siteScrollCoordinatorBound = "true";
    }

    return {
      init: function () {
        bindEvents();
        requestSync();
      },
      getScrollTop: function () {
        return currentScrollTop;
      },
      requestSync: requestSync,
      subscribe: function (callback, options) {
        if (typeof callback !== "function") {
          return function () { };
        }

        subscribers.add(callback);
        bindEvents();

        if (!options || options.immediate !== false) {
          callback(currentScrollTop);
        }

        return function () {
          subscribers.delete(callback);
        };
      },
    };
  })();

  const tabsCollapseModule = (function () {
  const COLLAPSE_CLASS = "site-tabs-collapsed";
  const COLLAPSE_SCROLL_LIMIT = 24;
  const EXPAND_SCROLL_LIMIT = 6;
  let subscribed = false;
  let initialized = false;

  function hasTabs() {
    const tabs = document.querySelector(SELECTORS.tabsRoot);
    return isHTMLElement(tabs) && tabs.querySelector(".md-tabs__list");
  }

  function setCollapsed(collapsed) {
    document.documentElement.classList.toggle(COLLAPSE_CLASS, collapsed);
  }

  function getRealScrollTop(scrollTop) {
    return Math.max(
      typeof scrollTop === "number" ? scrollTop : 0,
      window.scrollY || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0
    );
  }

  function syncState(scrollTop) {
    if (!hasTabs()) {
      setCollapsed(false);
      return;
    }

    const currentScrollTop = getRealScrollTop(scrollTop);

    if (!initialized) {
      initialized = true;
      setCollapsed(currentScrollTop > COLLAPSE_SCROLL_LIMIT);
      return;
    }

    if (document.documentElement.classList.contains(COLLAPSE_CLASS)) {
      setCollapsed(currentScrollTop > EXPAND_SCROLL_LIMIT);
      return;
    }

    setCollapsed(currentScrollTop > COLLAPSE_SCROLL_LIMIT);
  }

  function subscribeScroll() {
    if (subscribed) return;
    subscribed = true;
    scrollCoordinatorModule.subscribe(syncState, { immediate: false });
  }

  return {
    init: function () {
      subscribeScroll();

      window.requestAnimationFrame(function () {
        syncState(scrollCoordinatorModule.getScrollTop());

        window.setTimeout(function () {
          syncState(scrollCoordinatorModule.getScrollTop());
        }, 80);
      });
    },
  };
})();

  const topShadowModule = (function () {
    let shadowNode = null;
    let ticking = false;

    function needsTopShadow() {
      const root = document.documentElement;
      return (
        root.classList.contains("site-browser-safari") ||
        root.classList.contains("site-browser-atlas")
      );
    }

    function ensureShadowNode() {
      if (shadowNode && document.body.contains(shadowNode)) {
        return shadowNode;
      }

      shadowNode = document.querySelector(".site-top-shadow");

      if (!shadowNode) {
        shadowNode = document.createElement("div");
        shadowNode.className = "site-top-shadow";
        shadowNode.setAttribute("aria-hidden", "true");
        document.body.appendChild(shadowNode);
      }

      return shadowNode;
    }

    function getVisibleBottom(element) {
      if (!isHTMLElement(element)) {
        return 0;
      }

      const rect = element.getBoundingClientRect();

      if (rect.height <= 0) {
        return 0;
      }

      const style = window.getComputedStyle(element);

      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0"
      ) {
        return 0;
      }

      return Math.max(0, rect.bottom);
    }

    function syncShadowPosition() {
      ticking = false;

      const shadow = ensureShadowNode();

      if (!needsTopShadow()) {
        shadow.style.opacity = "0";
        return;
      }

      const header = document.querySelector(SELECTORS.headerRoot);
      const tabs = document.querySelector(SELECTORS.tabsRoot);
      const root = document.documentElement;
      const tabsCollapsed = root.classList.contains("site-tabs-collapsed");

      const headerBottom = getVisibleBottom(header);
      const tabsBottom = tabsCollapsed ? 0 : getVisibleBottom(tabs);
      const bottom = Math.max(headerBottom, tabsBottom);

      if (bottom <= 0) {
        shadow.style.opacity = "0";
        return;
      }

      root.style.setProperty("--site-top-shadow-top", Math.round(bottom - 1) + "px");
      shadow.style.opacity = "1";
    }

    function requestSync() {
      if (ticking) return;

      ticking = true;
      window.requestAnimationFrame(syncShadowPosition);
    }

    function bindEvents() {
      if (document.documentElement.dataset.siteTopShadowBound === "true") {
        return;
      }

      window.addEventListener("scroll", requestSync, { passive: true });
      window.addEventListener("resize", requestSync, { passive: true });

      if (window.visualViewport && typeof window.visualViewport.addEventListener === "function") {
        window.visualViewport.addEventListener("resize", requestSync, { passive: true });
        window.visualViewport.addEventListener("scroll", requestSync, { passive: true });
      }

      if (typeof ResizeObserver === "function") {
        const observer = new ResizeObserver(requestSync);
        const header = document.querySelector(SELECTORS.headerRoot);
        const tabs = document.querySelector(SELECTORS.tabsRoot);

        if (isHTMLElement(header)) observer.observe(header);
        if (isHTMLElement(tabs)) observer.observe(tabs);
      }

      if (typeof MutationObserver === "function") {
        const observer = new MutationObserver(requestSync);
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }

      document.documentElement.dataset.siteTopShadowBound = "true";
    }

    return {
      init: function () {
        bindEvents();
        ensureShadowNode();
        requestSync();
        window.setTimeout(requestSync, 80);
        window.setTimeout(requestSync, 240);
      },
    };
  })();

  const atlasWheelModule = (function () {
    function isSafariForcedOrDetected() {
      const root = document.documentElement;

      return (
        root.classList.contains("site-browser-safari") ||
        (document.body && document.body.classList.contains("is-safari"))
      );
    }

    function isAtlasForcedOrDetected() {
      const root = document.documentElement;

      return (
        root.classList.contains("site-browser-atlas") ||
        (document.body && document.body.classList.contains("is-atlas"))
      );
    }

    function isDesktopCompatViewport() {
      return window.matchMedia("(min-width: 76.25em)").matches;
    }

    function getTargetElement(target) {
      if (target instanceof Node && !(target instanceof Element)) {
        return target.parentElement;
      }

      return target instanceof Element ? target : null;
    }

    function shouldIgnoreWheelTarget(target) {
      const element = getTargetElement(target);
      if (!element) return false;

      return Boolean(
        element.closest(
          [
            ".md-header",
            ".md-tabs",
            ".md-sidebar--primary",
            ".md-sidebar--secondary",
            ".md-search",
            ".md-dialog",
            ".custom-codeblock__body",
            ".custom-codeblock__copy",
            "input",
            "textarea",
            "select",
            "button",
            '[contenteditable=""]',
            '[contenteditable="true"]'
          ].join(", ")
        )
      );
    }

    function isMainContentTarget(target) {
      const element = getTargetElement(target);
      if (!element) return false;

      return Boolean(
        element.closest(
          ".md-main, .md-main__inner, .md-content, .md-content__inner, .md-typeset"
        )
      );
    }

    function getScrollRoot() {
      return document.scrollingElement || document.documentElement || document.body;
    }

    function getMaxScrollTop(root) {
      return Math.max(
        0,
        root.scrollHeight - root.clientHeight,
        document.documentElement.scrollHeight - window.innerHeight,
        document.body.scrollHeight - window.innerHeight
      );
    }

    function getCurrentScrollTop(root) {
      return Math.max(
        window.scrollY || 0,
        root ? root.scrollTop || 0 : 0,
        document.documentElement.scrollTop || 0,
        document.body.scrollTop || 0
      );
    }

    function forcePageScroll(deltaY) {
      const root = getScrollRoot();
      if (!root) return false;

      const current = getCurrentScrollTop(root);
      const max = getMaxScrollTop(root);
      const next = Math.min(Math.max(0, current + deltaY), max);

      if (next === current) return false;

      root.scrollTop = next;
      document.documentElement.scrollTop = next;
      document.body.scrollTop = next;

      return true;
    }

    function handleWheel(event) {
      const needsCompatScroll = isDesktopCompatViewport();

      if (!needsCompatScroll) return;
      if (event.defaultPrevented) return;
      if (shouldIgnoreWheelTarget(event.target)) return;
      if (!isMainContentTarget(event.target)) return;

      const deltaY = event.deltaY || 0;
      if (!deltaY) return;

      if (Math.abs(deltaY) < Math.abs(event.deltaX || 0)) {
        return;
      }

      const moved = forcePageScroll(deltaY);

      if (moved) {
        event.preventDefault();
        scrollCoordinatorModule.requestSync();
      }
    }

    function bindWheel() {
      if (document.documentElement.dataset.siteCompatWheelBound === "true") {
        return;
      }

      window.addEventListener("wheel", handleWheel, {
        passive: false,
        capture: true,
      });

      document.documentElement.dataset.siteCompatWheelBound = "true";
    }

    return {
      init: bindWheel,
    };
  })();

  const topButtonModule = (function () {
    const SHOW_AFTER_SCROLL = 140;
    const DIRECTION_THRESHOLD = 10;
    let activeButton = null;
    let lastScrollTop = Math.max(window.scrollY || 0, 0);
    let subscribed = false;

    function handleClick(event) {
      if (event) {
        event.preventDefault();
      }

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    function getButton(root) {
      const scope = resolveRoot(root);
      if (isElement(scope)) {
        const scopedButton = scope.querySelector(SELECTORS.topButton);
        if (scopedButton) return scopedButton;
      }

      return document.querySelector(SELECTORS.topButton);
    }

    function setVisible(button, visible) {
      if (!isHTMLElement(button)) return;

      button.classList.toggle("site-top-visible", visible);
      button.setAttribute("aria-hidden", visible ? "false" : "true");

      if (visible) {
        button.hidden = false;
        button.removeAttribute("hidden");
        button.removeAttribute("tabindex");
      } else {
        button.setAttribute("tabindex", "-1");
      }
    }

    function prepareButton(button) {
      if (!isHTMLElement(button)) return;

      button.hidden = false;
      button.removeAttribute("hidden");
      button.setAttribute("aria-label", TOP_BUTTON_LABEL);
      button.setAttribute("title", TOP_BUTTON_LABEL);
      const textNode = Array.from(button.childNodes).find(function (node) {
        return node && node.nodeType === Node.TEXT_NODE && node.textContent.trim();
      });
      if (textNode) {
        textNode.textContent = " " + TOP_BUTTON_LABEL;
      }
      button.style.removeProperty("margin-left");
      button.style.removeProperty("margin-right");
      button.style.removeProperty("transform");
      if (button.dataset.siteTopClickBound !== "true") {
        button.addEventListener("click", handleClick);
        button.dataset.siteTopClickBound = "true";
      }
      setVisible(button, false);
    }

    function syncVisibility(scrollTop, forceHidden) {
      if (!isHTMLElement(activeButton)) return;

      const currentScrollTop =
        typeof scrollTop === "number" ? scrollTop : scrollCoordinatorModule.getScrollTop();

      if (forceHidden || currentScrollTop <= SHOW_AFTER_SCROLL) {
        setVisible(activeButton, false);
        lastScrollTop = currentScrollTop;
        return;
      }

      const delta = currentScrollTop - lastScrollTop;
      if (delta <= -DIRECTION_THRESHOLD) {
        setVisible(activeButton, true);
      } else if (delta >= DIRECTION_THRESHOLD) {
        setVisible(activeButton, false);
      }

      lastScrollTop = currentScrollTop;
    }

    function handleViewportChange() {
      scrollCoordinatorModule.requestSync();
    }

    function bindEvents() {
      if (document.documentElement.dataset.siteTopButtonBound === "true") {
        return;
      }

      window.addEventListener("resize", handleViewportChange, { passive: true });

      if (window.visualViewport && typeof window.visualViewport.addEventListener === "function") {
        window.visualViewport.addEventListener("resize", handleViewportChange, { passive: true });
      }

      document.documentElement.dataset.siteTopButtonBound = "true";
    }

    return {
      init: function (root) {
        activeButton = getButton(root);
        if (!activeButton) return;

        prepareButton(activeButton);
        bindEvents();

        if (!subscribed) {
          scrollCoordinatorModule.subscribe(function (scrollTop) {
            syncVisibility(scrollTop, false);
          }, { immediate: false });
          subscribed = true;
        }

        lastScrollTop = scrollCoordinatorModule.getScrollTop();
        syncVisibility(lastScrollTop, true);
        scrollCoordinatorModule.requestSync();
      },
    };
  })();

  const themeToggleModule = (function () {
    const ICONS = {
      slate:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3m0-7 2.39 3.42C13.65 5.15 12.84 5 12 5s-1.65.15-2.39.42zM3.34 7l4.16-.35A7.2 7.2 0 0 0 5.94 8.5c-.44.74-.69 1.5-.83 2.29zm.02 10 1.76-3.77a7.131 7.131 0 0 0 2.38 4.14zM20.65 7l-1.77 3.79a7.02 7.02 0 0 0-2.38-4.15zm-.01 10-4.14.36c.59-.51 1.12-1.14 1.54-1.86.42-.73.69-1.5.83-2.29zM12 22l-2.41-3.44c.74.27 1.55.44 2.41.44.82 0 1.63-.17 2.37-.44z"/></svg>',
      default:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="m17.75 4.09-2.53 1.94.91 3.06-2.63-1.81-2.63 1.81.91-3.06-2.53-1.94L12.44 4l1.06-3 1.06 3zm3.5 6.91-1.64 1.25.59 1.98-1.7-1.17-1.7 1.17.59-1.98L15.75 11l2.06-.05L18.5 9l.69 1.95zm-2.28 4.95c.83-.08 1.72 1.1 1.19 1.85-.32.45-.66.87-1.08 1.27C15.17 23 8.84 23 4.94 19.07c-3.91-3.9-3.91-10.24 0-14.14.4-.4.82-.76 1.27-1.08.75-.53 1.93.36 1.85 1.19-.27 2.86.69 5.83 2.89 8.02a9.96 9.96 0 0 0 8.02 2.89m-1.64 2.02a12.08 12.08 0 0 1-7.8-3.47c-2.17-2.19-3.33-5-3.49-7.82-2.81 3.14-2.7 7.96.31 10.98 3.02 3.01 7.84 3.12 10.98.31"/></svg>',
    };

    function getPaletteForm() {
      return document.querySelector(SELECTORS.paletteForm);
    }

    function getPaletteInputs(root) {
      return queryAll(root || document, '.md-option[name="__palette"]');
    }

    function getCurrentScheme() {
      return (
        document.body.getAttribute("data-md-color-scheme") ||
        document.documentElement.getAttribute("data-md-color-scheme") ||
        "default"
      );
    }

    function getSchemeConfig(inputs, scheme) {
      return inputs.find(function (input) {
        return input.getAttribute("data-md-color-scheme") === scheme;
      });
    }

    function applyScheme(input) {
      if (!input) return;

      const scheme = input.getAttribute("data-md-color-scheme");
      const primary = input.getAttribute("data-md-color-primary");
      const accent = input.getAttribute("data-md-color-accent");
      const media = input.getAttribute("data-md-color-media") || "";

      input.checked = true;
      document.body.setAttribute("data-md-color-scheme", scheme);
      document.body.setAttribute("data-md-color-primary", primary);
      document.body.setAttribute("data-md-color-accent", accent);

      try {
        if (typeof __md_set === "function") {
          __md_set("__palette", {
            index: input.id || "",
            color: {
              media: media,
              scheme: scheme,
              primary: primary,
              accent: accent,
            },
          });
        }
      } catch {
        // Ignore storage failures.
      }
    }

    function syncButton(button) {
      if (!button) return;

      const currentScheme = getCurrentScheme() === "slate" ? "slate" : "default";
      const nextScheme = currentScheme === "slate" ? "default" : "slate";
      const title = nextScheme === "slate" ? "切换到深色模式" : "切换到浅色模式";

      button.dataset.scheme = currentScheme;
      button.setAttribute("aria-label", title);
      button.setAttribute("title", title);
      button.innerHTML = currentScheme === "slate" ? ICONS.slate : ICONS.default;
    }

    function toggleTheme() {
      const inputs = getPaletteInputs(document);
      if (!inputs.length) return;

      const currentScheme = getCurrentScheme() === "slate" ? "slate" : "default";
      const nextScheme = currentScheme === "slate" ? "default" : "slate";
      const nextInput = getSchemeConfig(inputs, nextScheme);

      if (!nextInput) return;

      applyScheme(nextInput);
      syncButton(document.querySelector(".site-theme-toggle"));
    }

    function ensureButton() {
      const form = getPaletteForm();
      if (!form) return;

      let button = form.querySelector(".site-theme-toggle");
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "site-theme-toggle";
        button.addEventListener("click", function (event) {
          event.preventDefault();
          toggleTheme();
        });
        form.appendChild(button);
      }

      syncButton(button);
    }

    return {
      init: function () {
        ensureButton();
      },
    };
  })();

  const codeBlockModule = (function () {
    const COPY_LABEL = "复制";
    const COPIED_LABEL = "已复制";
    const COPY_ICON =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7.75A2.75 2.75 0 0 1 10.75 5h6.5A2.75 2.75 0 0 1 20 7.75v6.5A2.75 2.75 0 0 1 17.25 17h-6.5A2.75 2.75 0 0 1 8 14.25v-6.5Zm2.75-1.25c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25h-6.5Z"/><path d="M4 10.75A2.75 2.75 0 0 1 6.75 8h.5v1.5h-.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25v-.5H16v.5A2.75 2.75 0 0 1 13.25 20h-6.5A2.75 2.75 0 0 1 4 17.25v-6.5Z"/></svg>';
    const CHECK_ICON =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.55 16.6 4.95 12l1.06-1.06 3.54 3.54 8.44-8.43 1.06 1.06-9.5 9.49Z"/></svg>';

    function normalizeLanguageName(value) {
      const normalized = (value || "").trim().toLowerCase();
      if (!normalized) return "Text";
      return LANGUAGE_ALIASES[normalized] || (normalized.charAt(0).toUpperCase() + normalized.slice(1));
    }

    function collectLanguageCandidates(node, candidates) {
      if (!isHTMLElement(node)) return;

      const dataLanguage =
        node.getAttribute("data-language") ||
        node.getAttribute("data-lang") ||
        node.getAttribute("lang");

      if (dataLanguage && dataLanguage.trim()) {
        candidates.push(dataLanguage.trim());
      }

      node.className
        .split(/\s+/)
        .filter(Boolean)
        .forEach(function (className) {
          const match = className.match(/^(?:language|lang)-(.+)$/i);
          if (match && match[1]) {
            candidates.push(match[1]);
          }
        });
    }

    function inferLanguage(highlight, pre, code) {
      const candidates = [];

      [highlight, pre, code, highlight.parentElement, pre.parentElement].forEach(function (node) {
        collectLanguageCandidates(node, candidates);
      });

      if (!candidates.length) {
        const text = code.textContent || "";

        if (/\b(function|const|let|var|return)\b/.test(text)) {
          candidates.push("javascript");
        } else if (/^\s*#include\b/m.test(text)) {
          candidates.push("cpp");
        } else if (/^\s*def\s+\w+/m.test(text)) {
          candidates.push("python");
        } else if (/^\s*SELECT\b/i.test(text)) {
          candidates.push("sql");
        } else {
          candidates.push("text");
        }
      }

      const firstValid = candidates.find(function (item) {
        return item && item.trim();
      });

      return normalizeLanguageName(firstValid || "Text");
    }

    function setLanguageLabel(highlight, languageName) {
      highlight.dataset.codeLanguage = languageName;
    }

    function setCopyButtonState(button, copied) {
      button.classList.toggle("is-copied", copied);
      button.innerHTML =
        (copied ? CHECK_ICON : COPY_ICON) +
        '<span class="custom-codeblock__copy-text">' +
        (copied ? COPIED_LABEL : COPY_LABEL) +
        "</span>";
      button.setAttribute("aria-label", copied ? COPIED_LABEL : COPY_LABEL);
    }

    function fallbackCopyText(text) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-1000px";
      textarea.style.left = "-1000px";
      document.body.appendChild(textarea);
      textarea.select();

      let copied = false;
      try {
        copied = document.execCommand("copy");
      } finally {
        textarea.remove();
      }

      return copied;
    }

    async function copyText(text) {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          // Fall back for non-secure contexts and restricted clipboard permissions.
        }
      }

      return fallbackCopyText(text);
    }

    function getCodeText(code) {
      const lines = queryAll(code, ".code-line");
      if (lines.length) {
        return lines.map(function (line) {
          return line.textContent || "";
        }).join("\n");
      }

      return (code.textContent || "").replace(/\n$/, "");
    }

    function removeNativeCopyControls(highlight) {
      queryAll(highlight, ":scope > .md-clipboard, :scope > .md-code__nav").forEach(function (node) {
        node.remove();
      });
    }

    function createCodeHeader(languageName, code) {
      const header = document.createElement("div");
      const leading = document.createElement("div");
      const dots = document.createElement("span");
      const language = document.createElement("span");
      const copyButton = document.createElement("button");

      header.className = "custom-codeblock__header";
      leading.className = "custom-codeblock__leading";
      dots.className = "custom-codeblock__dots";
      dots.setAttribute("aria-hidden", "true");
      language.className = "custom-codeblock__language";
      language.textContent = languageName;
      copyButton.className = "custom-codeblock__copy";
      copyButton.type = "button";
      setCopyButtonState(copyButton, false);

      copyButton.addEventListener("click", async function () {
        const didCopy = await copyText(getCodeText(code));
        if (!didCopy) return;

        setCopyButtonState(copyButton, true);
        if (copyButton._siteCopyTimer) {
          window.clearTimeout(copyButton._siteCopyTimer);
        }
        copyButton._siteCopyTimer = window.setTimeout(function () {
          setCopyButtonState(copyButton, false);
        }, 1500);
      });

      leading.append(dots, language);
      header.append(leading, copyButton);
      return header;
    }

    function ensureCodeBlockStructure(highlight, pre, code, languageName) {
      removeNativeCopyControls(highlight);
      highlight.classList.add("custom-codeblock");

      const existingHeader = highlight.querySelector(":scope > .custom-codeblock__header");
      if (existingHeader) {
        existingHeader.remove();
      }

      let body = highlight.querySelector(":scope > .custom-codeblock__body");
      if (!body) {
        body = document.createElement("div");
        body.className = "custom-codeblock__body";
      }

      if (pre.parentElement !== body) {
        body.appendChild(pre);
      }

      highlight.prepend(createCodeHeader(languageName, code));
      if (body.parentElement !== highlight) {
        highlight.appendChild(body);
      }
    }

    function splitCodeIntoLines(code) {
      if (!isHTMLElement(code) || code.dataset.autoLinenumsApplied === "true") {
        return;
      }

      const rawHtml = code.innerHTML.replace(/\n$/, "");
      const lines = rawHtml.split("\n");
      if (!lines.length) return;

      code.innerHTML = lines
        .map(function (lineHtml, index) {
          const safeLineHtml = lineHtml === "" ? "&nbsp;" : lineHtml;
          return (
            '<span class="code-line" data-line="' +
            (index + 1) +
            '">' +
            safeLineHtml +
            "</span>"
          );
        })
        .join("");

      code.dataset.autoLinenumsApplied = "true";
    }

    function enhanceCodeBlock(highlight) {
      if (!isHTMLElement(highlight) || highlight.dataset.autoCodeEnhanced === "true") {
        return;
      }

      if (highlight.querySelector(".highlighttable, td.linenos")) {
        highlight.dataset.autoCodeEnhanced = "true";
        return;
      }

      const pre = highlight.querySelector(":scope > pre");
      const code = pre ? pre.querySelector(":scope > code") : null;
      if (!pre || !code) return;

      const languageName = inferLanguage(highlight, pre, code);
      setLanguageLabel(highlight, languageName);
      splitCodeIntoLines(code);
      ensureCodeBlockStructure(highlight, pre, code, languageName);
      highlight.classList.add("has-auto-linenums");
      highlight.dataset.autoCodeEnhanced = "true";
    }

    return {
      init: function (root) {
        queryAll(resolveRoot(root), SELECTORS.codeBlocks).forEach(enhanceCodeBlock);
      },
    };
  })();

  const factTableModule = (function () {
    function isHeadingElement(node) {
      return isHTMLElement(node) && /^H[1-6]$/.test(node.tagName);
    }

    function findTableAfterHeading(heading) {
      let node = isHTMLElement(heading) ? heading.nextElementSibling : null;

      while (node) {
        if (isHTMLElement(node) && node.matches(".md-typeset__table")) {
          const wrappedTable = node.querySelector(":scope > table");
          if (isHTMLElement(wrappedTable)) {
            return wrappedTable;
          }
        }

        if (isHTMLElement(node) && node.tagName === "TABLE") {
          return node;
        }

        if (isHeadingElement(node)) {
          return null;
        }

        node = node.nextElementSibling;
      }

      return null;
    }

    function ensureWrapper(table) {
      if (!isHTMLElement(table) || !table.parentNode) return;

      const parent = table.parentElement;
      if (isHTMLElement(parent) && parent.classList.contains("md-typeset__table")) {
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.className = "md-typeset__table";
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }

    function enhanceTable(table) {
      if (!isHTMLElement(table)) return;
      table.classList.add("fact-table");
      ensureWrapper(table);
    }

    return {
      init: function (root) {
        queryAll(resolveRoot(root), ".md-content .md-typeset h2").forEach(function (heading) {
          if (getTextContent(heading) !== "基本信息") return;

          const table = findTableAfterHeading(heading);
          if (!table) return;

          enhanceTable(table);
        });
      },
    };
  })();

  const modules = [
    browserClassModule,
    pageTypeModule,
    footerModule,
    headerTitleModule,
    tocModule,
    layoutToggleModule,
    scrollCoordinatorModule,
    tabsCollapseModule,
    topShadowModule,
    atlasWheelModule,
    topButtonModule,
    themeToggleModule,
    codeBlockModule,
    factTableModule,
  ];

  pageTypeModule.init();

  function init(root) {
    modules.forEach(function (module) {
      module.init(root);
    });
  }

  subscribePageChanges(init);
})();
