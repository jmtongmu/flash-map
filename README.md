# 全国闪充与换电网络地图

本地运行：

```powershell
cd F:\Flash
npm start
```

打开 `http://localhost:8585`。

## 数据口径

- 当前主数据源已切换为高德 Web 服务 POI 搜索，本地接口为 `/api/amap/network`。
- 高德接口每次命中的站点会自动合并到本地库 `data/amap-stations-cache.json`；页面启动时优先读取 `/api/local-library`，有缓存时先显示本地库，再后台补新。
- 左侧“逐步更新”会调用 `/api/amap/crawl`，按城市/省份/关键词/页码从高德逐批遍历全国 BYD 闪充 POI；每一批新增点都会继续沉淀到本地库。城市输入框仍用于“加载城市”的即时补充。
- 默认关键词覆盖：`比亚迪闪充`、`比亚迪兆瓦闪充`、`蔚来换电站`。
- 增量遍历额外覆盖：`比亚迪闪充汽车充电站`、`比亚迪超充`、`比亚迪汽车充电站`、`BYD闪充`、`腾势闪充`、`方程豹闪充`、`仰望闪充`、高速/服务区关键词等。
- 页面启动时加载重点城市；左侧城市输入框可继续按城市补充高德充电/换电 POI。
- 地图低缩放按省份聚合显示点位数量，放大后进入城市聚合，再放大显示具体站点。
- 点击省份会深度补充该省 POI，包含“比亚迪闪充服务区”“比亚迪闪充高速”“蔚来换电服务区”等高速/服务区关键词；拖动或缩放到具体区域时也会按当前地图范围补拉 POI。
- 高德公开 POI 能返回站名、地址、经纬度、类型、部分营业时间、评分、更新时间等；公开 POI 接口暂未返回实时可用桩数量、排队状态和实时电价。
- 高德 Key：已按你提供的 `XXXXXXXXXXXXXXXXXX` 接入前端和本地服务。若高德控制台启用了安全密钥校验，需要在 `app.js` 的 `window._AMapSecurityConfig` 中补充 `securityJsCode`。

## 数据字段

每个站点包含：

- `provider`：`BYD` 或 `NIO`
- `category`：`高速站`、`4S站`、`开放站`、`换电站`
- `location`：`lng` / `lat`
- `connectors`：按高德 POI 命中类型标记为闪充、充电或换电点位
- `available`：高德公开 POI 暂无实时空闲桩，默认不填
- `price.currentElecFee`、`price.currentServiceFee`、`price.periods`：高德公开 POI 暂无实时电价，默认不填
- `businessHours`
- `source.confidence`、`source.label`、`source.url`、`source.capturedAt`

## 统计模块

- 电站密度：按当前筛选后的城市站点数、终端数、空闲率计算城市排行。
- 建设速度：当前基于高德 POI 实时拉取结果作为基线；后续按日保存同结构 JSON 后可自动计算增速。
- 高需求地区：当前用高德点位密度和类型生成代理指数；接入运营商实时空闲、订单、排队数据后可升级。

数据源调研见 `docs/data-sources.md`。
