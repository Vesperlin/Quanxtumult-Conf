/************************************
 百度网盘 去广告 / 去开屏 / 隐藏 VIP 引导 
 1. 处理 pan.baidu.com JSON 接口：
    - 递归清理广告字段、广告列表、开屏配置等
 2. 处理 pan.baidu.com 网页 HTML：
    - 注入一段 CSS，隐藏常见广告位、悬浮气泡、VIP 引导弹窗等
*************************************/

let body = $response.body;
if (!body) { $done({}); }

try {
  const raw = body.trim();

  // 粗分：JSON / HTML（二选一处理）
  if (raw.startsWith("{") || raw.startsWith("[")) {
    // JSON 接口处理
    let obj = JSON.parse(raw);
    cleanJson(obj);
    body = JSON.stringify(obj);
  } else if (/<!doctype html>/i.test(raw) || /<html[\s\S]*?>/i.test(raw)) {
    // HTML 页面处理
    body = injectCssForHtml(raw);
  } else {
    // 不认识的类型，直接放行
  }
} catch (e) {
  // 解析异常则不动原文
}

$done({ body });

/************************************
 JSON 去广告核心逻辑
*************************************/

/**
 * 递归清理对象中的广告字段 / 列表
 */
function cleanJson(root) {
  deepClean(root, "");
}

/**
 * 深度遍历清理
 */
function deepClean(node, parentKey) {
  if (Array.isArray(node)) {
    // 从后往前删
    for (let i = node.length - 1; i >= 0; i--) {
      const item = node[i];
      if (isAdLike(item, parentKey)) {
        node.splice(i, 1);
      } else {
        deepClean(item, parentKey);
      }
    }
  } else if (node && typeof node === "object") {
    for (const key of Object.keys(node)) {
      const value = node[key];

      // key 本身就是广告字段，整体清空 / 删除
      if (isAdKey(key)) {
        if (Array.isArray(value)) {
          node[key] = [];
        } else if (value && typeof value === "object") {
          node[key] = {};
        } else {
          delete node[key];
        }
        continue;
      }

      // 一些百度网盘常见广告位 / 活动字段做针对性处理
      if (isBaiduPanSpecificAdKey(key)) {
        if (Array.isArray(value)) {
          node[key] = [];
        } else if (value && typeof value === "object") {
          node[key] = {};
        } else {
          delete node[key];
        }
        continue;
      }

      deepClean(value, key);
    }
  }
}

/**
 * 通用广告字段命中
 */
function isAdKey(key) {
  const k = String(key).toLowerCase();

  const adKeys = [
    "ad",
    "ads",
    "adv",
    "adinfo",
    "ad_info",
    "adlist",
    "ad_list",
    "adslot",
    "adslot_list",
    "advert",
    "advertise",
    "advertise_list",
    "advert_list",
    "banner",
    "banner_list",
    "activity_list",
    "promotion",
    "promotion_list",
    "marketing",
    "splash",
    "splash_ad",
    "splashadvert",
    "launchad",
    "launch_ad",
    "open_screen_ad",
    "openscreenad",
    "popup",
    "popups",
    "pop_ad",
    "feed_ad",
    "feedads",
    "tips_ad"
  ];

  return adKeys.some(word => {
    return (
      k === word ||
      k.endsWith("_" + word) ||
      k.indexOf(word) !== -1
    );
  });
}

/**
 * 针对百度网盘的一些常见广告 / 活动字段
 * 这里可以后期根据抓包再补充
 */
function isBaiduPanSpecificAdKey(key) {
  const k = String(key).toLowerCase();
  const list = [
    "guide_ad",
    "index_new_user_activity",
    "index_pop_window",
    "float_activity",
    "index_banner_list",
    "index_svip_activity",
    "svip_activity",
    "vip_activity",
    "svip_promotion",
    "tips_info",
    "operation_info",
    "cloudpush_ad",
    "ext_ad_info",
    "feed_ad_list"
  ];
  return list.some(w => k === w || k.indexOf(w) !== -1);
}

/**
 * 判断一个对象是否整体“长得像广告”
 */
