/**
 * 百度网盘完整去广告脚本
 * 适配 iOS 13.0 - 最新版
 * 解决：开屏广告、SVIP90天广告、启动页、底部banner
 */

const url = $request.url;

let body = {};

if (url.includes("/api/diffall")) {
    // 广告配置中心 → 替换为空
    body = {
        "server_time": Math.floor(Date.now()/1000),
        "banner": [],
        "adSetting": {},
        "card_list": [],
        "ad_list": []
    };
}

if (url.includes("/rest/2.0/pcs/adv")) {
    // adv?m=config → 直接清空广告
    body = {
        "errno":0,
        "errmsg":"success",
        "request_id": "0",
        "config": {}
    };
}

if (url.includes("/pop/probe_v6_addr")) {
    // 开屏广告探针接口 → 返回空
    body = {};
}

$done({body: JSON.stringify(body)});
