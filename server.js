const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const port = Number(process.env.PORT || 8585);
const amapKey = process.env.AMAP_KEY || "33e77f9a83c7250dfbdda86ca642682c";
const amapNetworkCache = new Map();
const cacheTtlMs = 10 * 60 * 1000;
const dataDir = path.join(root, "data");
const localLibraryPath = path.join(dataDir, "amap-stations-cache.json");
const crawlStatePath = path.join(dataDir, "amap-crawl-state.json");
const nioOfficialBaseUrl = "https://chargermap-fe-gateway.nio.com/pe/bff/gateway/powermap/h5";
const nioOfficialMapUrl = "https://www.nio.cn/official-map";
const nioOfficialResourceCode = "h5_charge_map_power_swap_resource_cdn_link";
const localLibraryVersion = 1;
let localLibraryMemo = null;
const defaultCities = ["深圳市", "上海市", "北京市", "广州市", "杭州市", "苏州市", "南京市", "成都市", "武汉市", "西安市"];

const searchProfiles = [
  { provider: "BYD", network: "比亚迪高德充电", keyword: "比亚迪闪充汽车充电站", defaultPages: 2, deepPages: 5, default: true },
  { provider: "BYD", network: "比亚迪高德充电", keyword: "比亚迪闪充", defaultPages: 1, deepPages: 3, default: true },
  { provider: "BYD", network: "比亚迪高德充电", keyword: "比亚迪兆瓦闪充", defaultPages: 1, deepPages: 3, default: true },
  { provider: "BYD", network: "比亚迪高德充电", keyword: "比亚迪超充", defaultPages: 1, deepPages: 2 },
  { provider: "BYD", network: "比亚迪高德充电", keyword: "比亚迪汽车充电站", defaultPages: 1, deepPages: 2 },
  { provider: "BYD", network: "比亚迪高德充电", keyword: "比亚迪闪充服务区", defaultPages: 1, deepPages: 2 },
  { provider: "BYD", network: "比亚迪高德充电", keyword: "比亚迪闪充高速", defaultPages: 1, deepPages: 2 },
  { provider: "BYD", network: "比亚迪高德充电", keyword: "比亚迪兆瓦闪充服务区", defaultPages: 1, deepPages: 2 },
  { provider: "BYD", network: "比亚迪高德充电", keyword: "腾势闪充", defaultPages: 1, deepPages: 2 },
  { provider: "BYD", network: "比亚迪高德充电", keyword: "方程豹闪充", defaultPages: 1, deepPages: 2 },
  { provider: "BYD", network: "比亚迪高德充电", keyword: "仰望闪充", defaultPages: 1, deepPages: 2 },
  { provider: "NIO", network: "蔚来换电", keyword: "蔚来换电站", defaultPages: 1, deepPages: 3, default: true },
  { provider: "NIO", network: "蔚来换电", keyword: "蔚来换电服务区", defaultPages: 1, deepPages: 2 },
  { provider: "NIO", network: "蔚来换电", keyword: "蔚来高速换电", defaultPages: 1, deepPages: 2 },
  { provider: "NIO", network: "蔚来换电", keyword: "NIO Power", defaultPages: 1, deepPages: 2 }
];

const crawlSeedRegions = [
  "北京市", "天津市", "上海市", "重庆市",
  "石家庄市", "唐山市", "秦皇岛市", "邯郸市", "保定市", "张家口市", "承德市", "沧州市", "廊坊市", "衡水市",
  "太原市", "大同市", "阳泉市", "长治市", "晋城市", "朔州市", "晋中市", "运城市", "忻州市", "临汾市", "吕梁市",
  "呼和浩特市", "包头市", "乌海市", "赤峰市", "通辽市", "鄂尔多斯市", "呼伦贝尔市", "巴彦淖尔市", "乌兰察布市",
  "沈阳市", "大连市", "鞍山市", "抚顺市", "本溪市", "丹东市", "锦州市", "营口市", "阜新市", "辽阳市", "盘锦市", "铁岭市", "朝阳市", "葫芦岛市",
  "长春市", "吉林市", "四平市", "辽源市", "通化市", "白山市", "松原市", "白城市",
  "哈尔滨市", "齐齐哈尔市", "鸡西市", "鹤岗市", "双鸭山市", "大庆市", "伊春市", "佳木斯市", "七台河市", "牡丹江市", "黑河市", "绥化市",
  "南京市", "无锡市", "徐州市", "常州市", "苏州市", "南通市", "连云港市", "淮安市", "盐城市", "扬州市", "镇江市", "泰州市", "宿迁市",
  "杭州市", "宁波市", "温州市", "嘉兴市", "湖州市", "绍兴市", "金华市", "衢州市", "舟山市", "台州市", "丽水市",
  "合肥市", "芜湖市", "蚌埠市", "淮南市", "马鞍山市", "淮北市", "铜陵市", "安庆市", "黄山市", "滁州市", "阜阳市", "宿州市", "六安市", "亳州市", "池州市", "宣城市",
  "福州市", "厦门市", "莆田市", "三明市", "泉州市", "漳州市", "南平市", "龙岩市", "宁德市",
  "南昌市", "景德镇市", "萍乡市", "九江市", "新余市", "鹰潭市", "赣州市", "吉安市", "宜春市", "抚州市", "上饶市",
  "济南市", "青岛市", "淄博市", "枣庄市", "东营市", "烟台市", "潍坊市", "济宁市", "泰安市", "威海市", "日照市", "临沂市", "德州市", "聊城市", "滨州市", "菏泽市",
  "郑州市", "开封市", "洛阳市", "平顶山市", "安阳市", "鹤壁市", "新乡市", "焦作市", "濮阳市", "许昌市", "漯河市", "三门峡市", "南阳市", "商丘市", "信阳市", "周口市", "驻马店市",
  "武汉市", "黄石市", "十堰市", "宜昌市", "襄阳市", "鄂州市", "荆门市", "孝感市", "荆州市", "黄冈市", "咸宁市", "随州市",
  "长沙市", "株洲市", "湘潭市", "衡阳市", "邵阳市", "岳阳市", "常德市", "张家界市", "益阳市", "郴州市", "永州市", "怀化市", "娄底市",
  "广州市", "韶关市", "深圳市", "珠海市", "汕头市", "佛山市", "江门市", "湛江市", "茂名市", "肇庆市", "惠州市", "梅州市", "汕尾市", "河源市", "阳江市", "清远市", "东莞市", "中山市", "潮州市", "揭阳市", "云浮市",
  "南宁市", "柳州市", "桂林市", "梧州市", "北海市", "防城港市", "钦州市", "贵港市", "玉林市", "百色市", "贺州市", "河池市", "来宾市", "崇左市",
  "海口市", "三亚市", "三沙市", "儋州市",
  "成都市", "自贡市", "攀枝花市", "泸州市", "德阳市", "绵阳市", "广元市", "遂宁市", "内江市", "乐山市", "南充市", "眉山市", "宜宾市", "广安市", "达州市", "雅安市", "巴中市", "资阳市",
  "贵阳市", "六盘水市", "遵义市", "安顺市", "毕节市", "铜仁市",
  "昆明市", "曲靖市", "玉溪市", "保山市", "昭通市", "丽江市", "普洱市", "临沧市",
  "拉萨市", "日喀则市", "昌都市", "林芝市", "山南市", "那曲市",
  "西安市", "铜川市", "宝鸡市", "咸阳市", "渭南市", "延安市", "汉中市", "榆林市", "安康市", "商洛市",
  "兰州市", "嘉峪关市", "金昌市", "白银市", "天水市", "武威市", "张掖市", "平凉市", "酒泉市", "庆阳市", "定西市", "陇南市",
  "西宁市", "海东市", "银川市", "石嘴山市", "吴忠市", "固原市", "中卫市",
  "乌鲁木齐市", "克拉玛依市", "吐鲁番市", "哈密市"
];