function isAdLike(item, parentKey) {
  if (!item || typeof item !== "object") return false;

  const keys = Object.keys(item).map(k => k.toLowerCase());
  const keySet = new Set(keys);

  // 典型广告字段，命中就当广告块
  const adLikeKeys = [
    "adid",
    "ad_id",
    "adslotid",
    "adslot_id",
    "adtype",
    "ad_type",
    "adtitle",
    "ad_title",
    "is_ad",
    "isads",
    "creativeid",
    "creative_id",
    "clickurl",
    "click_url",
    "dest_url",
    "deeplink_url",
    "impress_url",
    "impression_url",
    "track_url",
    "tracking_url"
  ];
  if (adLikeKeys.some(k => keySet.has(k))) return true;

  // 父 key 就是广告相关列表
  if (isAdKey(parentKey) || isBaiduPanSpecificAdKey(parentKey)) return true;

  // url 中含明显广告痕迹
  const urlLike = keys
    .filter(k => k.includes("url") || k.includes("link"))
    .map(k => String(item[k]).toLowerCase());

  if (
    urlLike.some(u =>
      u.includes("ad.") ||
      u.includes("/ad/") ||
      u.includes("advert") ||
      u.includes("log.baidu.com") ||
      u.includes("eclick.baidu.com")
    )
  ) {
    return true;
  }

  return false;
}

/************************************
 HTML 注入 CSS，隐藏广告与 VIP 引导
*************************************/

/**
 * 向 HTML 注入自定义 CSS
 */
function injectCssForHtml(html) {
  const css = buildCss();

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `<style>${css}</style></head>`);
  } else if (/<html[\s\S]*?>/i.test(html)) {
    // 没有 head，就简单插到 html 后面
    return html.replace(/<html[\s\S]*?>/i, match => `${match}<style>${css}</style>`);
  } else {
    // 实在找不到，就直接前置
    return `<style>${css}</style>` + html;
  }
}

/**
 * 自定义 CSS 内容
 * 注意：只隐藏常见广告 / VIP 引导区域，不影响主要功能区域
 */
function buildCss() {
  return `
/* 通用广告类元素（带 ad / advert 的 class、id） */
[class*="ad-"],
[class^="ad_"],
[id^="ad-"],
[id*="ad_"],
[class*="-ad-"],
[class*="_ad_"],
[id*="-ad-"],
[id*="_ad_"],
[class*="advert"],
[id*="advert"],
[class*="banner-ad"],
[id*="banner-ad"] {
  display: none !important;
}

/* 右下角、右侧悬浮推广 */
.float-bar,
.float-bar-right,
.float-bar-container,
.recom-wrapper,
.experience-card,
.side-adv-container {
  display: none !important;
}

/* 首页顶部 / 中部 banner 活动 */
.index-banner,
.index-banner-wrapper,
.banner-wrapper,
.openvip-banner,
.svip-banner,
.svip-banner-wrapper,
.new-user-banner,
.web-banner,
.activity-banner {
  display: none !important;
}

/* 各类引导弹窗、气泡提示 */
.pop-window,
.popup-dialog,
.pop-dialog,
.dialog-ad,
.dialog-activity,
.dialog-svip,
.vip-dialog,
.svip-dialog,
.activity-dialog,
#dialog-privilege,
#dialog-vip,
#dialog-svip {
  display: none !important;
}

/* 顶部导航中的开通 VIP、SVIP 按钮 */
.header-vip-btn,
.header-svip-btn,
.header-svip-entry,
.nav-svip-entry,
.nav-vip-entry,
[class*="svip-entry"],
[class*="vip-entry"] {
  display: none !important;
}

/* 列表上方的“开通会员享极速下载”等推荐 */
.vip-guide,
.svip-guide,
.svip-privilege,
.svip-privilege-tip,
.vip-privilege-tip,
.speedup-tip,
.download-vip-guide,
.list-vip-guide {
  display: none !important;
}

/* 播放器内的开通 VIP 按钮（不影响播放能力） */
.video-vip-tip,
.video-svip-tip,
.video-toolbar-vip,
.player-vip-btn,
.player-svip-btn {
  display: none !important;
}

/* 底部吸附广告条 */
.bottom-ad-bar,
.bottom-banner,
.bottom-fix-banner,
.bottom-float-banner {
  display: none !important;
}

/* 右侧推荐栏中的推广卡片 (尽量保守，只隐藏典型广告类) */
.right-section .card-ad,
.right-section .card-adv,
.right-section [class*="ad-card"] {
  display: none !important;
}
`;
}
