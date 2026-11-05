// Region in your data is an availability zone (e.g. "us-west-2a").
// Strip the trailing letter to get the real region ("us-west-2").
const regionOf = (h) => h.region.replace(/[a-z]$/, "");

// Replace with the URL pattern you confirmed from the AWS console
const buildUrl = (h) =>
  `https://${regionOf(h)}.console.aws.amazon.com/systems-manager/session-manager/${h.instanceId}?region=${regionOf(h)}`;

const STORAGE_KEY = "favorites";

let HOSTS = [];

const searchEl = document.getElementById("search");
const listEl = document.getElementById("list");
const tabEls = document.querySelectorAll(".tab");
const accountSwitcher = document.getElementById("switchaccount");

const STAR_SVG = `
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 15.1 8.6 22 9.3 16.8 14 18.2 21 12 17.5 5.8 21 7.2 14 2 9.3 8.9 8.6 12 2"></polygon>
  </svg>`;

let favorites = new Set(); // stores instance IDs
let currentTab = "all";
let matches = [];
let activeIndex = 0;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Display only the short hostname (awcdlpdom231.awsc3.com -> awcdlpdom231)
function shortName(host) {
  return host.hostname.split(".")[0];
}

// Search across hostname, name, IP and instance ID
function matchesQuery(host, q) {
  if (!q) return true;
  return [host.hostname, host.name, host.ipAddress, host.instanceId]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(q));
}

function saveFavorites() {
  chrome.storage.local.set({ favorites: [...favorites] });
}

function toggleFavorite(host) {
  if (favorites.has(host.instanceId)) {
    favorites.delete(host.instanceId);
  } else {
    favorites.add(host.instanceId);
  }
  saveFavorites();
  render(searchEl.value, activeIndex);
}

function render(query = "", keepIndex = 0) {
  const q = query.trim().toLowerCase();

  matches = HOSTS.filter((h) => {
    if (currentTab === "fav" && !favorites.has(h.instanceId)) return false;
    return matchesQuery(h, q);
  });

  activeIndex = Math.min(keepIndex, Math.max(matches.length - 1, 0));
  listEl.replaceChildren();

  if (matches.length === 0) {
    const msg =
      currentTab === "fav" && !q
        ? "No favorites yet. Tap the star on a server."
        : "No servers found";
    listEl.appendChild(el("li", "empty", msg));
    return;
  }

  matches.forEach((host, i) => {
    const li = el("li", "item");
    if (i === activeIndex) li.classList.add("active");

    const info = el("div", "host-info");
    const nameLine = el("div", "host-name", shortName(host));
    if (host.ipAddress) {
      nameLine.appendChild(el("span", "host-ip", ` (${host.ipAddress})`));
    }
    info.appendChild(nameLine);
    if (host.name) {
      const sub = el("div", "host-sub", host.name);
      sub.title = host.name; // full name on hover
      info.appendChild(sub);
    }

    const star = el("button", "star");
    star.innerHTML = STAR_SVG;
    star.title = favorites.has(host.instanceId) ? "Remove from favorites" : "Add to favorites";
    if (favorites.has(host.instanceId)) star.classList.add("on");
    star.addEventListener("click", (e) => {
      e.stopPropagation(); // don't trigger connect
      toggleFavorite(host);
    });

    li.append(info, star);
    li.addEventListener("click", () => connect(host));
    listEl.appendChild(li);
  });
}

function setActive(index) {
  const items = listEl.querySelectorAll(".item");
  if (!items.length) return;

  items[activeIndex].classList.remove("active");
  activeIndex = (index + items.length) % items.length;
  items[activeIndex].classList.add("active");
  items[activeIndex].scrollIntoView({ block: "nearest" });
}

function connect(host) {
  chrome.tabs.create({ url: buildUrl(host) });
}

function switchTab(tab) {
  currentTab = tab;
  tabEls.forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  render(searchEl.value);
  searchEl.focus();
}

tabEls.forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));

searchEl.addEventListener("input", (e) => render(e.target.value));

searchEl.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    setActive(activeIndex + 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    setActive(activeIndex - 1);
  } else if (e.key === "Enter" && matches.length) {
    connect(matches[activeIndex]);
  }
});

function loadScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL(path);
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${path}`));
    document.head.appendChild(script);
  });
}

async function loadHosts() {
  const response = await fetch(chrome.runtime.getURL("data/hosts.json"));
  if (!response.ok) {
    throw new Error("Unable to load data/hosts.json");
  }

  const config = await response.json();
  if (!Array.isArray(config.hostFiles)) {
    throw new Error("data/hosts.json must contain a hostFiles array");
  }
  if (typeof config.constantsFile !== "string" || !/^[\w.-]+\.js$/.test(config.constantsFile)) {
    throw new Error("data/hosts.json must contain a valid constantsFile");
  }

  await loadScript(`data/${config.constantsFile}`);
  if (typeof window.AWS_ACCOUNT_SWITCH_URL !== "string" || !window.AWS_ACCOUNT_SWITCH_URL) {
    throw new Error(`${config.constantsFile} must define AWS_ACCOUNT_SWITCH_URL`);
  }

  for (const file of config.hostFiles) {
    if (typeof file !== "string" || !/^[\w.-]+\.js$/.test(file)) {
      throw new Error(`Invalid host file name: ${file}`);
    }
    await loadScript(`data/${file}`);
  }

  HOSTS = Object.keys(window)
    .filter((key) => /_HOSTS$/.test(key) && Array.isArray(window[key]))
    .flatMap((key) => window[key])
    .sort((a, b) => a.hostname.localeCompare(b.hostname));
}

async function initialize() {
  try {
    await loadHosts();
  } catch (error) {
    console.error("Host data could not be loaded.", error);
    listEl.appendChild(
      el("li", "empty", "Local data could not be loaded. Check data/hosts.json and its files.")
    );
    return;
  }

  accountSwitcher.addEventListener("click", () =>
    chrome.tabs.create({ url: window.AWS_ACCOUNT_SWITCH_URL })
  );

  chrome.storage.local.get(STORAGE_KEY, (res) => {
    favorites = new Set(res[STORAGE_KEY] || []);
    render();
  });
}

initialize();