/********************************************
 百度网盘 开屏 H5 广告页 “杀手”
 只处理包含“跳转详情页或第三方应用”的 H5 页面
*********************************************/

let body = $response.body;

if (!body) {
  $done({});
}

try {
  // 只针对 H5 广告：含有这句固定文案才动手
  if (!/跳转详情页或第三方应用/.test(body)) {
    $done({});
    return;
  }

  // 可以再加一些保险关键字（可选）
  if (!/(网盘SVIP|新客专享|立即抢购|点击跳转详情)/.test(body)) {
    $done({});
    return;
  }

  const emptyHtml =
    '<!doctype html>' +
    '<html><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">' +
    '<title></title>' +
    '</head>' +
    '<body style="margin:0;background:#000;"></body></html>';

  $done({ body: emptyHtml });
} catch (e) {
  // 出错就不影响别的页面
  $done({});
}
