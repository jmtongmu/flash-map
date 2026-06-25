# 数据源调研与接入优先级

更新时间：2026-06-25

## 当前主数据源

### BYD 闪充：高德 Web 服务 POI 搜索

- 官方文档：<https://lbs.amap.com/api/webservice/guide/api/search>
- 接口形态：`https://restapi.amap.com/v3/place/text`
- 已在本地服务接入：`/api/amap/network?cities=上海市,深圳市&providers=BYD`
- 增量遍历：`/api/amap/crawl?provider=BYD`
- 用途：按城市、省份、地图范围拉取“比亚迪闪充”“比亚迪兆瓦闪充”“比亚迪闪充汽车充电站”“腾势闪充”等 POI，作为当前 BYD 闪充主数据源。
- 优点：位置、名称、地址、营业时间、POI 类型、更新时间等信息稳定，适合做地图底层与点位校验。
- 限制：高德公开 POI 暂未返回实时空闲桩、电价、服务费、排队等运营字段。
- 本项目标记：`source.confidence = amap-poi`。

### 蔚来换电：蔚来官网加电地图

- 官方入口：<https://www.nio.cn/official-map>
- H5 地图：<https://chargermap.nio.com/pe/h5/static/chargermap?channel=official>
- 已在本地服务接入：`/api/nio/official/sync`
- 公开索引：官网字典接口会返回 `h5_charge_map_power_swap_resource_cdn_link`，当前资源内含 3713 个 `PowerSwap` 换电资源。
- 详情字段：站名、地址、坐标、换电站型号、换电支持状态等。
- 行政区补全：官网详情不直接返回省市区，本项目用站点坐标调用高德逆地理补齐省、市、区和行政编码，仅用于统计与省份聚合。
- 本项目标记：`source.confidence = nio-official`，`source.adminSupplement.provider = amap-regeo`。

### 高德 Web 服务逆地理编码

- 官方文档：<https://lbs.amap.com/api/webservice/guide/api/georegeo>
- 接口形态：`https://restapi.amap.com/v3/geocode/regeo`
- 已在本地服务接入：`/api/local-library/admin-supplement`
- 用途：为官网换电点和少量高德 POI 别名补全省市区，提升省份分级、城市统计和地图聚合准确性。

## 已停用源

### bydflash.site 前端公开数据

- 用途：历史一期临时样本；当前运行时不再使用。
- 已接入字段：站名、城市、地址、经纬度、闪充/快充数量、空闲数量、电费、服务费、分时电价、营业时间、停车费、4S/高速标记。
- 当前快照：3860 个站点，8634 个闪充终端。
- 停用原因：已按需求切换到高德充电地图 POI，不再依赖第三方前端公开资源。
- 本项目标记：`source.confidence = public-page`。

## 更可靠补充源

### 高德 JS API

- 官方文档：<https://lbs.amap.com/api/javascript-api-v2/summary>
- 用途：地图渲染、点位展示、视野控制、前端交互。
- 当前状态：已接入用户提供的 Key；地图和点位渲染通过本地验证。

## 官方入口

### 比亚迪官方充电桩查询

- 官方页面：<https://www.byd.com/cn/charge-station>
- 用途：官方查询入口与字段口径校验。
- 观察：页面公开接口可查询充电运营商和站点列表，但返回内容是泛充电/合作运营网络，并不等同于“比亚迪闪充站”清单。
- 当前决策：暂不把该接口批量合入 BYD 闪充库；继续以高德 POI 的“比亚迪闪充/兆瓦闪充/闪充汽车充电站”等强信号为准，避免把普通合作充电站误判成闪充。

### 比亚迪兆瓦闪充生态新闻

- 官方页面：<https://www.byd.com/cn/news/2025/detail588>
- 用途：建设规划和合作生态依据。
- 观察：官方披露与小桔充电、新电途共建 15000 座兆瓦闪充生态。

### 蔚来官方地图 / 加电地图

- 官方页面：<https://www.nio.cn/official-map>
- H5 加电地图：<https://chargermap.nio.com/pe/h5/static/chargermap>
- 用途：蔚来换电、充电、门店、服务中心官方查询入口。
- 观察：已验证 `PowerSwap` 资源索引和详情接口可用于官网换电站清单，同步结果当前为 3713 个换电点。

## 后续建议

1. 每天保存一份高德 POI 快照 JSON，建设速度模块即可计算日增、周增、城市扩张速度。
2. 扩展高德 Web 服务关键词与城市列表，建立 POI 校验表和去重规则。
3. 与官方或运营商开放平台对接实时运营字段：电价、服务费、空闲桩、排队、故障、营业状态。
4. 高需求地区要从“空闲率代理指标”升级到“订单/导航/排队/车流”综合指数。