const crawlProvinceRegions = [
  "北京市", "天津市", "河北省", "山西省", "内蒙古自治区", "辽宁省", "吉林省", "黑龙江省",
  "上海市", "江苏省", "浙江省", "安徽省", "福建省", "江西省", "山东省", "河南省",
  "湖北省", "湖南省", "广东省", "广西壮族自治区", "海南省", "重庆市", "四川省",
  "贵州省", "云南省", "西藏自治区", "陕西省", "甘肃省", "青海省", "宁夏回族自治区",
  "新疆维吾尔自治区"
];

const crawlFlashKeywords = [
  "比亚迪闪充汽车充电站",
  "比亚迪闪充",
  "比亚迪兆瓦闪充",
  "比亚迪超充",
  "比亚迪汽车充电站",
  "闪充比亚迪",
  "BYD闪充",
  "腾势闪充",
  "方程豹闪充",
  "仰望闪充",
  "比亚迪闪充服务区",
  "比亚迪闪充高速"
];

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store"
  });
  res.end(body);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (upstream) => {
        let body = "";
        upstream.setEncoding("utf8");
        upstream.on("data", (chunk) => {
          body += chunk;
        });
        upstream.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

function cleanText(value) {
  if (Array.isArray(value)) return "";
  return String(value ?? "").trim();
}

function parsePoiLocation(location) {
  const [lng, lat] = cleanText(location).split(",").map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

function parseLngLatPair(location) {
  const [lng, lat] = cleanText(location).split(",").map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

function inferAdminFromAddress(address) {
  const text = cleanText(address);
  const admin = { province: "", city: "", district: "" };
  const provinceMatch = text.match(/^(北京市|天津市|上海市|重庆市|香港特别行政区|澳门特别行政区|内蒙古自治区|广西壮族自治区|宁夏回族自治区|新疆维吾尔自治区|西藏自治区|[^省]{2,12}省)/);
  if (!provinceMatch) return admin;

  admin.province = provinceMatch[1];
  let rest = text.slice(admin.province.length);
  if (/市$/.test(admin.province)) {
    admin.city = admin.province;
  } else {
    const cityMatch = rest.match(/^([^市州盟地区]{1,16}(?:市|自治州|地区|盟))/);
    if (cityMatch) {
      admin.city = cityMatch[1];
      rest = rest.slice(cityMatch[1].length);
    }
  }

  const districtMatch = rest.match(/^([^区县市旗]{1,16}(?:区|县|市|旗))/);
  if (districtMatch) admin.district = districtMatch[1];
  if (!admin.city && admin.district) admin.city = admin.district;
  if (!admin.city && /特别行政区$/.test(admin.province)) admin.city = admin.province;
  return admin;
}

function adminFromAmapRegeo(payload) {
  const component = payload?.regeocode?.addressComponent || {};
  const province = cleanText(component.province);
  const district = cleanText(component.district);
  const city = cleanText(component.city) || (/市$/.test(province) || /特别行政区$/.test(province) ? province : district);
  return {
    province,
    city,
    district,
    adcode: cleanText(component.adcode),
    citycode: cleanText(component.citycode),
    formattedAddress: cleanText(payload?.regeocode?.formatted_address)
  };
}

function needsAdminSupplement(station) {
  return !cleanText(station?.province) || !cleanText(station?.city);
}

function validationSignals({ provider, typecode, text }) {
  const type = cleanText(typecode);
  const haystack = cleanText(text);
  const hasAmapChargeType = type === "011100" || /充电站|充电桩|超级充电|超充站|快充站/.test(haystack);
  const hasAmapSwapType = type === "011101" || /换电站|充换电站|换电/.test(haystack);
  const hasFlashSignal = /闪充|兆瓦|超充|超级充电/.test(haystack);
  const hasBydStrongChargeName = /比亚迪闪充汽车充电站|比亚迪兆瓦闪充站|比亚迪超充站/.test(haystack);
  const hasNioSwapSignal = /蔚来.*换电|NIO.*换电|换电站|充换电站/.test(haystack);

  if (provider === "BYD") {
    const valid = (hasAmapChargeType && hasFlashSignal) || hasBydStrongChargeName;
    return {
      valid,
      kind: "byd-flash-charge",
      signals: [
        hasAmapChargeType ? "amap-charge-poi" : "",
        hasFlashSignal ? "flash-keyword" : "",
        hasBydStrongChargeName ? "strong-byd-charge-name" : ""
      ].filter(Boolean)
    };
  }

  if (provider === "NIO") {
    const valid = hasAmapSwapType || hasNioSwapSignal;
    return {
      valid,
      kind: "nio-swap",
      signals: [
        type === "011101" ? "amap-swap-typecode" : "",
        hasAmapSwapType ? "swap-keyword" : "",
        hasNioSwapSignal ? "nio-swap-name" : ""
      ].filter(Boolean)
    };
  }

  return { valid: false, kind: "unknown", signals: [] };
}

function poiValidationText(poi) {
  return [
    cleanText(poi.name),
    cleanText(poi.address),
    cleanText(poi.adname),
    cleanText(poi.type),
    cleanText(poi.keytag),
    cleanText(poi.business_area)
  ].join(" ");
}

function stationValidationText(station) {
  return [
    cleanText(station.name),
    cleanText(station.address),
    cleanText(station.district),
    cleanText(station.city),
    cleanText(station.province),
    ...(Array.isArray(station.attributeTags) ? station.attributeTags.map(cleanText) : [])
  ].join(" ");
}

function validatePoiForNetwork(poi, provider) {
  return validationSignals({
    provider,
    typecode: cleanText(poi.typecode),
    text: poiValidationText(poi)
  });
}

function validateStationForLibrary(station) {
  return validationSignals({
    provider: station.provider,
    typecode: cleanText(station.source?.typecode),
    text: stationValidationText(station)
  });
}

function inferCategory(poi, provider) {
  const text = `${cleanText(poi.name)} ${cleanText(poi.address)} ${cleanText(poi.business_area)} ${cleanText(poi.type)}`;
  if (cleanText(poi.typecode) === "011101" || /换电/.test(text)) {
    return "换电站";
  }

  if (/高速|服务区|收费站|枢纽|互通/.test(text)) return "高速站";
  if (/4S|汽车城|销售|展厅|体验中心|王朝|海洋|腾势|方程豹|仰望|门店|店/.test(text)) return "4S站";
  return "开放站";
}

function normalizePoi(poi, profile) {
  const location = parsePoiLocation(poi.location);
  if (!location) return null;

  const name = cleanText(poi.name);
  const address = cleanText(poi.address || poi.adname || "");
  const searchable = `${name} ${address} ${cleanText(poi.type)} ${cleanText(poi.keytag)}`;
  const hasNioBrand = /蔚来|NIO/i.test(searchable);
  const hasBydBrand = /(比亚迪|BYD|腾势|方程豹|仰望)/i.test(searchable);
  const provider = hasNioBrand
    ? "NIO"
    : hasBydBrand
      ? "BYD"
      : null;
  if (profile.provider === "BYD" && provider !== "BYD") return null;
  if (profile.provider === "NIO" && provider !== "NIO") return null;
  if (profile.provider === "AUTO" && provider !== "BYD" && provider !== "NIO") return null;

  const validation = validatePoiForNetwork(poi, provider);
  if (!validation.valid) return null;

  const category = inferCategory(poi, provider);
  const openTime = cleanText(poi.biz_ext?.open_time) || cleanText(poi.biz_ext?.opentime2);
  const network = provider === "NIO" ? "蔚来换电" : "比亚迪高德充电";
  const id = `amap-${provider.toLowerCase()}-${cleanText(poi.id) || `${name}-${location.lng}-${location.lat}`}`;

  return {
    id,
    provider,
    network,
    name,
    city: cleanText(poi.cityname) || cleanText(poi.pname),
    province: cleanText(poi.pname),
    district: cleanText(poi.adname),
    address,
    location,
    category,
    connectors: provider === "NIO"
      ? { swap: 1 }
      : { flash: 1 },
    available: {},
    price: { currentElecFee: null, currentServiceFee: null, periods: [] },
    businessHours: openTime || "以高德地图详情为准",
    parkFee: "以高德地图/现场为准",
    phone: cleanText(poi.tel),
    rating: cleanText(poi.biz_ext?.rating),
    serviceTags: ["高德POI", provider === "NIO" ? "高德换电确认" : "高德充电确认"],
    attributeTags: [cleanText(poi.keytag), cleanText(poi.type), cleanText(poi.business_area)].filter(Boolean),
    swapStatus: provider === "NIO" ? "以蔚来/高德实时信息为准" : "",
    source: {
      confidence: "amap-poi",
      label: `高德充电地图 POI：${profile.keyword}`,
      url: "https://lbs.amap.com/api/webservice/guide/api/search",
      capturedAt: new Date().toISOString(),
      poiId: cleanText(poi.id),
      typecode: cleanText(poi.typecode),
      updatedAt: cleanText(poi.timestamp),
      availabilityNote: "高德公开 POI 接口未返回实时可用桩数量",
      priceNote: "高德公开 POI 接口未返回实时电价",
      validation
    }
  };
}

function stationDedupeKey(station) {
  const poiId = cleanText(station.source?.poiId);
  if (poiId) return `${station.provider || "AUTO"}-${poiId}`;
  const location = station.location || {};
  return [
    station.provider || "AUTO",
    cleanText(station.name),
    Number(location.lng || 0).toFixed(6),
    Number(location.lat || 0).toFixed(6)
  ].join("|");
}

function stationLocationMergeKey(station) {
  const location = station.location || {};
  const lng = Number(location.lng);
  const lat = Number(location.lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return "";
  return [
    station.provider || "AUTO",
    lng.toFixed(6),
    lat.toFixed(6)
  ].join("|");
}

function mergeSourceLabels(left, right) {
  return Array.from(new Set(
    `${cleanText(left)} / ${cleanText(right)}`
      .split("/")
      .map((item) => item.trim())
      .filter(Boolean)
  )).join(" / ");
}

function dedupeStations(stations) {
  const map = new Map();
  const preferredKeyByLocation = new Map();
  stations.forEach((station) => {
    const poiId = cleanText(station.source?.poiId);
    const locationKey = stationLocationMergeKey(station);
    if (poiId && locationKey && !preferredKeyByLocation.has(locationKey)) {
      preferredKeyByLocation.set(locationKey, stationDedupeKey(station));
    }
  });

  stations
    .slice()
    .sort((left, right) => Number(Boolean(cleanText(right.source?.poiId))) - Number(Boolean(cleanText(left.source?.poiId))))
    .forEach((station) => {
      const poiId = cleanText(station.source?.poiId);
      const locationKey = stationLocationMergeKey(station);
      const key = !poiId && locationKey && preferredKeyByLocation.has(locationKey)
        ? preferredKeyByLocation.get(locationKey)
        : stationDedupeKey(station);
      const current = map.get(key);
      if (!current) {
        map.set(key, station);
        return;
      }

      const currentTags = Array.isArray(current.attributeTags) ? current.attributeTags : [];
      const stationTags = Array.isArray(station.attributeTags) ? station.attributeTags : [];
      const keep = {
        ...current,
        phone: current.phone || station.phone,
        rating: current.rating || station.rating,
        category: current.category === "开放站" ? station.category : current.category,
        businessHours: current.businessHours === "以高德地图详情为准" ? station.businessHours : current.businessHours,
        source: {
          ...current.source,
          ...station.source,
          poiId: cleanText(current.source?.poiId) || cleanText(station.source?.poiId),
          label: mergeSourceLabels(current.source?.label, station.source?.label)
        },
        attributeTags: Array.from(new Set([...currentTags, ...stationTags]))
      };
      map.set(key, keep);
    });
  return Array.from(map.values());
}

function localLibraryStats(stations) {
  const stats = {
    total: stations.length,
    providers: {},
    categories: {},
    provinces: {},
    cities: {}
  };

  stations.forEach((station) => {
    const provider = station.provider || "UNKNOWN";
    const category = station.category || "未分类";
    const province = station.province || "未知省份";
    const city = station.city || "未知城市";
    stats.providers[provider] = (stats.providers[provider] || 0) + 1;
    stats.categories[category] = (stats.categories[category] || 0) + 1;
    stats.provinces[province] = (stats.provinces[province] || 0) + 1;
    stats.cities[city] = (stats.cities[city] || 0) + 1;
  });

  return stats;
}

function emptyLocalLibrary() {
  return {
    schema: localLibraryVersion,
    source: "local-library",
    updatedAt: null,
    count: 0,
    stats: localLibraryStats([]),
    stations: []
  };
}

function sortStationsForLibrary(stations) {
  return stations.slice().sort((left, right) => {
    const provinceCompare = cleanText(left.province).localeCompare(cleanText(right.province), "zh-CN");
    if (provinceCompare) return provinceCompare;
    const cityCompare = cleanText(left.city).localeCompare(cleanText(right.city), "zh-CN");
    if (cityCompare) return cityCompare;
    const providerCompare = cleanText(left.provider).localeCompare(cleanText(right.provider), "zh-CN");
    if (providerCompare) return providerCompare;
    return cleanText(left.name).localeCompare(cleanText(right.name), "zh-CN");
  });
}

function uniqueStrings(items) {
  return Array.from(new Set((items || []).map(cleanText).filter(Boolean)));
}

function prepareStationForLibrary(station) {
  if (!station?.location) return null;
  const validation = validateStationForLibrary(station);
  if (!validation.valid) return null;
  const provider = station.provider;
  const sourceConfidence = cleanText(station.source?.confidence);
  const confirmationTag = sourceConfidence === "nio-official"
    ? "蔚来官网换电确认"
    : provider === "NIO"
      ? "高德换电确认"
      : "高德充电确认";
  return {
    ...station,
    category: provider === "NIO" ? "换电站" : station.category,
    connectors: provider === "NIO" ? { swap: 1 } : { flash: 1 },
    serviceTags: uniqueStrings([
      ...(Array.isArray(station.serviceTags) ? station.serviceTags : []),
      confirmationTag
    ]),
    source: {
      ...(station.source || {}),
      validation
    }
  };
}

function buildLocalLibrary(stations, updatedAt = new Date().toISOString()) {
  const prepared = (stations || []).map(prepareStationForLibrary).filter(Boolean);
  const deduped = sortStationsForLibrary(dedupeStations(prepared));
  return {
    schema: localLibraryVersion,
    source: "local-library",
    updatedAt,
    count: deduped.length,
    stats: localLibraryStats(deduped),
    stations: deduped
  };
}

function readLocalLibrary() {
  if (localLibraryMemo) return localLibraryMemo;
  if (!fs.existsSync(localLibraryPath)) {
    localLibraryMemo = emptyLocalLibrary();
    return localLibraryMemo;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(localLibraryPath, "utf8"));
    localLibraryMemo = buildLocalLibrary(parsed.stations || [], parsed.updatedAt || null);
  } catch (error) {
    localLibraryMemo = emptyLocalLibrary();
    localLibraryMemo.error = error.message;
  }
  return localLibraryMemo;
}

function readRawLocalLibrary() {
  if (!fs.existsSync(localLibraryPath)) return emptyLocalLibrary();
  try {
    return JSON.parse(fs.readFileSync(localLibraryPath, "utf8"));
  } catch (error) {
    return { ...emptyLocalLibrary(), error: error.message };
  }
}

function writeLocalLibrary(stations) {
  const library = buildLocalLibrary(stations);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(localLibraryPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
  localLibraryMemo = library;
  return library;
}

function mergeLocalLibrary(stations) {
  const incoming = Array.isArray(stations) ? stations.filter(Boolean) : [];
  const current = readLocalLibrary();
  if (!incoming.length) return current;
  return writeLocalLibrary([...current.stations, ...incoming]);
}

function localLibraryMeta(library = readLocalLibrary()) {
  return {
    path: "data/amap-stations-cache.json",
    updatedAt: library.updatedAt,
    count: library.count,
    stats: library.stats
  };
}

function handleLocalLibrary(res) {
  send(res, 200, JSON.stringify({
    ...readLocalLibrary(),
    path: "data/amap-stations-cache.json"
  }), "application/json; charset=utf-8");
}

function handleLocalLibraryRevalidate(res) {
  const raw = readRawLocalLibrary();
  const beforeStats = localLibraryStats(raw.stations || []);
  const library = writeLocalLibrary(raw.stations || []);
  send(res, 200, JSON.stringify({
    source: "local-library-revalidate",
    before: {
      count: (raw.stations || []).length,
      stats: beforeStats
    },
    after: {
      count: library.count,
      stats: library.stats
    },
    removed: Math.max(0, (raw.stations || []).length - library.count),
    localLibrary: localLibraryMeta(library)
  }), "application/json; charset=utf-8");
}

function nioOfficialHeaders() {
  return {
    "accept": "application/json, text/plain, */*",
    "origin": "https://chargermap.nio.com",
    "referer": "https://chargermap.nio.com/pe/h5/static/chargermap?channel=official",
    "user-agent": "Mozilla/5.0"
  };
}

function buildNioOfficialUrl(pathname, params = {}) {
  const pathPrefix = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const url = new URL(`${nioOfficialBaseUrl}${pathPrefix}`);
  const baseParams = {
    app_ver: "5.2.0",
    client: "pc",
    container: "brower",
    lang: "zh",
    region: "CN",
    app_id: "100119",
    channel: "official",
    brand: "nio",
    timestamp: String(Date.now())
  };
  Object.entries({ ...baseParams, ...params }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNioOfficialJson(pathname, params = {}) {
  return fetchJsonWithTimeout(buildNioOfficialUrl(pathname, params), {
    headers: nioOfficialHeaders()
  });
}

async function fetchAmapRegeo(location) {
  const upstream = new URL("https://restapi.amap.com/v3/geocode/regeo");
  upstream.searchParams.set("key", amapKey);
  upstream.searchParams.set("location", `${location.lng},${location.lat}`);
  upstream.searchParams.set("extensions", "base");
  upstream.searchParams.set("radius", "1000");
  upstream.searchParams.set("roadlevel", "0");
  upstream.searchParams.set("output", "json");
  return fetchJsonWithTimeout(upstream, {}, 12000);
}

async function fetchAmapRegeoWithRetry(location) {
  let lastRateLimitedPayload = null;
  let lastError = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await sleep(1200 * attempt);
    try {
      const payload = await fetchAmapRegeo(location);
      if (payload.infocode !== "10021") return payload;
      lastRateLimitedPayload = payload;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastRateLimitedPayload) return lastRateLimitedPayload;
  throw lastError || new Error("AMap regeo failed");
}

async function fetchNioOfficialSwapIndex() {
  const dictionary = await fetchNioOfficialJson("/charge-map/v2/configs/dictionary", {
    codes: nioOfficialResourceCode
  });
  if (dictionary.result_code !== "success" || !Array.isArray(dictionary.data)) {
    throw new Error("NIO official dictionary request failed");
  }

  const linkValue = dictionary.data.find((item) => item.key === nioOfficialResourceCode)?.value;
  const resourceUrls = cleanText(linkValue).split(";").map((item) => item.trim()).filter(Boolean);
  if (!resourceUrls.length) {
    throw new Error("NIO official swap resource link is empty");
  }

  const seen = new Set();
  const items = [];
  for (const resourceUrl of resourceUrls) {
    const payload = await fetchJsonWithTimeout(resourceUrl, {
      headers: {
        "referer": "https://chargermap.nio.com/",
        "user-agent": "Mozilla/5.0"
      }
    });
    if (!Array.isArray(payload)) continue;
    payload.forEach((item) => {
      const key = cleanText(item.id) || cleanText(item.location);
      if (!key || seen.has(key)) return;
      seen.add(key);
      items.push({ ...item, resourceUrl });
    });
  }

  return { items, resourceUrls };
}

async function fetchNioOfficialSwapDetail(item) {
  const location = parseLngLatPair(item.location);
  const params = {
    swap_id: cleanText(item.id)
  };
  if (location) {
    params.longitude = location.lng;
    params.latitude = location.lat;
  }
  const payload = await fetchNioOfficialJson("/charge-map/v2/power-swap/detail", params);
  if (payload.result_code !== "success" || !payload.data) {
    throw new Error(payload.result_code || "detail missing");
  }
  return payload.data;
}

function normalizeNioOfficialStation(item, detail) {
  const location = parseLngLatPair(item.location);
  if (!location) return null;

  const address = cleanText(detail?.address);
  const admin = inferAdminFromAddress(address);
  const officialId = cleanText(detail?.id) || crypto
    .createHash("sha1")
    .update(`${cleanText(item.id)}|${cleanText(item.location)}`)
    .digest("hex");
  const model = cleanText(detail?.model);
  const swapSupportStatus = detail?.swap_support_status ?? null;

  return {
    id: `nio-official-${officialId}`,
    provider: "NIO",
    network: "蔚来换电",
    name: cleanText(detail?.name) || "蔚来换电站（官网）",
    city: admin.city,
    province: admin.province,
    district: admin.district,
    address: address || "以蔚来官网详情为准",
    location,
    category: "换电站",
    connectors: { swap: 1 },
    available: { swapSupportStatus },
    price: { currentElecFee: null, currentServiceFee: null, periods: [] },
    businessHours: "以蔚来官网详情为准",
    parkFee: "以蔚来官网/现场为准",
    phone: "",
    rating: "",
    serviceTags: uniqueStrings(["蔚来官网", "蔚来官网换电确认", model]),
    attributeTags: uniqueStrings(["PowerSwap", cleanText(detail?.type), model]),
    swapStatus: swapSupportStatus === 1 ? "支持换电" : "以蔚来官网实时信息为准",
    source: {
      confidence: "nio-official",
      label: "蔚来官网加电地图",
      url: nioOfficialMapUrl,
      capturedAt: new Date().toISOString(),
      officialId,
      resourceId: cleanText(item.id),
      resourceUrl: cleanText(item.resourceUrl),
      detailFetched: Boolean(detail),
      validation: {
        valid: true,
        kind: "nio-swap",
        signals: ["nio-official", "swap-keyword"]
      }
    }
  };
}

async function supplementStationsAdmin(stations, concurrency, errors, delayMs = 0) {
  const targets = stations.filter((station) => station?.location && needsAdminSupplement(station));
  if (!targets.length) return { requested: 0, filled: 0, errors: 0 };

  let filled = 0;
  let errorCount = 0;
  const regeoCache = new Map();

  await mapLimit(targets, concurrency, async (station) => {
    const key = `${Number(station.location.lng).toFixed(5)},${Number(station.location.lat).toFixed(5)}`;
    try {
      if (delayMs) await sleep(delayMs);
      if (!regeoCache.has(key)) {
        regeoCache.set(key, fetchAmapRegeoWithRetry(station.location));
      }
      const payload = await regeoCache.get(key);
      if (payload.infocode !== "10000") {
        throw new Error(`${payload.info || "AMap regeo failed"} (${payload.infocode || "unknown"})`);
      }
      const admin = adminFromAmapRegeo(payload);
      if (!admin.province && !admin.city) return;

      station.province = station.province || admin.province;
      station.city = station.city || admin.city;
      station.district = station.district || admin.district;
      station.source = {
        ...(station.source || {}),
        adminSupplement: {
          provider: "amap-regeo",
          capturedAt: new Date().toISOString(),
          adcode: admin.adcode,
          citycode: admin.citycode,
          formattedAddress: admin.formattedAddress
        }
      };
      filled += 1;
    } catch (error) {
      errorCount += 1;
      errors.push({
        source: "amap-regeo",
        station: station.name,
        location: key,
        error: error.message
      });
    }
  });

  return { requested: targets.length, filled, errors: errorCount };
}

async function handleLocalLibraryAdminSupplement(url, res) {
  const concurrency = Math.max(1, Math.min(8, Number(url.searchParams.get("concurrency") || 2)));
  const delay = Math.max(0, Math.min(3000, Number(url.searchParams.get("delay") || 200)));
  const errors = [];

  try {
    const beforeLibrary = readLocalLibrary();
    const beforeMissing = beforeLibrary.stations.filter(needsAdminSupplement).length;
    const stations = beforeLibrary.stations.map((station) => ({ ...station }));
    const adminSupplement = await supplementStationsAdmin(stations, concurrency, errors, delay);
    const library = writeLocalLibrary(stations);
    const afterMissing = library.stations.filter(needsAdminSupplement).length;

    send(res, 200, JSON.stringify({
      source: "local-library-admin-supplement",
      queriedAt: new Date().toISOString(),
      before: {
        count: beforeLibrary.count,
        missingAdmin: beforeMissing
      },
      after: {
        count: library.count,
        missingAdmin: afterMissing
      },
      adminSupplement,
      localLibrary: localLibraryMeta(library),
      errors
    }), "application/json; charset=utf-8");
  } catch (error) {
    send(res, 502, JSON.stringify({
      source: "local-library-admin-supplement",
      error: "Local library admin supplement failed",
      message: error.message
    }), "application/json; charset=utf-8");
  }
}

async function handleNioOfficialSync(url, res) {
  const fetchDetails = url.searchParams.get("details") !== "false";
  const replace = url.searchParams.get("replace") !== "false";
  const fillAdmin = url.searchParams.get("regeo") !== "false";
  const limit = Math.max(0, Math.min(6000, Number(url.searchParams.get("limit") || 0)));
  const concurrency = Math.max(1, Math.min(12, Number(url.searchParams.get("concurrency") || 8)));
  const regeoConcurrency = Math.max(1, Math.min(8, Number(url.searchParams.get("regeoConcurrency") || 4)));
  const regeoDelay = Math.max(0, Math.min(3000, Number(url.searchParams.get("regeoDelay") || 120)));
  const detailDelay = Math.max(0, Math.min(1000, Number(url.searchParams.get("detailDelay") || 0)));
  const errors = [];

  try {
    const beforeLibrary = readLocalLibrary();
    const beforeNio = beforeLibrary.stations.filter((station) => station.provider === "NIO").length;
    const { items, resourceUrls } = await fetchNioOfficialSwapIndex();
    const selectedItems = limit ? items.slice(0, limit) : items;
    const detailMap = new Map();

    if (fetchDetails) {
      await mapLimit(selectedItems, concurrency, async (item, index) => {
        if (detailDelay) await sleep(detailDelay * (index % concurrency));
        try {
          const detail = await fetchNioOfficialSwapDetail(item);
          detailMap.set(cleanText(item.id), detail);
        } catch (error) {
          errors.push({
            resourceId: cleanText(item.id),
            location: cleanText(item.location),
            error: error.message
          });
        }
      });
    }

    const stations = selectedItems
      .map((item) => normalizeNioOfficialStation(item, detailMap.get(cleanText(item.id))))
      .filter(Boolean);
    const detailErrorCount = errors.length;
    const adminSupplement = fillAdmin
      ? await supplementStationsAdmin(stations, regeoConcurrency, errors, regeoDelay)
      : { requested: 0, filled: 0, errors: 0 };
    const baseStations = replace
      ? beforeLibrary.stations.filter((station) => station.provider !== "NIO")
      : beforeLibrary.stations;
    const library = writeLocalLibrary([...baseStations, ...stations]);
    const afterNio = library.stations.filter((station) => station.provider === "NIO").length;

    send(res, 200, JSON.stringify({
      source: "nio-official",
      queriedAt: new Date().toISOString(),
      officialTotal: items.length,
      synced: stations.length,
      detailFetched: detailMap.size,
      detailErrors: detailErrorCount,
      adminSupplement,
      replaced: replace ? beforeNio : 0,
      before: {
        count: beforeLibrary.count,
        nio: beforeNio
      },
      after: {
        count: library.count,
        nio: afterNio
      },
      added: library.count - beforeLibrary.count,
      resourceUrls,
      localLibrary: localLibraryMeta(library),
      errors
    }), "application/json; charset=utf-8");
  } catch (error) {
    send(res, 502, JSON.stringify({
      source: "nio-official",
      error: "NIO official sync failed",
      message: error.message
    }), "application/json; charset=utf-8");
  }
}

function readCrawlState() {
  if (!fs.existsSync(crawlStatePath)) {
    return { schema: 1, cursor: 0, processed: 0, updatedAt: null, signature: "" };
  }

  try {
    return JSON.parse(fs.readFileSync(crawlStatePath, "utf8"));
  } catch (error) {
    return { schema: 1, cursor: 0, processed: 0, updatedAt: null, signature: "", error: error.message };
  }
}

function writeCrawlState(state) {
  fs.mkdirSync(dataDir, { recursive: true });
  const payload = {
    schema: 1,
    ...state,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(crawlStatePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

function uniqueCleanList(items) {
  return Array.from(new Set((items || [])
    .map((item) => cleanText(item))
    .filter(Boolean)
    .filter((item) => !/^未知/.test(item))));
}

function crawlRegionsFromLibrary() {
  return uniqueCleanList([...defaultCities, ...crawlSeedRegions, ...crawlProvinceRegions]);
}

function crawlProfiles(provider = "BYD") {
  if (provider === "NIO") {
    return searchProfiles
      .filter((profile) => profile.provider === "NIO")
      .map((profile) => ({ ...profile, deepPages: Math.max(2, profile.deepPages || 2) }));
  }

  return crawlFlashKeywords.map((keyword) => ({
    provider: "BYD",
    network: "比亚迪高德充电",
    keyword,
    defaultPages: 1,
    deepPages: keyword === "比亚迪闪充汽车充电站" ? 5 : 3,
    default: true
  }));
}

function buildCrawlQueue({ regions, provider, pages }) {
  const queryRegions = uniqueCleanList(regions?.length ? regions : crawlRegionsFromLibrary());
  const profiles = crawlProfiles(provider);
  const queue = [];
  queryRegions.forEach((region) => {
    profiles.forEach((profile) => {
      const profilePages = Math.min(pages, profile.deepPages || 2);
      for (let page = 1; page <= profilePages; page += 1) {
        queue.push({ region, profile, page });
      }
    });
  });
  return queue;
}

function crawlSignature({ regions, provider, pages }) {
  const raw = JSON.stringify({
    provider,
    pages,
    regions: uniqueCleanList(regions?.length ? regions : crawlRegionsFromLibrary()),
    keywords: crawlProfiles(provider).map((profile) => profile.keyword)
  });
  return crypto.createHash("sha1").update(raw).digest("hex");
}

function parseBoundsParam(boundsText) {
  const values = cleanText(boundsText).split(",").map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) return null;
  const [minLng, minLat, maxLng, maxLat] = values;
  return { minLng, minLat, maxLng, maxLat };
}

async function fetchAmapPage({ city, profile, page, offset, bounds }) {
  const upstream = new URL(bounds ? "https://restapi.amap.com/v3/place/polygon" : "https://restapi.amap.com/v3/place/text");
  upstream.searchParams.set("key", amapKey);
  upstream.searchParams.set("keywords", profile.keyword);
  if (bounds) {
    upstream.searchParams.set("polygon", `${bounds.minLng},${bounds.minLat}|${bounds.maxLng},${bounds.maxLat}`);
  } else if (city) {
    upstream.searchParams.set("city", city);
    upstream.searchParams.set("citylimit", "true");
  }
  upstream.searchParams.set("offset", String(offset));
  upstream.searchParams.set("page", String(page));
  upstream.searchParams.set("extensions", "all");
  upstream.searchParams.set("output", "json");
  return fetchJson(upstream);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAmapPageWithRetry(task) {
  const first = await fetchAmapPage(task);
  if (first.infocode !== "10021") return first;
  await sleep(1400);
  return fetchAmapPage(task);
}

async function mapLimit(items, limit, worker) {
  const results = [];
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function handleAmapPlaceSearch(url, res) {
  const keywords = url.searchParams.get("keywords") || "";
  const city = url.searchParams.get("city") || "";
  const page = Math.max(1, Math.min(10, Number(url.searchParams.get("page") || 1)));
  const offset = Math.max(1, Math.min(25, Number(url.searchParams.get("offset") || 20)));
  if (!keywords || !city) {
    send(res, 400, JSON.stringify({ error: "keywords and city are required" }), "application/json; charset=utf-8");
    return;
  }

  const upstream = new URL("https://restapi.amap.com/v3/place/text");
  upstream.searchParams.set("key", amapKey);
  upstream.searchParams.set("keywords", keywords);
  upstream.searchParams.set("city", city);
  upstream.searchParams.set("citylimit", "true");
  upstream.searchParams.set("offset", String(offset));
  upstream.searchParams.set("page", String(page));
  upstream.searchParams.set("extensions", "all");
  upstream.searchParams.set("output", "json");

  try {
    const payload = await fetchJson(upstream);
    send(res, 200, JSON.stringify(payload), "application/json; charset=utf-8");
  } catch (error) {
    send(res, 502, JSON.stringify({ error: "AMap request failed" }), "application/json; charset=utf-8");
  }
}

async function handleAmapNetworkSearch(url, res) {
  const bounds = parseBoundsParam(url.searchParams.get("bounds"));
  const nation = url.searchParams.get("nation") === "true";
  const keyword = cleanText(url.searchParams.get("keyword"));
  const deep = bounds || keyword || url.searchParams.get("deep") === "true";
  const cities = (url.searchParams.get("cities") || url.searchParams.get("city") || defaultCities.join(","))
    .split(",")
    .map((city) => city.trim())
    .filter(Boolean)
    .slice(0, 60);
  const providers = new Set((url.searchParams.get("providers") || "BYD,NIO")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean));
  const maxPages = Math.max(1, Math.min(5, Number(url.searchParams.get("pages") || (deep ? 3 : 1))));
  const offset = Math.max(1, Math.min(25, Number(url.searchParams.get("offset") || 25)));
  const profiles = searchProfiles
    .filter((profile) => providers.has(profile.provider))
    .filter((profile) => deep || profile.default);
  if (keyword) {
    profiles.unshift({
      provider: providers.size === 1 ? Array.from(providers)[0] : "AUTO",
      network: "高德搜索",
      keyword,
      defaultPages: 1,
      deepPages: 2,
      default: true
    });
  }
  const cacheKey = JSON.stringify({ bounds, nation, cities: bounds || nation ? [] : cities, providers: Array.from(providers).sort(), keyword, deep: Boolean(deep), maxPages, offset });
  const cached = amapNetworkCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < cacheTtlMs) {
    send(res, 200, JSON.stringify({
      ...cached.payload,
      cache: "hit",
      localLibrary: localLibraryMeta()
    }), "application/json; charset=utf-8");
    return;
  }

  const tasks = [];
  const queryCities = bounds || nation ? [""] : cities;
  queryCities.forEach((city) => {
    profiles.forEach((profile) => {
      const profilePages = nation ? maxPages : (deep ? (profile.deepPages || profile.defaultPages) : profile.defaultPages);
      const pages = Math.min(maxPages, profilePages);
      for (let page = 1; page <= pages; page += 1) {
        tasks.push({ city, profile, page, offset, bounds });
      }
    });
  });

  const errors = [];
  const stations = [];
  try {
    await mapLimit(tasks, 1, async (task) => {
      try {
        await sleep(300);
        const payload = await fetchAmapPageWithRetry(task);
        if (payload.infocode !== "10000" || !Array.isArray(payload.pois)) {
          errors.push({ city: task.city, keyword: task.profile.keyword, info: payload.info, infocode: payload.infocode });
          return;
        }
        payload.pois.map((poi) => normalizePoi(poi, task.profile)).filter(Boolean).forEach((station) => stations.push(station));
      } catch (error) {
        errors.push({ city: task.city, keyword: task.profile.keyword, error: error.message });
      }
    });

    const deduped = dedupeStations(stations);
    let libraryMeta = localLibraryMeta();
    try {
      libraryMeta = localLibraryMeta(mergeLocalLibrary(deduped));
    } catch (error) {
      errors.push({ city: "local-library", keyword: "write-cache", error: error.message });
    }
    const payload = {
      source: "amap-poi",
      cities,
      queriedAt: new Date().toISOString(),
      count: deduped.length,
      stations: deduped,
      localLibrary: libraryMeta,
      errors
    };
    amapNetworkCache.set(cacheKey, { createdAt: Date.now(), payload });
    send(res, 200, JSON.stringify(payload), "application/json; charset=utf-8");
  } catch (error) {
    send(res, 502, JSON.stringify({ error: "AMap network request failed" }), "application/json; charset=utf-8");
  }
}

async function handleAmapCrawl(url, res) {
  const provider = cleanText(url.searchParams.get("provider") || "BYD").toUpperCase() === "NIO" ? "NIO" : "BYD";
  const regions = (url.searchParams.get("regions") || url.searchParams.get("cities") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const pages = Math.max(1, Math.min(5, Number(url.searchParams.get("pages") || 5)));
  const offset = Math.max(1, Math.min(25, Number(url.searchParams.get("offset") || 25)));
  const steps = Math.max(1, Math.min(120, Number(url.searchParams.get("steps") || 24)));
  const reset = url.searchParams.get("reset") === "true";
  const wrap = url.searchParams.get("wrap") === "true";
  const queue = buildCrawlQueue({ regions, provider, pages });
  const signature = crawlSignature({ regions, provider, pages });
  let state = readCrawlState();

  if (reset || state.signature !== signature || state.cursor >= queue.length && wrap) {
    state = { schema: 1, cursor: 0, processed: 0, signature };
  }

  const startCursor = Math.min(Number(state.cursor || 0), queue.length);
  const tasks = queue.slice(startCursor, startCursor + steps);
  const errors = [];
  const stations = [];
  const taskSummaries = [];

  try {
    await mapLimit(tasks, 1, async (task) => {
      await sleep(350);
      try {
        const payload = await fetchAmapPageWithRetry({
          city: task.region,
          profile: task.profile,
          page: task.page,
          offset,
          bounds: null
        });
        taskSummaries.push({
          region: task.region,
          keyword: task.profile.keyword,
          page: task.page,
          count: Number(payload.count || 0),
          pois: Array.isArray(payload.pois) ? payload.pois.length : 0
        });
        if (payload.infocode !== "10000" || !Array.isArray(payload.pois)) {
          errors.push({ region: task.region, keyword: task.profile.keyword, page: task.page, info: payload.info, infocode: payload.infocode });
          return;
        }
        payload.pois.map((poi) => normalizePoi(poi, task.profile)).filter(Boolean).forEach((station) => stations.push(station));
      } catch (error) {
        errors.push({ region: task.region, keyword: task.profile.keyword, page: task.page, error: error.message });
      }
    });

    const before = readLocalLibrary().count;
    const deduped = dedupeStations(stations);
    const library = mergeLocalLibrary(deduped);
    const cursor = startCursor + tasks.length;
    const nextState = writeCrawlState({
      schema: 1,
      signature,
      cursor,
      processed: Number(state.processed || 0) + tasks.length,
      provider,
      pages,
      totalTasks: queue.length,
      lastRun: {
        startedAt: new Date().toISOString(),
        tasks: tasks.length,
        found: deduped.length,
        added: Math.max(0, library.count - before),
        errors: errors.length
      }
    });

    send(res, 200, JSON.stringify({
      source: "amap-crawl",
      provider,
      count: deduped.length,
      added: Math.max(0, library.count - before),
      stations: deduped,
      localLibrary: localLibraryMeta(library),
      progress: {
        cursor,
        total: queue.length,
        percent: queue.length ? Math.round((cursor / queue.length) * 1000) / 10 : 100,
        done: cursor >= queue.length,
        updatedAt: nextState.updatedAt
      },
      tasks: taskSummaries,
      errors
    }), "application/json; charset=utf-8");
  } catch (error) {
    send(res, 502, JSON.stringify({ error: "AMap crawl failed", message: error.message }), "application/json; charset=utf-8");
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname === "/api/amap/place") {
    handleAmapPlaceSearch(url, res);
    return;
  }
  if (url.pathname === "/api/amap/network") {
    handleAmapNetworkSearch(url, res);
    return;
  }
  if (url.pathname === "/api/local-library/revalidate") {
    handleLocalLibraryRevalidate(res);
    return;
  }
  if (url.pathname === "/api/local-library/admin-supplement") {
    handleLocalLibraryAdminSupplement(url, res);
    return;
  }
  if (url.pathname === "/api/local-library") {
    handleLocalLibrary(res);
    return;
  }
  if (url.pathname === "/api/amap/crawl") {
    handleAmapCrawl(url, res);
    return;
  }
  if (url.pathname === "/api/nio/official/sync") {
    handleNioOfficialSync(url, res);
    return;
  }

  const pathname = decodeURIComponent(url.pathname);
  const target = pathname === "/" ? "/index.html" : pathname;
  const resolved = path.resolve(root, `.${target}`);

  if (!resolved.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(resolved, (err, data) => {
    if (err) {
      send(res, 404, "Not found");
      return;
    }
    send(res, 200, data, types[path.extname(resolved).toLowerCase()] || "application/octet-stream");
  });
});

server.listen(port, () => {
  console.log(`Flash map running at http://localhost:${port}`);
});
