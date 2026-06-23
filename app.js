const AMAP_KEY = "33e77f9a83c7250dfbdda86ca642682c";
const AMAP_VERSION = "2.0";
const CHINA_BOUNDS = { minLng: 73, maxLng: 135, minLat: 17, maxLat: 54 };
const PROVINCE_AGGREGATE_ZOOM = 5.8;
const CITY_AGGREGATE_ZOOM = 8.5;
const CITY_AGGREGATE_THRESHOLD = 50;
const MARKER_CHUNK_SIZE = 180;
const CATEGORIES = ["高速站", "4S站", "开放站", "换电站"];
const INITIAL_AMAP_CITIES = ["深圳市", "上海市", "北京市", "广州市", "杭州市", "苏州市", "南京市", "成都市", "武汉市", "西安市"];
const AMAP_BATCH_CITIES = [
  "深圳市", "上海市", "北京市", "广州市", "杭州市", "苏州市", "南京市", "成都市", "武汉市", "西安市",
  "天津市", "重庆市", "长沙市", "郑州市", "合肥市", "宁波市", "青岛市", "厦门市", "福州市", "南昌市",
  "济南市", "沈阳市", "大连市", "昆明市", "贵阳市", "南宁市", "太原市", "石家庄市", "兰州市", "乌鲁木齐市"
];
const AMAP_PROVINCES = [
  { name: "北京市", short: "北京", center: [116.4074, 39.9042] },
  { name: "天津市", short: "天津", center: [117.2000, 39.0842] },
  { name: "河北省", short: "河北", center: [114.5149, 38.0428] },
  { name: "山西省", short: "山西", center: [112.5492, 37.8570] },
  { name: "内蒙古自治区", short: "内蒙古", center: [111.6708, 40.8183] },
  { name: "辽宁省", short: "辽宁", center: [123.4291, 41.7968] },
  { name: "吉林省", short: "吉林", center: [125.3245, 43.8868] },
  { name: "黑龙江省", short: "黑龙江", center: [126.6425, 45.7560] },
  { name: "上海市", short: "上海", center: [121.4737, 31.2304] },
  { name: "江苏省", short: "江苏", center: [118.7969, 32.0603] },
  { name: "浙江省", short: "浙江", center: [120.1551, 30.2741] },
  { name: "安徽省", short: "安徽", center: [117.2830, 31.8612] },
  { name: "福建省", short: "福建", center: [119.2965, 26.0745] },
  { name: "江西省", short: "江西", center: [115.8582, 28.6829] },
  { name: "山东省", short: "山东", center: [117.1201, 36.6512] },
  { name: "河南省", short: "河南", center: [113.6254, 34.7466] },
  { name: "湖北省", short: "湖北", center: [114.3054, 30.5931] },
  { name: "湖南省", short: "湖南", center: [112.9388, 28.2282] },
  { name: "广东省", short: "广东", center: [113.2644, 23.1291] },
  { name: "广西壮族自治区", short: "广西", center: [108.3200, 22.8240] },
  { name: "海南省", short: "海南", center: [110.3312, 20.0310] },
  { name: "重庆市", short: "重庆", center: [106.5516, 29.5630] },
  { name: "四川省", short: "四川", center: [104.0665, 30.5728] },
  { name: "贵州省", short: "贵州", center: [106.6302, 26.6470] },
  { name: "云南省", short: "云南", center: [102.7123, 25.0406] },
  { name: "西藏自治区", short: "西藏", center: [91.1172, 29.6469] },
  { name: "陕西省", short: "陕西", center: [108.9398, 34.3416] },
  { name: "甘肃省", short: "甘肃", center: [103.8343, 36.0611] },
  { name: "青海省", short: "青海", center: [101.7782, 36.6171] },
  { name: "宁夏回族自治区", short: "宁夏", center: [106.2782, 38.4664] },
  { name: "新疆维吾尔自治区", short: "新疆", center: [87.6168, 43.8256] }
];
const AMAP_PROVINCE_NAMES = AMAP_PROVINCES.map((province) => province.name);

const state = {
  amapReady: false,
  heatMode: false,
  map: null,
  markers: [],
  selectedMarker: null,
  renderToken: 0,
  renderTimer: null,
  markerMode: "idle",
  forceStationLayer: false,
  focusedCity: null,
  loadedBoundsKeys: new Set(),
  lastSearchFetchKey: "",
  isFetchingPois: false,
  isLoadingProvinceOverview: false,
  loadingProvinceName: "",
  allStations: [],
  filteredStations: [],
  selectedId: null,
  insightMode: "density",
  provider: "all",
  categories: new Set(CATEGORIES),
  search: "",
  minAvailable: 0,
  maxPrice: 2.5,
  loadedAmapCities: new Set()
};

const el = {
  map: document.querySelector("#map"),
  fallbackMap: document.querySelector("#fallback-map"),
  mapStatus: document.querySelector("#map-status"),
  searchInput: document.querySelector("#search-input"),
  categoryFilters: document.querySelector("#category-filters"),
  minAvailable: document.querySelector("#min-available"),
  minAvailableLabel: document.querySelector("#min-available-label"),
  maxPrice: document.querySelector("#max-price"),
  maxPriceLabel: document.querySelector("#max-price-label"),
  filteredCount: document.querySelector("#filtered-count"),
  stationList: document.querySelector("#station-list"),
  insightContent: document.querySelector("#insight-content"),
  insightScope: document.querySelector("#insight-scope"),
  detail: document.querySelector("#detail-content"),
  emptyDetail: document.querySelector("#empty-detail"),
  fitMap: document.querySelector("#fit-map"),
  toggleDensity: document.querySelector("#toggle-density"),
  resetFilters: document.querySelector("#reset-filters"),
  nioCityInput: document.querySelector("#nio-city-input"),
  loadNioCity: document.querySelector("#load-nio-city"),
  loadNioBatch: document.querySelector("#load-nio-batch"),
  metricBydStations: document.querySelector("#metric-byd-stations"),
  metricBydConnectors: document.querySelector("#metric-byd-connectors"),
  metricBydAvailable: document.querySelector("#metric-byd-available"),
  metricNioStations: document.querySelector("#metric-nio-stations")
};

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function availableTotal(station) {
  const available = station.available || {};
  return Object.values(available).reduce((sum, value) => sum + Number(value || 0), 0);
}

function connectorTotal(station) {
  const connectors = station.connectors || {};
  return Object.values(connectors).reduce((sum, value) => sum + Number(value || 0), 0);
}

function setMapStatus(message) {
  if (el.mapStatus) el.mapStatus.textContent = message;
}

