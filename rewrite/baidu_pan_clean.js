/********************************************
 百度网盘 开屏 / 广告 总管脚本（单文件版）


 处理范围（根据 URL 自动分流）：
 1) /rest/*/pcs/adv?m=config
    → 直接返回“无广告配置”，覆盖本地缓存，干掉开屏/活动位
 2) /api/diffall
    → 递归删除所有广告 / 活动 / 推广字段
 3) 任意 baidu 域下的 H5 页面
    若页面文本包含「跳转详情页或第三方应用」
    → 视为开屏落地页，替换为空白页
 其余请求一律不改，原样返回
*********************************************/

let body = $response.body;
const url = $request.url || "";

if (!body) {
  $done({});
}

// 尝试判断是不是 HTML
function looksLikeHTML(text) {
  return /<html[\s\S]*?>/i.test(text) || /<!doctype html>/i.test(text);
}

// 通用广告字段判断
function isAdKey(key) {
  const k = String(key).toLowerCase();
  const adKeys = [
    "ad","ads","adv","adinfo","ad_info",
    "adlist","ad_list","adslot","adslot_list",
    "advert","advertise","advertise_list","advert_list",
    "banner","banner_list",
    "splash","splash_ad","splashadvert",
    "launchad","launch_ad","open_screen_ad","openscreenad",
    "promotion","promotion_list",
    "activity","activity_list",
    "marketing",
    "feed_ad","feedads","feed_ad_list",
    "tips_ad","operation_info",
    "welfare","coins","gamecenter"
  ];
  return adKeys.some(w =>
    k === w || k.endsWith("_" + w) || k.indexOf(w) !== -1
  );
}

// 判断一个对象是不是“广告块”
function isAdLike(item, parentKey) {
  if (!item || typeof item !== "object") return false;
  const keys = Object.keys(item).map(k => k.toLowerCase());
  const set = new Set(keys);

  const adLikeKeys = [
    "adid","ad_id","adslotid","adslot_id",
    "adtype","ad_type","adtitle","ad_title",
    "is_ad","isads","creativeid","creative_id",
    "clickurl","click_url","dest_url",
    "deeplink_url","impress_url","impression_url",
    "tracking_url","track_url"
  ];
  if (adLikeKeys.some(k => set.has(k))) return true;

  if (isAdKey(parentKey)) return true;

  const urlLike = keys
    .filter(k => k.includes("url") || k.includes("link"))
    .map(k => String(item[k]).toLowerCase());
  if (
    urlLike.some(u =>
      u.includes("ad.") ||
      u.includes("/ad/") ||
      u.includes("advert") ||
      u.includes("eclick.baidu.com") ||
      u.includes("als.baidu.com")
    )
  ) {
    return true;
  }

  return false;
}

// 递归清理 JSON 中广告字段 / 列表
function deepClean(node, parentKey) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      const item = node[i];
      if (isAdLike(item, parentKey)) {
        node.splice(i, 1);
      } else {
        deepClean(item, parentKey);
      }
    }
  } else if (typeof node === "object") {
    for (const k of Object.keys(node)) {
      const v = node[k];

      if (isAdKey(k)) {
        if (Array.isArray(v)) node[k] = [];
        else if (v && typeof v === "object") node[k] = {};
        else delete node[k];
        continue;
      }

      deepClean(v, k);
    }
  }
}

try {
  // 1) adv 配置：直接返回“无广告”的干净配置
  if (/\/rest\/.+\/pcs\/adv/.test(url)) {
    let reqId = 0;
    try {
      const tmp = JSON.parse(body);
      if (tmp && typeof tmp === "object" && tmp.request_id) {
        reqId = tmp.request_id;
      }
    } catch (_) {}

    const cleaned = {
      errno: 0,
      errmsg: "success",
      request_id: reqId,
      result: {
        app_config: {},
        ad_list: [],
        adv_list: [],
        splash: [],
        splash_advertise_type_area: {},
        business_ad_config_area: {},
        bottom_area: { cfg_list: [] },
        my_settings: { cfg_list: [] }
      }
    };
    $done({ body: JSON.stringify(cleaned) });
    return;
  }

  // 2) diffall：递归洗空广告字段
  if (/\/api\/diffall/.test(url)) {
    let obj = JSON.parse(body);
    deepClean(obj, "");
    $done({ body: JSON.stringify(obj) });
    return;
  }

  // 3) H5 开屏落地页：通过文案识别
  if (typeof body === "string" && looksLikeHTML(body)) {
    if (body.includes("跳转详情页或第三方应用")) {
      const emptyHtml =
        "<!doctype html><html><head><meta charset=\"utf-8\">" +
        "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no\">" +
        "<title></title></head><body style=\"margin:0;background:#ffffff;\"></body></html>";
      $done({ body: emptyHtml });
      return;
    }
  }

  // 其他情况一律不动
  $done({ body });
} catch (e) {
  // 解析失败就放行原文，避免功能异常
  $done({ body });
}
