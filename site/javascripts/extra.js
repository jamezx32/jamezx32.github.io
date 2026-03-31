(function () {
  let footerTimer = null;
  const SELECTORS = {
    footerInner: ".md-footer-meta__inner",
    footerTime: ".custom-footer-time",
    activeSidebarItems: ".md-sidebar .md-nav__item--active",
    sidebarItems: ".md-sidebar .md-nav__item",
    sidebarScrollwraps:
      ".md-sidebar--primary > .md-sidebar__scrollwrap, .md-sidebar--secondary > .md-sidebar__scrollwrap",
    rootNavLists: ":scope .md-nav > .md-nav__list",
    directNavItem: ":scope > .md-nav__item",
    directLink: ":scope > .md-nav__link",
    directLinkOrLabel: ":scope > .md-nav__link, :scope > label.md-nav__link",
    directNavOrList: ":scope > nav, :scope > .md-nav",
    tocToggleLabel: ':scope > label.md-nav__link[for="__toc"]',
    directAnchorLink: ':scope > a.md-nav__link[href]',
    directChildList: ":scope > nav > .md-nav__list, :scope > .md-nav > .md-nav__list",
    directChildItem: ":scope > .md-nav__item",
    nestedLists: ":scope > nav > .md-nav__list, :scope > .md-nav > .md-nav__list",
    tocNav: ":scope > nav.md-nav, :scope > .md-nav",
    childLinks: ".md-nav__link[href], label.md-nav__link"
  };

  function getTextContent(node) {
    if (!node) return "";
    return node.textContent.replace(/\s+/g, " ").trim();
  }

  function queryAll(root, selector) {
    return Array.from(root.querySelectorAll(selector));
  }

  // Footer
  function formatChinaTime() {
    const formatter = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });

    const parts = formatter.formatToParts(new Date());
    const map = {};

    for (const part of parts) {
      if (part.type !== "literal") {
        map[part.type] = part.value;
      }
    }

    return `${map.year}年${map.month}月${map.day}日 ${map.hour}:${map.minute}:${map.second}`;
  }

  function setupFooterTime() {
    const footer = document.querySelector(SELECTORS.footerInner);
    if (!footer) return;

    const oldTime = document.querySelector(SELECTORS.footerTime);
    if (oldTime) oldTime.remove();

    if (footerTimer) {
      clearInterval(footerTimer);
      footerTimer = null;
    }

    const timeBlock = document.createElement("div");
    timeBlock.className = "custom-footer-time";

    function updateTime() {
      timeBlock.textContent = `${formatChinaTime()}`;
    }

    updateTime();
    footer.appendChild(timeBlock);
    footerTimer = setInterval(updateTime, 1000);
  }

  // Navigation helpers
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

  function isItemActive(item, link) {
    return (
      item.classList.contains("md-nav__item--active") ||
      link.classList.contains("md-nav__link--active")
    );
  }

  function cleanupTocToggleDuplicates() {
    const activeItems = queryAll(document, SELECTORS.activeSidebarItems);

    for (const item of activeItems) {
      const toggleLabel = item.querySelector(SELECTORS.tocToggleLabel);
      const directLink = item.querySelector(SELECTORS.directAnchorLink);

      if (!toggleLabel || !directLink) continue;

      const labelText = getTextContent(toggleLabel);
      const linkText = getTextContent(directLink);

      if (labelText && linkText && labelText === linkText) {
        toggleLabel.remove();

        const tocNav = item.querySelector(SELECTORS.tocNav);
        if (tocNav) {
          tocNav.remove();
        }

        item.classList.remove("md-nav__item--nested");
      }
    }
  }

  function getDirectLinkInfo(item) {
    const link = item.querySelector(SELECTORS.directLink);
    if (!link) return null;

    return {
      link,
      text: getTextContent(link),
      href: normalizeHref(link.getAttribute("href") || "")
    };
  }

  function removeDuplicateIndexChild(item) {
    const parentInfo = getDirectLinkInfo(item);
    if (!parentInfo) return;

    const childList = item.querySelector(SELECTORS.directChildList);
    if (!childList) return;

    const childItems = queryAll(childList, SELECTORS.directChildItem);
    if (childItems.length === 0) return;

    const firstChild = childItems[0];
    const childInfo = getDirectLinkInfo(firstChild);
    if (!childInfo) return;

    const sameText = parentInfo.text === childInfo.text;
    const sameHref = parentInfo.href !== "" && parentInfo.href === childInfo.href;

    if (sameText && sameHref) {
      firstChild.remove();
    }
  }

  function dedupeNavList(list) {
    const directItems = queryAll(list, SELECTORS.directNavItem);
    const seen = new Map();

    for (const item of directItems) {
      removeDuplicateIndexChild(item);

      const info = getDirectLinkInfo(item);
      if (!info) continue;

      // Only dedupe items that are structurally identical in the same list.
      const key = `${info.text}__${info.href}`;

      if (!seen.has(key)) {
        seen.set(key, item);
      } else {
        const prevItem = seen.get(key);
        const prevInfo = getDirectLinkInfo(prevItem);
        const currentActive = isItemActive(item, info.link);
        const prevActive = prevInfo ? isItemActive(prevItem, prevInfo.link) : false;

        if (currentActive && !prevActive) {
          prevItem.remove();
          seen.set(key, item);
        } else {
          item.remove();
          continue;
        }
      }

      const nestedLists = queryAll(item, SELECTORS.nestedLists);
      for (const nestedList of nestedLists) {
        dedupeNavList(nestedList);
      }
    }
  }

  function dedupeSidebarNav() {
    const sidebars = queryAll(document, SELECTORS.sidebarScrollwraps);

    for (const sidebar of sidebars) {
      const rootLists = queryAll(sidebar, SELECTORS.rootNavLists);
      for (const list of rootLists) {
        dedupeNavList(list);
      }
    }
  }

  function cleanupEmptyNavItems() {
    const items = queryAll(document, SELECTORS.sidebarItems);

    for (const item of items) {
      const directLink = item.querySelector(SELECTORS.directLinkOrLabel);
      const directNav = item.querySelector(SELECTORS.directNavOrList);

      if (!directLink && !directNav) {
        item.remove();
        continue;
      }

      if (directNav) {
        const childLinks = directNav.querySelectorAll(SELECTORS.childLinks);
        if (childLinks.length === 0 && !directLink) {
          item.remove();
        }
      }
    }
  }

  // UI initialization
  function initCustomUi() {
    setupFooterTime();
    dedupeSidebarNav();
    cleanupTocToggleDuplicates();
    cleanupEmptyNavItems();
  }

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(initCustomUi);
  } else {
    document.addEventListener("DOMContentLoaded", initCustomUi);
  }
})();