function currentTotalPrice(station) {
  const price = station.price || {};
  if (price.currentElecFee == null && price.currentServiceFee == null) return null;
  return Number(price.currentElecFee || 0) + Number(price.currentServiceFee || 0);
}

function stationMatches(station) {
  const keyword = state.search.trim().toLowerCase();
  const haystack = [station.name, station.city, station.address, station.operatorName, station.category]
    .join(" ")
    .toLowerCase();
  const price = currentTotalPrice(station);
  const availabilityValues = Object.values(station.available || {});

  if (state.provider !== "all" && station.provider !== state.provider) return false;
  if (!state.categories.has(station.category)) return false;
  if (keyword && !haystack.includes(keyword)) return false;
  if (availabilityValues.length && availableTotal(station) < state.minAvailable) return false;
  if (price != null && price > state.maxPrice) return false;
  return true;
}

function loadAmap() {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      resolve(window.AMap);
      return;
    }
    window._AMapSecurityConfig = window._AMapSecurityConfig || {};
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=${AMAP_VERSION}&key=${AMAP_KEY}&plugin=AMap.ToolBar,AMap.Scale,AMap.PlaceSearch`;
    script.async = true;
    script.onload = () => resolve(window.AMap);
    script.onerror = () => reject(new Error("AMap script failed"));
    document.head.appendChild(script);
  });
}

async function initMap() {
  try {
    const AMap = await loadAmap();
    state.map = new AMap.Map("map", {
      viewMode: "2D",
      center: [104.1954, 35.8617],
      zoom: 4.2,
      mapStyle: "amap://styles/normal",
      resizeEnable: true
    });
    state.map.addControl(new AMap.Scale());
    state.map.addControl(new AMap.ToolBar({ position: "RB" }));
    const rerenderVisibleLayer = debounce(() => {
      if (state.allStations.length) renderMarkers();
    }, 180);
    const syncVisiblePois = debounce(() => {
      if (state.allStations.length) loadAmapBounds({ quiet: true });
    }, 900);
    state.map.on("zoomend", rerenderVisibleLayer);
    state.map.on("moveend", rerenderVisibleLayer);
    state.map.on("zoomend", syncVisiblePois);
    state.map.on("moveend", syncVisiblePois);
    state.amapReady = true;
    setMapStatus("高德地图已加载，点位来自公开页面数据和高德 POI。");
  } catch (error) {
    state.amapReady = false;
    el.map.hidden = true;
    el.fallbackMap.hidden = false;
    setMapStatus("高德地图加载失败，正在显示备用点位视图。");
  }
}

function mergeStations(stations, { replace = false } = {}) {
  const merged = new Map();
  if (!replace) {
    state.allStations.forEach((station) => merged.set(station.id, station));
  }
  stations.forEach((station) => {
    if (station.location?.lng && station.location?.lat) merged.set(station.id, station);
  });
  state.allStations = Array.from(merged.values());
}

async function fetchAmapNetwork(cities, options = {}) {
  const params = new URLSearchParams({
    providers: options.providers || "BYD,NIO",
    pages: String(options.pages || (cities.length === 1 ? 2 : 1)),
    offset: "25"
  });
  if (cities.length) params.set("cities", cities.join(","));
  if (options.bounds) params.set("bounds", options.bounds);
  if (options.keyword) params.set("keyword", options.keyword);
  if (options.deep) params.set("deep", "true");
  if (options.nation) params.set("nation", "true");
  const response = await fetch(`/api/amap/network?${params.toString()}`);
  if (!response.ok) throw new Error("AMap network data failed to load");
  return response.json();
}

async function fetchLocalLibrary() {
  const response = await fetch("/api/local-library");
  if (!response.ok) throw new Error("Local library failed to load");
  return response.json();
}

async function fetchAmapCrawl(options = {}) {
  const params = new URLSearchParams({
    provider: options.provider || "BYD",
    steps: String(options.steps || 24),
    pages: String(options.pages || 5),
    offset: "25"
  });
  if (options.regions?.length) params.set("regions", options.regions.join(","));
  if (options.reset) params.set("reset", "true");
  const response = await fetch(`/api/amap/crawl?${params.toString()}`);
  if (!response.ok) throw new Error("AMap crawl failed");
  return response.json();
}

function rememberLoadedRegions(stations) {
  (stations || []).forEach((station) => {
    if (station.city) state.loadedAmapCities.add(station.city);
  });
}

function activeProvidersParam() {
  return state.provider === "all" ? "BYD,NIO" : state.provider;
}

async function loadAmapCities(cities, options = {}) {
  const uniqueCities = Array.from(new Set(cities.map((city) => city.trim()).filter(Boolean)));
  const shouldReload = options.replace || options.keyword || options.deep || options.force;
  const pendingCities = shouldReload
    ? uniqueCities
    : uniqueCities.filter((city) => !state.loadedAmapCities.has(city));
  if (!pendingCities.length) {
    if (!options.quiet) setMapStatus("这些城市的高德数据已经加载。");
    return { added: 0, total: state.allStations.length };
  }

  setMapStatus(options.keyword
    ? `正在从高德搜索“${options.keyword}”...`
    : `正在从高德充电地图加载 ${pendingCities.join("、")} 的充电/换电 POI...`);
  const payload = await fetchAmapNetwork(pendingCities, options);
  const before = state.allStations.length;
  mergeStations(payload.stations || [], { replace: Boolean(options.replace) });
  rememberLoadedRegions(payload.stations || []);
  pendingCities.forEach((city) => state.loadedAmapCities.add(city));
  const added = state.allStations.length - (options.replace ? 0 : before);

  if (state.allStations.length) {
    state.filteredStations = state.allStations.filter(stationMatches);
    if (!state.selectedId || !state.filteredStations.some((station) => station.id === state.selectedId)) {
      state.selectedId = state.filteredStations[0]?.id || null;
    }
  }

  if (options.render !== false) applyFilters();
  if (!options.quiet) {
    const libraryText = payload.localLibrary?.count ? `，本地库 ${formatNumber(payload.localLibrary.count)} 个` : "";
    setMapStatus(`高德数据已加载：新增 ${formatNumber(Math.max(0, added))} 个点位，当前共 ${formatNumber(state.allStations.length)} 个${libraryText}。`);
  }
  return { added, total: state.allStations.length, payload };
}

function expandedBoundsBox(paddingRatio = 0.18) {
  const box = getCurrentBoundsBox();
  if (!box) return null;
  const lngPad = Math.max(0.02, (box.maxLng - box.minLng) * paddingRatio);
  const latPad = Math.max(0.02, (box.maxLat - box.minLat) * paddingRatio);
  return {
    minLng: Math.max(CHINA_BOUNDS.minLng, box.minLng - lngPad),
    minLat: Math.max(CHINA_BOUNDS.minLat, box.minLat - latPad),
    maxLng: Math.min(CHINA_BOUNDS.maxLng, box.maxLng + lngPad),
    maxLat: Math.min(CHINA_BOUNDS.maxLat, box.maxLat + latPad)
  };
}

function boundsParam(box) {
  return [box.minLng, box.minLat, box.maxLng, box.maxLat]
    .map((value) => Number(value).toFixed(5))
    .join(",");
}

function coarseBoundsKey(box, keyword = "") {
  const precision = Number(state.map?.getZoom?.() || 0) >= 10 ? 2 : 1;
  return [
    state.provider,
    keyword,
    box.minLng.toFixed(precision),
    box.minLat.toFixed(precision),
    box.maxLng.toFixed(precision),
    box.maxLat.toFixed(precision)
  ].join("|");
}

async function loadAmapBounds(options = {}) {
  if (!state.amapReady || !state.map || state.isFetchingPois) return null;
  const zoom = Number(state.map.getZoom() || 0);
  const keyword = (options.keyword || state.search || "").trim();
  if (zoom < 7 && !keyword) return null;

  const box = expandedBoundsBox(keyword ? 0.28 : 0.18);
  if (!box) return null;
  const key = coarseBoundsKey(box, keyword);
  if (!options.force && state.loadedBoundsKeys.has(key)) return null;

  state.isFetchingPois = true;
  if (!options.quiet) setMapStatus(keyword ? `正在按当前地图范围搜索“${keyword}”...` : "正在同步当前地图范围内的高德 POI...");
  try {
    const payload = await fetchAmapNetwork([], {
      bounds: boundsParam(box),
      providers: activeProvidersParam(),
      keyword,
      deep: true,
      pages: keyword ? 2 : 2
    });
    const before = state.allStations.length;
    mergeStations(payload.stations || []);
    rememberLoadedRegions(payload.stations || []);
    state.loadedBoundsKeys.add(key);
    applyFilters();
    const added = state.allStations.length - before;
    if (!options.quiet || added > 0) {
      const libraryText = payload.localLibrary?.count ? `，本地库 ${formatNumber(payload.localLibrary.count)} 个` : "";
      setMapStatus(`当前视野已同步高德 POI，新增 ${formatNumber(Math.max(0, added))} 个点位${libraryText}。`);
    }
    return payload;
  } catch (error) {
    console.error(error);
    if (!options.quiet) setMapStatus("当前视野高德 POI 同步失败，请稍后重试。");
    return null;
  } finally {
    state.isFetchingPois = false;
  }
}

function provinceMeta(name) {
  if (!name) return null;
  return AMAP_PROVINCES.find((province) => province.name === name || province.short === name)
    || AMAP_PROVINCES.find((province) => name.includes(province.short) || province.name.includes(name));
}

async function loadAmapProvince(provinceName, options = {}) {
  const meta = provinceMeta(provinceName);
  const name = meta?.name || provinceName;
  await loadAmapCities([name], {
    deep: true,
    pages: options.pages || 3,
    providers: activeProvidersParam(),
    ...options
  });
}

async function loadAmapProvinces(provinceNames, options = {}) {
  const names = provinceNames.map((name) => provinceMeta(name)?.name || name).filter(Boolean);
  await loadAmapCities(names, {
    pages: options.pages || 1,
    providers: activeProvidersParam(),
    ...options
  });
}

async function loadProvinceOverview() {
  if (state.isLoadingProvinceOverview) return;
  state.isLoadingProvinceOverview = true;
  try {
    setMapStatus("正在后台拉取全国高德 POI 概览，省级数量会逐步更完整...");
    const payload = await fetchAmapNetwork([], {
      nation: true,
      providers: activeProvidersParam(),
      pages: 5
    });
    mergeStations(payload.stations || []);
    rememberLoadedRegions(payload.stations || []);
    applyFilters();
    const libraryText = payload.localLibrary?.count ? `，本地库 ${formatNumber(payload.localLibrary.count)} 个` : "";
    setMapStatus(`省级基础数据已补充：当前 ${formatNumber(state.allStations.length)} 个高德点位${libraryText}，点击省份可继续深度加载高速服务区。`);
  } catch (error) {
    console.error(error);
    setMapStatus("省级基础数据补充失败，可稍后点击“加载全国重点”重试。");
  } finally {
    state.isLoadingProvinceOverview = false;
  }
}

async function syncSearchWithAmap({ force = false } = {}) {
  const keyword = state.search.trim();
  if (keyword.length < 2) return;
  const key = `${activeProvidersParam()}|${keyword}|${state.amapReady ? coarseBoundsKey(expandedBoundsBox(0.28) || CHINA_BOUNDS, keyword) : "cities"}`;
  if (!force && key === state.lastSearchFetchKey) return;
  state.lastSearchFetchKey = key;

  if (state.amapReady) {
    const payload = await loadAmapBounds({ keyword, force: true });
    if (payload) return;
  }

  const fallbackCities = Array.from(state.loadedAmapCities).slice(0, 12);
  await loadAmapCities(fallbackCities.length ? fallbackCities : INITIAL_AMAP_CITIES, {
    keyword,
    providers: activeProvidersParam(),
    deep: true,
    pages: 2
  });
}

async function loadData() {
  state.allStations = [];
  state.loadedAmapCities = new Set();
  try {
    const library = await fetchLocalLibrary();
    const stations = Array.isArray(library.stations) ? library.stations : [];
    if (stations.length) {
      mergeStations(stations, { replace: true });
      rememberLoadedRegions(stations);
      setMapStatus(`已从本地库加载 ${formatNumber(stations.length)} 个高德点位，页面会在后台继续补新。`);
      return;
    }
  } catch (error) {
    console.warn(error);
  }
  await loadAmapCities(INITIAL_AMAP_CITIES, { replace: true, render: false, quiet: true });
}

function renderCategoryFilters() {
  el.categoryFilters.innerHTML = CATEGORIES.map((category) => `
    <label class="check-chip">
      <input type="checkbox" value="${escapeHtml(category)}" ${state.categories.has(category) ? "checked" : ""} />
      <span>${escapeHtml(category)}</span>
    </label>
  `).join("");
}

function renderMetrics() {
  const byd = state.allStations.filter((station) => station.provider === "BYD");
  const nio = state.allStations.filter((station) => station.provider === "NIO");
  const withBusinessHours = state.allStations.filter((station) => station.businessHours && station.businessHours !== "以高德地图详情为准").length;
  el.metricBydStations.textContent = formatNumber(byd.length);
  el.metricBydConnectors.textContent = formatNumber(state.allStations.length);
  el.metricBydAvailable.textContent = formatNumber(withBusinessHours);
  el.metricNioStations.textContent = formatNumber(nio.length);
}

function computeCityStats(stations = state.filteredStations) {
  const cityMap = new Map();
  stations.forEach((station) => {
    const city = station.city || "未知城市";
    if (!cityMap.has(city)) {
      cityMap.set(city, {
        city,
        count: 0,
        connectors: 0,
        available: 0,
        lowIdleStations: 0,
        totalPrice: 0,
        priceCount: 0,
        providers: new Set()
      });
    }
    const item = cityMap.get(city);
    const connectors = connectorTotal(station);
    const available = availableTotal(station);
    const price = currentTotalPrice(station);
    item.count += 1;
    item.connectors += connectors;
    item.available += available;
    item.lowIdleStations += connectors > 0 && available / connectors <= 0.25 ? 1 : 0;
    if (price != null) {
      item.totalPrice += price;
      item.priceCount += 1;
    }
    item.providers.add(station.provider);
  });

  return Array.from(cityMap.values()).map((item) => {
    const idleRate = item.connectors ? item.available / item.connectors : 0;
    return {
      ...item,
      idleRate,
      avgPrice: item.priceCount ? item.totalPrice / item.priceCount : null,
      demandScore: Math.round((item.connectors * (1 - idleRate) + item.lowIdleStations * 3) * 10) / 10,
      providerText: Array.from(item.providers).join("/")
    };
  });
}

function maxOf(items, key, fallback = 1) {
  return Math.max(fallback, ...items.map((item) => Number(item[key] || 0)));
}

function renderBarList(items, key, options = {}) {
  const max = maxOf(items, key);
  return `
    <div class="bar-list">
      ${items.map((item) => {
        const value = Number(item[key] || 0);
        const width = Math.max(2, (value / max) * 100);
        return `
          <div class="bar-row" title="${escapeHtml(item.city)}">
            <span class="bar-label">${escapeHtml(item.city)}</span>
            <span class="bar-track"><span class="bar-fill ${options.fillClass || ""}" style="width:${width}%"></span></span>
            <span class="bar-value">${options.format ? options.format(value, item) : formatNumber(value)}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderInsights() {
  const stats = computeCityStats();
  const stationCount = state.filteredStations.length;
  const cityCount = stats.length;
  const connectorCount = state.filteredStations.reduce((sum, station) => sum + connectorTotal(station), 0);
  const availableCount = state.filteredStations.reduce((sum, station) => sum + availableTotal(station), 0);
  const idleRate = connectorCount ? availableCount / connectorCount : 0;
  el.insightScope.textContent = `${formatNumber(stationCount)} 站 · ${formatNumber(cityCount)} 城`;

  if (state.insightMode === "density") {
    const top = stats.slice().sort((a, b) => b.count - a.count).slice(0, 8);
    el.insightContent.innerHTML = `
      <div class="insight-summary">
        <div class="mini-stat"><span>覆盖城市</span><strong>${formatNumber(cityCount)}</strong></div>
        <div class="mini-stat"><span>终端资源</span><strong>${formatNumber(connectorCount)}</strong></div>
        <div class="mini-stat"><span>平均空闲</span><strong>${Math.round(idleRate * 100)}%</strong></div>
      </div>
      ${renderBarList(top, "count")}
      <div class="note-box">密度指数按当前筛选后的城市站点数量归一化。后续接入行政区面积、保有量或出行流量后，可升级为真实“每百平方公里/每万辆车”密度。</div>
    `;
    return;
  }

  if (state.insightMode === "demand") {
    const top = stats
      .filter((item) => item.connectors > 0)
      .sort((a, b) => b.demandScore - a.demandScore)
      .slice(0, 8);
    el.insightContent.innerHTML = `
      <div class="insight-summary">
        <div class="mini-stat"><span>低空闲站</span><strong>${formatNumber(stats.reduce((sum, item) => sum + item.lowIdleStations, 0))}</strong></div>
        <div class="mini-stat"><span>占用资源</span><strong>${formatNumber(connectorCount - availableCount)}</strong></div>
        <div class="mini-stat"><span>压力指数</span><strong>${formatNumber(Math.round(top.reduce((sum, item) => sum + item.demandScore, 0)))}</strong></div>
      </div>
      ${renderBarList(top, "demandScore", { fillClass: "warn", format: (value, item) => `${Math.round(value)} · ${Math.round((1 - item.idleRate) * 100)}%` })}
      <div class="note-box">高需求地区目前基于高德点位密度和类型做粗略代理；高德公开 POI 暂未返回实时排队、空闲桩和电价，接入运营商实时接口后可替换为真实需求指数。</div>
    `;
    return;
  }

  const firstSource = state.allStations.find((station) => station.provider === "BYD")?.source;
  const sourceTime = firstSource?.capturedAt ? new Date(firstSource.capturedAt).toLocaleDateString("zh-CN") : "当前快照";
  const topGrowthTargets = stats
    .filter((item) => item.count >= 8)
    .sort((a, b) => b.demandScore / Math.max(1, b.count) - a.demandScore / Math.max(1, a.count))
    .slice(0, 5);
  el.insightContent.innerHTML = `
    <div class="insight-summary">
      <div class="mini-stat"><span>快照日期</span><strong>${escapeHtml(sourceTime)}</strong></div>
      <div class="mini-stat"><span>高德点位</span><strong>${formatNumber(state.allStations.length)}</strong></div>
      <div class="mini-stat"><span>待接入</span><strong>监测</strong></div>
    </div>
    <div class="milestone-list">
      <div class="milestone"><strong>基线</strong><span>当前基线来自高德 POI 实时拉取结果，可作为后续快照比对起点。</span></div>
      <div class="milestone"><strong>监测</strong><span>下一步按日保存同结构 JSON，自动计算新增点位、城市扩张和热点补建速度。</span></div>
      <div class="milestone"><strong>边界</strong><span>高德公开 POI 返回的是点位信息，不等同于运营商实时建设进度或实时可用桩数量。</span></div>
    </div>
    ${renderBarList(topGrowthTargets, "demandScore", { fillClass: "warn", format: (value) => Math.round(value) })}
  `;
}

function markerContent(station, selected = false) {
  const classes = ["marker-dot"];
  if (station.provider === "NIO") classes.push("nio");
  if (station.category === "高速站") classes.push("highway");
  if (state.heatMode && availableTotal(station) > 4) classes.push("hot");
  if (selected) classes.push("selected");
  return `<div class="${classes.join(" ")}" title="${escapeHtml(station.name)}"></div>`;
}

function stationResourceLabel(station) {
  if (station.source?.confidence === "amap-poi") {
    if (station.provider === "NIO") return "高德换电 POI";
    if (station.connectors?.flash) return "高德闪充 POI";
    return "高德充电 POI";
  }
  return `空闲 ${formatNumber(availableTotal(station))}/${formatNumber(connectorTotal(station))}`;
}

function markerSchedule(callback) {
  if ("requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, { timeout: 120 });
  }
  return window.setTimeout(() => callback({ timeRemaining: () => 12 }), 16);
}

function cancelMarkerSchedule(id) {
  if (!id) return;
  if ("cancelIdleCallback" in window) window.cancelIdleCallback(id);
  else window.clearTimeout(id);
}

function clearSelectedMarker() {
  if (state.selectedMarker && state.amapReady) {
    state.map.remove(state.selectedMarker);
  }
  state.selectedMarker = null;
}

function renderSelectedMarker() {
  clearSelectedMarker();
  if (!state.amapReady || !state.selectedId) return;
  const station = state.allStations.find((item) => item.id === state.selectedId);
  if (!station) return;

  const AMap = window.AMap;
  state.selectedMarker = new AMap.Marker({
    position: [station.location.lng, station.location.lat],
    offset: new AMap.Pixel(-12, -12),
    content: markerContent(station, true),
    zIndex: 120
  });
  state.selectedMarker.on("click", () => selectStation(station.id, true));
  state.map.add(state.selectedMarker);
}

function clearMarkers() {
  state.renderToken += 1;
  cancelMarkerSchedule(state.renderTimer);
  state.renderTimer = null;
  if (state.markers.length && state.amapReady) {
    state.map.remove(state.markers);
  }
  state.markers = [];
  el.fallbackMap.querySelectorAll(".fallback-pin").forEach((node) => node.remove());
}

function shouldUseCityAggregates() {
  if (!state.amapReady || !state.map) return false;
  const hasTextSearch = state.search.trim().length > 0;
  return state.map.getZoom() < CITY_AGGREGATE_ZOOM
    && state.filteredStations.length > CITY_AGGREGATE_THRESHOLD
    && !hasTextSearch
    && !state.forceStationLayer;
}

function shouldUseProvinceAggregates() {
  if (!state.amapReady || !state.map) return false;
  const hasTextSearch = state.search.trim().length > 0;
  return state.map.getZoom() < PROVINCE_AGGREGATE_ZOOM
    && state.filteredStations.length > 30
    && !hasTextSearch
    && !state.forceStationLayer;
}

function computeProvinceAggregates(stations) {
  const provinceMap = new Map();
  stations.forEach((station) => {
    const province = station.province || "未知省份";
    if (!provinceMap.has(province)) {
      provinceMap.set(province, {
        province,
        count: 0,
        cities: new Set(),
        connectors: 0,
        available: 0,
        providers: new Set()
      });
    }
    const item = provinceMap.get(province);
    item.count += 1;
    item.cities.add(station.city || "未知城市");
    item.connectors += connectorTotal(station);
    item.available += availableTotal(station);
    item.providers.add(station.provider);
  });

  return Array.from(provinceMap.values())
    .map((item) => {
      const meta = provinceMeta(item.province);
      const fallback = state.filteredStations.find((station) => station.province === item.province)?.location;
      return {
        ...item,
        short: meta?.short || item.province.replace(/省|市|自治区|壮族|回族|维吾尔/g, ""),
        lng: meta?.center?.[0] || fallback?.lng || 104.1954,
        lat: meta?.center?.[1] || fallback?.lat || 35.8617,
        cityCount: item.cities.size
      };
    })
    .sort((a, b) => b.count - a.count);
}

function provinceContent(item) {
  const classes = ["province-aggregate-marker"];
  if (item.count >= 120) classes.push("large");
  else if (item.count >= 60) classes.push("medium");
  if (item.providers.has("NIO") && item.providers.has("BYD")) classes.push("mixed");
  else if (item.providers.has("NIO")) classes.push("nio");

  return `
    <div class="${classes.join(" ")}" data-province="${escapeHtml(item.province)}" title="${escapeHtml(item.province)} ${formatNumber(item.count)} 站">
      <strong>${formatNumber(item.count)}</strong>
      <span>${escapeHtml(item.short)}</span>
    </div>
  `;
}

async function focusProvince(provinceName, center) {
  const meta = provinceMeta(provinceName);
  const name = meta?.name || provinceName;
  if (!name || state.loadingProvinceName === name) return;
  state.loadingProvinceName = name;

  const targetCenter = center || meta?.center || [104.1954, 35.8617];
  state.forceStationLayer = false;
  setMapStatus(`正在加载 ${name} 的省级高德 POI，并切到城市层...`);
  state.map.setZoomAndCenter(Math.max(PROVINCE_AGGREGATE_ZOOM + 1, 6.6), targetCenter);
  try {
    await loadAmapProvince(name, { quiet: true, pages: 3 });
    const provinceStation = state.filteredStations.find((station) => station.province === name)
      || state.allStations.find((station) => station.province === name);
    if (provinceStation) {
      state.selectedId = provinceStation.id;
      renderSelectedMarker();
      renderList();
      renderDetail();
    }
    setMapStatus(`${name} 已补充加载，放大后显示城市/区域和具体站点。`);
  } catch (error) {
    console.error(error);
    setMapStatus(`${name} 省级 POI 加载失败，请稍后重试。`);
  } finally {
    state.loadingProvinceName = "";
  }
}

function renderProvinceMarkers() {
  const AMap = window.AMap;
  const aggregates = computeProvinceAggregates(state.filteredStations);
  state.markerMode = "province";
  state.markers = aggregates.map((item) => {
    const marker = new AMap.Marker({
      position: [item.lng, item.lat],
      offset: new AMap.Pixel(-34, -30),
      content: provinceContent(item),
      extData: item,
      zIndex: Math.min(95, 18 + Math.floor(item.count / 5))
    });
    marker.on("click", () => focusProvince(item.province, [item.lng, item.lat]));
    return marker;
  });
  state.map.add(state.markers);
  renderSelectedMarker();
  setMapStatus(`省级视图已按 ${formatNumber(aggregates.length)} 个省份聚合；点击省份可补充该省高速与城区点位。`);
}

function computeCityAggregates(stations) {
  const cityMap = new Map();
  stations.forEach((station) => {
    const city = station.city || "未知城市";
    if (!cityMap.has(city)) {
      cityMap.set(city, {
        city,
        count: 0,
        lng: 0,
        lat: 0,
        connectors: 0,
        available: 0,
        providers: new Set()
      });
    }
    const item = cityMap.get(city);
    item.count += 1;
    item.lng += Number(station.location.lng);
    item.lat += Number(station.location.lat);
    item.connectors += connectorTotal(station);
    item.available += availableTotal(station);
    item.providers.add(station.provider);
  });

  return Array.from(cityMap.values())
    .map((item) => ({
      ...item,
      lng: item.lng / item.count,
      lat: item.lat / item.count,
      idleRate: item.connectors ? item.available / item.connectors : 0
    }))
    .sort((a, b) => b.count - a.count);
}

function aggregateContent(item) {
  const classes = ["city-aggregate-marker"];
  if (item.count >= 80) classes.push("large");
  else if (item.count >= 32) classes.push("medium");
  if (item.providers.has("NIO") && item.providers.has("BYD")) classes.push("mixed");
  else if (item.providers.has("NIO")) classes.push("nio");

  const cityName = item.city.replace(/市$/, "");
  return `
    <div class="${classes.join(" ")}" title="${escapeHtml(item.city)} ${formatNumber(item.count)} 站">
      <strong>${formatNumber(item.count)}</strong>
      <span>${escapeHtml(cityName)}</span>
    </div>
  `;
}

function renderCityMarkers() {
  const AMap = window.AMap;
  const aggregates = computeCityAggregates(state.filteredStations);
  state.markerMode = "city";
  state.markers = aggregates.map((item) => {
    const marker = new AMap.Marker({
      position: [item.lng, item.lat],
      offset: new AMap.Pixel(-28, -26),
      content: aggregateContent(item),
      extData: item,
      zIndex: Math.min(90, 20 + Math.floor(item.count / 4))
    });
    marker.on("click", () => {
      const targetZoom = Math.max(CITY_AGGREGATE_ZOOM + 0.5, Math.min(12, state.map.getZoom() + 3));
      state.forceStationLayer = true;
      state.focusedCity = item.city;
      state.map.setZoomAndCenter(targetZoom, [item.lng, item.lat]);
      setMapStatus(`已定位到 ${item.city}，放大后显示具体站点。`);
      window.setTimeout(renderMarkers, 220);
      window.setTimeout(() => {
        state.forceStationLayer = false;
        state.focusedCity = null;
      }, 1200);
    });
    return marker;
  });
  state.map.add(state.markers);
  renderSelectedMarker();
  setMapStatus(`城市视图已按 ${formatNumber(aggregates.length)} 个城市聚合，放大到 ${CITY_AGGREGATE_ZOOM} 级后显示具体站点。`);
}

function getCurrentBoundsBox() {
  if (!state.amapReady || !state.map?.getBounds) return null;
  const bounds = state.map.getBounds();
  const southWest = bounds?.getSouthWest?.();
  const northEast = bounds?.getNorthEast?.();
  if (!southWest || !northEast) return null;
  return {
    minLng: Number(southWest.lng ?? southWest.getLng?.()),
    maxLng: Number(northEast.lng ?? northEast.getLng?.()),
    minLat: Number(southWest.lat ?? southWest.getLat?.()),
    maxLat: Number(northEast.lat ?? northEast.getLat?.())
  };
}

function stationsInCurrentView() {
  if (state.forceStationLayer) {
    const selected = state.allStations.find((station) => station.id === state.selectedId);
    const city = state.focusedCity || selected?.city;
    const cityStations = city ? state.filteredStations.filter((station) => station.city === city) : [];
    if (cityStations.length) return cityStations;
  }

  const box = getCurrentBoundsBox();
  if (!box || Object.values(box).some((value) => !Number.isFinite(value))) {
    return state.filteredStations;
  }
  const visible = state.filteredStations.filter((station) => {
    const lng = Number(station.location.lng);
    const lat = Number(station.location.lat);
    return lng >= box.minLng && lng <= box.maxLng && lat >= box.minLat && lat <= box.maxLat;
  });
  return visible.length ? visible : state.filteredStations.slice(0, 240);
}

function renderStationMarkers() {
  const AMap = window.AMap;
  const token = state.renderToken;
  const stations = stationsInCurrentView().filter((station) => station.id !== state.selectedId);
  let index = 0;
  state.markerMode = "station";
  renderSelectedMarker();

  const addChunk = () => {
    if (token !== state.renderToken) return;
    const chunk = [];
    while (index < stations.length && chunk.length < MARKER_CHUNK_SIZE) {
      const station = stations[index];
      const marker = new AMap.Marker({
        position: [station.location.lng, station.location.lat],
        offset: new AMap.Pixel(-9, -9),
        content: markerContent(station),
        extData: station
      });
      marker.on("click", () => selectStation(station.id, true));
      chunk.push(marker);
      index += 1;
    }

    if (chunk.length) {
      state.map.add(chunk);
      state.markers.push(...chunk);
    }

    if (index < stations.length) {
      setMapStatus(`正在分批加载可视范围站点 ${formatNumber(index)}/${formatNumber(stations.length)}...`);
      state.renderTimer = markerSchedule(addChunk);
      return;
    }

    setMapStatus(`已显示当前视野内 ${formatNumber(stations.length + (state.selectedId ? 1 : 0))} 个站点，拖动或缩放地图会按需刷新。`);
  };

  addChunk();
}

function renderFallbackMarkers() {
  clearSelectedMarker();
  state.markerMode = "fallback";

  const frag = document.createDocumentFragment();
  state.filteredStations.forEach((station) => {
    const x = ((station.location.lng - CHINA_BOUNDS.minLng) / (CHINA_BOUNDS.maxLng - CHINA_BOUNDS.minLng)) * 100;
    const y = (1 - (station.location.lat - CHINA_BOUNDS.minLat) / (CHINA_BOUNDS.maxLat - CHINA_BOUNDS.minLat)) * 100;
    const pin = document.createElement("button");
    pin.className = `fallback-pin ${station.provider === "NIO" ? "nio" : ""} ${availableTotal(station) > 4 ? "hot" : ""}`;
    pin.style.left = `${Math.max(0, Math.min(100, x))}%`;
    pin.style.top = `${Math.max(0, Math.min(100, y))}%`;
    pin.title = station.name;
    pin.addEventListener("click", () => selectStation(station.id, true));
    frag.appendChild(pin);
  });
  el.fallbackMap.appendChild(frag);
}

function renderMarkers() {
  clearMarkers();
  if (state.amapReady) {
    if (shouldUseProvinceAggregates()) renderProvinceMarkers();
    else if (shouldUseCityAggregates()) renderCityMarkers();
    else renderStationMarkers();
    return;
  }

  renderFallbackMarkers();
}

function renderList() {
  const topStations = state.filteredStations
    .slice()
    .sort((a, b) => availableTotal(b) - availableTotal(a))
    .slice(0, 180);
  el.filteredCount.textContent = formatNumber(state.filteredStations.length);
  el.stationList.innerHTML = topStations.map((station) => `
    <button class="station-card ${station.id === state.selectedId ? "active" : ""}" data-id="${escapeHtml(station.id)}" type="button">
      <span class="station-title">
        <strong>${escapeHtml(station.name)}</strong>
        <span class="badge ${station.provider === "NIO" ? "nio" : "byd"}">${station.provider}</span>
      </span>
      <p>${escapeHtml(station.city || "")} · ${escapeHtml(station.category)} · ${escapeHtml(stationResourceLabel(station))}</p>
      <p>${escapeHtml(station.address || "")}</p>
    </button>
  `).join("");
}

function priceRows(station) {
  const periods = station.price?.periods || [];
  if (!periods.length) {
    return `<tr><td colspan="3">${escapeHtml(station.source?.priceNote || "暂无分时电价")}</td></tr>`;
  }
  return periods.slice(0, 8).map((period) => `
    <tr>
      <td>${escapeHtml(formatTime(period.startTime))}-${escapeHtml(formatTime(period.endTime))}</td>
      <td>${period.elecPrice.toFixed(2)}</td>
      <td>${period.servicePrice.toFixed(2)}</td>
    </tr>
  `).join("");
}

function formatTime(value) {
  if (!value || value.length < 4) return "--";
  if (value === "240000") return "24:00";
  return `${value.slice(0, 2)}:${value.slice(2, 4)}`;
}

function renderDetail() {
  const station = state.allStations.find((item) => item.id === state.selectedId);
  if (!station) {
    el.detail.innerHTML = el.emptyDetail.innerHTML;
    return;
  }

  const totalPrice = currentTotalPrice(station);
  const source = station.source || {};
  const tags = [...(station.serviceTags || []), ...(station.attributeTags || [])].filter(Boolean);
  const isAmapPoi = source.confidence === "amap-poi";
  const resourceText = isAmapPoi
    ? (station.provider === "NIO" ? "换电站点" : "充电点位")
    : `${formatNumber(availableTotal(station))}/${formatNumber(connectorTotal(station))}`;
  el.detail.innerHTML = `
    <div class="detail-hero">
      <div class="detail-kicker">
        <span class="badge ${station.provider === "NIO" ? "nio" : "byd"}">${station.network || station.provider}</span>
        <span class="source-pill">${escapeHtml(source.confidence || "unknown")}</span>
      </div>
      <h2>${escapeHtml(station.name)}</h2>
      <address>${escapeHtml(station.address || "暂无地址")}</address>
    </div>
    <div class="detail-body">
      <div class="detail-grid">
        <div class="stat-box">
          <span>${isAmapPoi ? "高德类型" : "空闲资源"}</span>
          <strong>${escapeHtml(resourceText)}</strong>
        </div>
        <div class="stat-box">
          <span>当前总价</span>
          <strong>${totalPrice == null ? "--" : `${totalPrice.toFixed(2)} 元`}</strong>
        </div>
        <div class="stat-box">
          <span>营业时间</span>
          <strong>${escapeHtml(station.businessHours || "--")}</strong>
        </div>
        <div class="stat-box">
          <span>站点类型</span>
          <strong>${escapeHtml(station.category)}</strong>
        </div>
      </div>

      <section class="detail-section">
        <h3>资源</h3>
        <div class="kv-list">
          <div class="kv"><span>闪充</span><strong>${station.connectors?.flash ? "高德命中闪充点位" : "未标注"}${isAmapPoi ? "" : `，空闲 ${formatNumber(station.available?.flash || 0)}`}</strong></div>
          <div class="kv"><span>快充</span><strong>${station.connectors?.fast ? "高德命中充电点位" : "未标注"}${isAmapPoi ? "" : `，空闲 ${formatNumber(station.available?.fast || 0)}`}</strong></div>
          <div class="kv"><span>换电</span><strong>${station.connectors?.swap ? "高德命中换电点位" : "未标注"}${station.swapStatus ? `，状态 ${escapeHtml(station.swapStatus)}` : ""}</strong></div>
          <div class="kv"><span>可用桩</span><strong>${escapeHtml(source.availabilityNote || "以实际场站为准")}</strong></div>
          <div class="kv"><span>停车费</span><strong>${escapeHtml(station.parkFee || "以实际场站为准")}</strong></div>
        </div>
      </section>

      <section class="detail-section">
        <h3>电价</h3>
        <table class="price-table">
          <thead><tr><th>时段</th><th>电费</th><th>服务费</th></tr></thead>
          <tbody>${priceRows(station)}</tbody>
        </table>
      </section>

      <section class="detail-section">
        <h3>来源</h3>
        <div class="kv-list">
          <div class="kv"><span>来源</span><strong>${escapeHtml(source.label || "未标注")}</strong></div>
          <div class="kv"><span>更新时间</span><strong>${escapeHtml(source.updatedAt || (source.capturedAt ? new Date(source.capturedAt).toLocaleString("zh-CN") : "--"))}</strong></div>
          <div class="kv"><span>POI 编码</span><strong>${escapeHtml(source.poiId || source.typecode || "--")}</strong></div>
          <div class="kv"><span>链接</span><strong>${source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.url)}</a>` : "--"}</strong></div>
        </div>
        <div class="tag-row">
          ${tags.length ? tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("") : `<span class="tag">暂无标签</span>`}
        </div>
      </section>
    </div>
  `;
}

function applyFilters() {
  state.filteredStations = state.allStations.filter(stationMatches);
  if (state.selectedId && !state.filteredStations.some((station) => station.id === state.selectedId)) {
    state.selectedId = state.filteredStations[0]?.id || null;
  }
  if (!state.selectedId && state.filteredStations.length) {
    state.selectedId = state.filteredStations[0].id;
  }
  renderMetrics();
  renderInsights();
  renderMarkers();
  renderList();
  renderDetail();
}

function selectStation(id, pan = false) {
  state.selectedId = id;
  const station = state.allStations.find((item) => item.id === id);
  if (state.amapReady) renderSelectedMarker();
  else renderMarkers();
  renderList();
  renderDetail();
  if (pan && state.amapReady && station) {
    state.forceStationLayer = true;
    state.focusedCity = station.city || null;
    state.map.setZoomAndCenter(Math.max(state.map.getZoom(), 12), [station.location.lng, station.location.lat]);
    window.setTimeout(renderMarkers, 220);
    window.setTimeout(() => {
      state.forceStationLayer = false;
      state.focusedCity = null;
    }, 1200);
  }
}

function getStationBounds(stations) {
  if (!stations.length) return null;
  return stations.reduce((bounds, station) => {
    const lng = Number(station.location.lng);
    const lat = Number(station.location.lat);
    return {
      minLng: Math.min(bounds.minLng, lng),
      maxLng: Math.max(bounds.maxLng, lng),
      minLat: Math.min(bounds.minLat, lat),
      maxLat: Math.max(bounds.maxLat, lat)
    };
  }, {
    minLng: Infinity,
    maxLng: -Infinity,
    minLat: Infinity,
    maxLat: -Infinity
  });
}

function fitMap() {
  if (!state.filteredStations.length) return;
  if (state.amapReady) {
    state.forceStationLayer = false;
    state.focusedCity = null;
    const bounds = getStationBounds(state.filteredStations);
    if (!bounds || Object.values(bounds).some((value) => !Number.isFinite(value))) return;
    const center = [
      (bounds.minLng + bounds.maxLng) / 2,
      (bounds.minLat + bounds.maxLat) / 2
    ];

    if (bounds.minLng === bounds.maxLng && bounds.minLat === bounds.maxLat) {
      state.map.setZoomAndCenter(12, center);
    } else {
      const AMap = window.AMap;
      const southWest = new AMap.LngLat(bounds.minLng, bounds.minLat);
      const northEast = new AMap.LngLat(bounds.maxLng, bounds.maxLat);
      state.map.setBounds(new AMap.Bounds(southWest, northEast), false, [56, 56, 56, 56]);
    }
    window.setTimeout(renderMarkers, 220);
  }
}

function debounce(fn, wait = 140) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

function bindEvents() {
  const scheduleSearchSync = debounce(() => {
    syncSearchWithAmap();
  }, 720);

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item === button));
      state.provider = button.dataset.provider;
      applyFilters();
      syncSearchWithAmap({ force: true });
    });
  });

  el.searchInput.addEventListener("input", debounce((event) => {
    state.search = event.target.value;
    applyFilters();
    scheduleSearchSync();
  }));

  el.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      state.search = event.target.value;
      applyFilters();
      syncSearchWithAmap({ force: true });
    }
  });

  el.categoryFilters.addEventListener("change", (event) => {
    const input = event.target;
    if (input.matches("input[type='checkbox']")) {
      if (input.checked) state.categories.add(input.value);
      else state.categories.delete(input.value);
      applyFilters();
    }
  });

  el.minAvailable.addEventListener("input", (event) => {
    state.minAvailable = Number(event.target.value);
    el.minAvailableLabel.textContent = String(state.minAvailable);
    applyFilters();
  });

  el.maxPrice.addEventListener("input", (event) => {
    state.maxPrice = Number(event.target.value);
    el.maxPriceLabel.textContent = state.maxPrice >= 2.5 ? "不限" : `${state.maxPrice.toFixed(2)} 元`;
    applyFilters();
  });

  el.stationList.addEventListener("click", (event) => {
    const card = event.target.closest(".station-card");
    if (card) selectStation(card.dataset.id, true);
  });

  el.map.addEventListener("click", (event) => {
    const provinceMarker = event.target.closest(".province-aggregate-marker");
    if (provinceMarker?.dataset.province) {
      focusProvince(provinceMarker.dataset.province);
    }
  });

  document.querySelectorAll(".insight-tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".insight-tab").forEach((item) => item.classList.toggle("active", item === button));
      state.insightMode = button.dataset.insight;
      renderInsights();
    });
  });

  el.fitMap.addEventListener("click", fitMap);

  el.toggleDensity.addEventListener("click", () => {
    state.heatMode = !state.heatMode;
    el.toggleDensity.classList.toggle("active", state.heatMode);
    el.mapStatus.textContent = state.heatMode
      ? "热度模式：列表按空闲资源排序，备用图中高空闲点位会放大。"
      : "点位模式：按站点逐点显示。";
    renderMarkers();
  });

  el.resetFilters.addEventListener("click", () => {
    state.provider = "all";
    state.categories = new Set(CATEGORIES);
    state.search = "";
    state.minAvailable = 0;
    state.maxPrice = 2.5;
    el.searchInput.value = "";
    el.minAvailable.value = "0";
    el.maxPrice.value = "2.5";
    el.minAvailableLabel.textContent = "0";
    el.maxPriceLabel.textContent = "不限";
    document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item.dataset.provider === "all"));
    renderCategoryFilters();
    applyFilters();
  });

  el.loadNioCity.addEventListener("click", async () => {
    await loadAmapCity(el.nioCityInput.value.trim() || "上海市", { deep: true, pages: 3 });
  });

  el.loadNioBatch.addEventListener("click", async () => {
    setMapStatus("正在从高德逐步遍历全国比亚迪闪充 POI，本地库会持续变完整...");
    try {
      const payload = await fetchAmapCrawl({
        provider: "BYD",
        steps: 24,
        pages: 5
      });
      mergeStations(payload.stations || []);
      rememberLoadedRegions(payload.stations || []);
      applyFilters();
      const progress = payload.progress || {};
      const progressText = progress.total
        ? `进度 ${formatNumber(progress.cursor)}/${formatNumber(progress.total)}（${progress.percent}%）`
        : "进度待统计";
      setMapStatus(`本轮高德遍历新增 ${formatNumber(payload.added || 0)} 个点位，本地库 ${formatNumber(payload.localLibrary?.count || state.allStations.length)} 个；${progressText}。`);
    } catch (error) {
      console.error(error);
      setMapStatus("高德逐步遍历失败，请稍后再试。");
    }
  });
}

async function loadAmapCity(city, options = {}) {
  try {
    await loadAmapCities([city], options);
  } catch (error) {
    console.error(error);
    setMapStatus(`${city} 高德数据加载失败，请稍后重试。`);
  }
}

async function boot() {
  renderCategoryFilters();
  bindEvents();
  el.detail.innerHTML = el.emptyDetail.innerHTML;
  await Promise.all([loadData(), initMap()]);
  state.filteredStations = state.allStations.filter(stationMatches);
  state.selectedId = state.filteredStations[0]?.id || null;
  applyFilters();
  if (!shouldUseCityAggregates()) window.setTimeout(fitMap, 300);
  window.setTimeout(loadProvinceOverview, 1200);
}

boot().catch((error) => {
  console.error(error);
  el.mapStatus.textContent = "应用初始化失败，请检查本地数据文件。";
});
