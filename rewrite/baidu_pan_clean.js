/********************************************
 百度网盘 开屏 / 信息流 配置洗空脚本
 作用：
 1. /rest/*/pcs/adv?m=config   → 清空所有广告、开屏、活动位
 2. /api/diffall               → 递归删除广告字段
*********************************************/

let body = $response.body;
if (!body) $done({});

try {
  const url = $request.url || "";
  let obj = JSON.parse(body);

  // 通用递归清理：删掉所有 ad / ads / splash / promotion 等字段
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
          // 直接清空这个字段
          if (Array.isArray(v)) node[k] = [];
          else if (v && typeof v === "object") node[k] = {};
          else delete node[k];
          continue;
        }

        deepClean(v, k);
      }
    }
  }

  function isAdKey(key) {
    const k = String(key).toLowerCase();
    const adKeys = [
      "ad","ads","adv","adinfo","ad_info",
      "adlist","ad_list","adslot","adslot_list",
      "advert","advertise","advertise_list","advert_list",
      "banner","banner_list","splash","splash_ad",
      "splashadvert","launchad","launch_ad",
      "open_screen_ad","openscreenad",
      "promotion","promotion_list","activity","activity_list",
      "marketing","feed_ad","feedads","feed_ad_list",
      "tips_ad","operation_info","welfare","coins"
    ];
    return adKeys.some(w =>
      k === w || k.endsWith("_" + w) || k.indexOf(w) !== -1
    );
  }

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

  // 针对 adv 接口做更狠的空配置覆盖
  if (url.includes("/pcs/adv")) {
    const cleaned = {
      errno: 0,
      errmsg: "success",
      request_id: obj.request_id || 0,
      // 常见字段全部给空
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
    body = JSON.stringify(cleaned);
  } else {
    // diffall 等其他接口：递归洗空广告字段
    deepClean(obj, "");
    body = JSON.stringify(obj);
  }

  $done({ body });
} catch (e) {
  // JSON 解析失败，不动原文
  $done({ body });
}
