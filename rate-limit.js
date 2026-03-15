/* ============================================================
   rate-limit.js — 限流助手核心逻辑
   ============================================================ */
;(function () {
  'use strict';

  /* ── 状态 ── */
  const state = {
    rows: [],          // 从 Excel 解析出的行数据
    results: [],       // AI 判定结果
    currentIdx: 0,     // 当前查看的行索引
    geminiKey: '',     // Gemini API Key
    processing: false,
  };

  /* ── DOM 引用 ── */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ── 工具函数 ── */

  /* ── Excel 解析（SheetJS） ── */
  function parseExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
          // 标准化列名映射
          const rows = json.map((r) => {
            // 尝试匹配各种可能的列名
            const goodsId = r['Goods ID'] || r['goods_id'] || r['GoodsID'] || r['goods id'] || '';
            const skuId = r['Goods Sku ID'] || r['SKU ID'] || r['sku_id'] || r['Goods_Sku_ID'] || '';
            const shopId = r['店铺ID'] || r['shop_id'] || '';
            const shopName = r['店铺名称'] || r['shop_name'] || '';
            const refLink = r['参考链接'] || r['ref_link'] || r['reference_link'] || '';
            return { goodsId: String(goodsId).trim(), skuId: String(skuId).trim(), shopId, shopName, refLink: String(refLink).trim() };
          }).filter(r => r.goodsId && r.refLink); // 过滤空行
          resolve(rows);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  /* ── 平台检测 ── */
  function detectPlatform(url) {
    if (!url) return 'unknown';
    const u = url.toLowerCase();
    if (u.includes('temu.com')) return 'temu';
    if (u.includes('amazon.')) return 'amazon';
    if (u.includes('ebay.')) return 'ebay';
    if (u.includes('empik.')) return 'empik';
    if (u.includes('allegro.')) return 'allegro';
    if (u.includes('aliexpress.')) return 'aliexpress';
    if (u.includes('shopee.')) return 'shopee';
    if (u.includes('lazada.')) return 'lazada';
    if (u.includes('wish.')) return 'wish';
    if (u.includes('cdiscount.')) return 'cdiscount';
    return 'other';
  }

  /* 从 URL 推断站点 */
  function detectSite(url) {
    if (!url) return '';
    const m = url.match(/\.([a-z]{2,3})(?:\/|$)/i);
    if (m) {
      const tld = m[1].toLowerCase();
      const map = { com: 'US', pl: 'PL', de: 'DE', fr: 'FR', es: 'ES', it: 'IT', uk: 'UK', jp: 'JP', ca: 'CA', au: 'AU', br: 'BR', mx: 'MX', nl: 'NL', se: 'SE' };
      return map[tld] || tld.toUpperCase();
    }
    return '';
  }
  /* ── CORS 代理抓取 ── */
  const CORS_PROXIES = [
    (url) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
    (url) => 'https://corsproxy.io/?' + encodeURIComponent(url),
  ];

  async function corsFetch(url) {
    for (const proxy of CORS_PROXIES) {
      try {
        const resp = await fetch(proxy(url), { signal: AbortSignal.timeout(15000) });
        if (resp.ok) return await resp.text();
      } catch (_) { /* try next */ }
    }
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (resp.ok) return await resp.text();
    } catch (_) {}
    return null;
  }

  /* ── TEMU 商品抓取 ── */
  async function scrapeTemu(goodsId) {
    const url = 'https://www.temu.com/goods-' + goodsId + '.html';
    const html = await corsFetch(url);
    const info = { title: '', price: '', images: [], attrs: {}, url: url, platform: 'temu' };
    if (!html) return info;
    try {
      // 尝试从 rawData / SSR JSON 提取
      const jsonMatch = html.match(/window\.__rawData__\s*=\s*(\{[\s\S]*?\});/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        const goods = data.store?.goods || data.goods || {};
        info.title = goods.goodsName || goods.goods_name || '';
        info.price = goods.minNormalPrice || goods.min_normal_price || '';
        if (goods.topGallery) info.images = goods.topGallery.map(g => g.url || g);
        if (goods.skc) {
          (goods.skc || []).forEach(s => {
            (s.specList || []).forEach(sp => { info.attrs[sp.specName || sp.spec_name] = sp.specValue || sp.spec_value; });
          });
        }
      }
      // fallback: 从 meta / og 标签提取
      if (!info.title) {
        const titleM = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
        if (titleM) info.title = titleM[1];
      }
      if (!info.images.length) {
        const imgM = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (imgM) info.images = [imgM[1]];
      }
      if (!info.price) {
        const priceM = html.match(/<meta\s+property="product:price:amount"\s+content="([^"]+)"/i);
        if (priceM) info.price = priceM[1];
      }
    } catch (_) {}
    return info;
  }

  /* ── 竞品抓取（通用） ── */
  async function scrapeCompetitor(url) {
    const platform = detectPlatform(url);
    const info = { title: '', price: '', images: [], attrs: {}, url: url, platform: platform };
    const html = await corsFetch(url);
    if (!html) return info;
    try {
      // og:title
      const titleM = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
      if (titleM) info.title = titleM[1];
      else {
        const t2 = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (t2) info.title = t2[1].trim();
      }
      // og:image
      const imgM = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/gi);
      if (imgM) {
        imgM.forEach(m => {
          const u = m.match(/content="([^"]+)"/i);
          if (u) info.images.push(u[1]);
        });
      }
      // price
      const priceM = html.match(/<meta\s+property="product:price:amount"\s+content="([^"]+)"/i)
                  || html.match(/"price"\s*:\s*"?([0-9.,]+)"?/i);
      if (priceM) info.price = priceM[1];
      // Amazon 特殊处理
      if (platform === 'amazon') {
        const apM = html.match(/id="priceblock_ourprice"[^>]*>([^<]+)/i)
                 || html.match(/class="a-price-whole"[^>]*>([^<]+)/i);
        if (apM) info.price = apM[1].trim();
      }
    } catch (_) {}
    return info;
  }

  /* ── Gemini AI 对比 ── */
  async function geminiCompare(leftInfo, rightInfo, apiKey) {
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

    // 构建 prompt
    const prompt = buildComparePrompt(leftInfo, rightInfo);

    // 构建请求体（纯文本对比，如果有图片 URL 也传入）
    const parts = [{ text: prompt }];

    // 尝试内联图片（最多各传 1 张主图）
    for (const info of [leftInfo, rightInfo]) {
      if (info.images && info.images[0]) {
        try {
          const imgData = await fetchImageAsBase64(info.images[0]);
          if (imgData) {
            parts.push({ inlineData: { mimeType: imgData.mime, data: imgData.base64 } });
          }
        } catch (_) {}
      }
    }

    const body = {
      contents: [{ parts: parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
    };

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error('Gemini API error: ' + resp.status + ' ' + err);
    }
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseGeminiResult(text);
  }

  function buildComparePrompt(left, right) {
    return [
      '你是一个电商商品同款判定专家。请严格按照以下规则判定两个商品是否为同款。',
      '',
      '核心执行原则：',
      '- 独立性原则：直接输出结果，无结束语。',
      '- 数据准则：销量估算保持保守，数量计算采用修正方法确保准确。',
      '- 文本格式：严禁使用粗体文本。',
      '- 价格监控：若右I的价格高于左I（或单价折算更高），必须在结论下方第一时间输出 [价格提醒]。',
      '',
      '标准输出格式：',
      '情形一：结论为不一致',
      '结论：不一致',
      '[价格提醒]：右I 的价格（金额）高于左I 的价格（金额）。（仅在触发时显示）',
      '[选择不同点]：从以下项中选择（材质、外观/版型、尺寸/容积/重量/尺码、销售数量、套装内容、图案/印花、品类、适用型号、功能/功效/适用人群、性能参数、其他）',
      '[需要审核人员重点关注信息]：从以下项中选择（SKU规格/尺寸、商品标题、类目、属性、主图、轮播图）',
      '[差异描述文本]：',
      'a. 图片差异：描述主图、轮播图在视觉展示上的具体不同。',
      'b. 文本差异：描述商品标题、SKU规格、属性参数等文字描述的不符。',
      '',
      '情形二：结论为完全一致',
      '结果：完全一致',
      '',
      '--- 左I（TEMU 当前商品）---',
      '标题：' + (left.title || '无法获取'),
      '价格：' + (left.price || '无法获取'),
      '属性：' + JSON.stringify(left.attrs || {}),
      '主图URL：' + (left.images?.[0] || '无'),
      '轮播图URL：' + (left.images?.slice(1).join(', ') || '无'),
      '',
      '--- 右I（竞品商品）---',
      '平台：' + (right.platform || 'unknown'),
      '标题：' + (right.title || '无法获取'),
      '价格：' + (right.price || '无法获取'),
      '属性：' + JSON.stringify(right.attrs || {}),
      '主图URL：' + (right.images?.[0] || '无'),
      '轮播图URL：' + (right.images?.slice(1).join(', ') || '无'),
      '',
      '请严格按照上述标准输出格式回复，不要添加任何额外内容。',
    ].join('\n');
  }

  /* 抓取图片转 base64 */
  async function fetchImageAsBase64(imgUrl) {
    try {
      const proxyUrl = CORS_PROXIES[0](imgUrl);
      const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) return null;
      const blob = await resp.blob();
      const mime = blob.type || 'image/jpeg';
      const buf = await blob.arrayBuffer();
      const base64 = btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ''));
      return { mime, base64 };
    } catch (_) { return null; }
  }

  /* 解析 Gemini 返回文本 */
  function parseGeminiResult(text) {
    const result = {
      isSame: false,
      conclusion: '',
      priceAlert: '',
      diffPoints: '',
      focusInfo: '',
      diffDesc: '',
      raw: text,
    };
    if (/完全一致/.test(text)) {
      result.isSame = true;
      result.conclusion = '完全一致';
    } else {
      result.isSame = false;
      result.conclusion = '不一致';
    }
    // 提取各字段
    const priceM = text.match(/\[价格提醒\][：:]\s*(.+)/);
    if (priceM) result.priceAlert = priceM[1].trim();

    const diffM = text.match(/\[选择不同点\][：:]\s*(.+)/);
    if (diffM) result.diffPoints = diffM[1].trim();

    const focusM = text.match(/\[需要审核人员重点关注信息\][：:]\s*(.+)/);
    if (focusM) result.focusInfo = focusM[1].trim();

    // 差异描述（可能多行）
    const descM = text.match(/\[差异描述文本\][：:]\s*([\s\S]*?)$/);
    if (descM) result.diffDesc = descM[1].trim();

    return result;
  }

  /* ── 渲染对比视图 ── */
  function renderCompare(leftInfo, rightInfo) {
    // 左侧图片
    const leftImgs = $('#rl-left-images');
    leftImgs.innerHTML = leftInfo.images.length
      ? leftInfo.images.map((u, i) => '<img src="' + u + '" alt="左i图' + (i+1) + '" loading="lazy" />').join('')
      : '<div class="rl-img-placeholder">暂无图片</div>';

    // 左侧信息
    $('#rl-left-info').innerHTML = [
      '<div class="rl-title">' + escHtml(leftInfo.title || '标题获取中...') + '</div>',
      '<div class="rl-price">价格：' + escHtml(leftInfo.price || '-') + '</div>',
      '<div class="rl-attr">平台：<span>TEMU</span></div>',
      Object.entries(leftInfo.attrs || {}).map(([k,v]) => '<div class="rl-attr">' + escHtml(k) + '：<span>' + escHtml(v) + '</span></div>').join(''),
    ].join('');

    // 右侧图片
    const rightImgs = $('#rl-right-images');
    rightImgs.innerHTML = rightInfo.images.length
      ? rightInfo.images.map((u, i) => '<img src="' + u + '" alt="右i图' + (i+1) + '" loading="lazy" />').join('')
      : '<div class="rl-img-placeholder">暂无图片</div>';

    // 右侧信息
    $('#rl-right-info').innerHTML = [
      '<div class="rl-title">' + escHtml(rightInfo.title || '标题获取中...') + '</div>',
      '<div class="rl-price">价格：' + escHtml(rightInfo.price || '-') + '</div>',
      '<div class="rl-attr">平台：<span>' + escHtml(rightInfo.platform || '-') + '</span></div>',
      Object.entries(rightInfo.attrs || {}).map(([k,v]) => '<div class="rl-attr">' + escHtml(k) + '：<span>' + escHtml(v) + '</span></div>').join(''),
    ].join('');
  }

  /* ── 渲染 AI 结果 ── */
  function renderResult(result) {
    const body = $('#rl-result-body');
    if (!result) {
      body.innerHTML = '<p class="rl-placeholder">等待 AI 判定...</p>';
      return;
    }
    let html = '';
    html += '<div class="rl-conclusion ' + (result.isSame ? 'same' : 'diff') + '">结论：' + escHtml(result.conclusion) + '</div>';
    if (result.priceAlert) {
      html += '<div class="rl-price-alert">[价格提醒] ' + escHtml(result.priceAlert) + '</div>';
    }
    if (result.diffPoints) {
      html += '<div class="rl-diff-item">[不同点] <span>' + escHtml(result.diffPoints) + '</span></div>';
    }
    if (result.focusInfo) {
      html += '<div class="rl-diff-item">[重点关注] <span>' + escHtml(result.focusInfo) + '</span></div>';
    }
    if (result.diffDesc) {
      html += '<div class="rl-diff-item" style="white-space:pre-wrap;margin-top:8px">' + escHtml(result.diffDesc) + '</div>';
    }
    body.innerHTML = html;
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /* ── 导航 ── */
  function showItem(idx) {
    if (idx < 0 || idx >= state.rows.length) return;
    state.currentIdx = idx;
    const row = state.rows[idx];
    const result = state.results[idx];

    // 更新进度文字
    $('#rl-progress-text').textContent = (idx + 1) + ' / ' + state.rows.length;

    // 渲染对比
    if (row._leftInfo && row._rightInfo) {
      renderCompare(row._leftInfo, row._rightInfo);
    }
    renderResult(result || null);

    // 按钮状态
    $('#rl-prev-btn').disabled = idx === 0;
    $('#rl-next-btn').disabled = idx === state.rows.length - 1;
    $('#rl-actions').style.display = 'flex';
  }

  /* ── 导出 OMS 解绑模板 ── */
  function exportXlsx() {
    // 构建数据行（按黑白名单解绑.xlsx 格式）
    const header = ['左 i id Sku id', '右 i 链接', '竞品平台', '是否同款（Y/N）', '具体原因', '重点关注信息', '说明', '站点', '申诉场景'];
    const dataRows = state.rows.map((row, i) => {
      const r = state.results[i] || {};
      return [
        row.skuId,
        row.refLink,
        detectPlatform(row.refLink),
        r.isSame ? 'Y' : 'N',
        r.diffPoints || '',
        r.focusInfo || '',
        r.diffDesc || r.raw || '',
        detectSite(row.refLink),
        '限流',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, '黑白名单解绑_' + new Date().toISOString().slice(0,10) + '.xlsx');
  }

  /* ── 渲染汇总表格 ── */
  function renderSummary() {
    const sameCount = state.results.filter(r => r && r.isSame).length;
    const diffCount = state.results.filter(r => r && !r.isSame).length;
    const total = state.results.length;

    $('#rl-stat-same').textContent = '一致: ' + sameCount;
    $('#rl-stat-diff').textContent = '不一致: ' + diffCount;
    $('#rl-stat-total').textContent = '总计: ' + total;

    const tbody = $('#rl-result-tbody');
    tbody.innerHTML = state.rows.map((row, i) => {
      const r = state.results[i] || {};
      const cls = r.isSame ? 'td-same' : 'td-diff';
      return '<tr>' +
        '<td>' + (i+1) + '</td>' +
        '<td>' + escHtml(row.skuId) + '</td>' +
        '<td><a href="' + escHtml(row.refLink) + '" target="_blank">链接</a></td>' +
        '<td>' + escHtml(detectPlatform(row.refLink)) + '</td>' +
        '<td class="' + cls + '">' + (r.isSame ? 'Y' : 'N') + '</td>' +
        '<td>' + escHtml(r.diffPoints || '-') + '</td>' +
        '<td>' + escHtml(detectSite(row.refLink)) + '</td>' +
        '</tr>';
    }).join('');

    $('#rl-summary').style.display = 'block';
  }

  /* ── 批量处理主流程 ── */
  async function startBatchCheck() {
    if (state.processing) return;
    state.processing = true;
    state.results = [];
    state.currentIdx = 0;

    const apiKey = $('#rl-gemini-key').value.trim();
    if (!apiKey) { alert('请输入 Gemini API Key'); state.processing = false; return; }
    state.geminiKey = apiKey;

    // 显示进度和对比视图
    $('#rl-progress-bar').style.display = 'block';
    $('#rl-compare-view').style.display = 'block';
    $('#rl-summary').style.display = 'none';
    $('#rl-start-btn').disabled = true;
    $('#rl-start-btn').textContent = '⏳ 处理中...';

    for (let i = 0; i < state.rows.length; i++) {
      state.currentIdx = i;
      const row = state.rows[i];

      // 更新进度
      const pct = Math.round(((i + 1) / state.rows.length) * 100);
      $('#rl-progress-text').textContent = (i + 1) + ' / ' + state.rows.length;
      $('#rl-progress-pct').textContent = pct + '%';
      $('#rl-progress-fill').style.width = pct + '%';

      // 抓取左i（TEMU）
      renderResult(null);
      row._leftInfo = await scrapeTemu(row.goodsId);

      // 抓取右i（竞品）
      row._rightInfo = await scrapeCompetitor(row.refLink);

      // 渲染对比
      renderCompare(row._leftInfo, row._rightInfo);

      // AI 对比
      try {
        const result = await geminiCompare(row._leftInfo, row._rightInfo, apiKey);
        state.results[i] = result;
        renderResult(result);
      } catch (err) {
        state.results[i] = {
          isSame: false,
          conclusion: '判定失败',
          priceAlert: '',
          diffPoints: '其他',
          focusInfo: '',
          diffDesc: 'AI 判定出错: ' + err.message,
          raw: err.message,
        };
        renderResult(state.results[i]);
      }

      // 短暂延迟避免 API 限流
      if (i < state.rows.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // 完成
    state.processing = false;
    $('#rl-start-btn').textContent = '✅ 检查完成';
    renderSummary();
    showItem(0);
  }

  /* ── 事件绑定 ── */
  function bindEvents() {
    // 文件上传
    $('#rl-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      $('#rl-file-name').textContent = file.name;
      try {
        state.rows = await parseExcel(file);
        $('#rl-start-btn').disabled = false;
        $('#rl-file-name').textContent = file.name + ' (' + state.rows.length + ' 条数据)';
      } catch (err) {
        alert('Excel 解析失败: ' + err.message);
        $('#rl-file-name').textContent = '解析失败';
      }
    });

    // 开始检查
    $('#rl-start-btn').addEventListener('click', () => startBatchCheck());

    // 导航
    $('#rl-prev-btn').addEventListener('click', () => showItem(state.currentIdx - 1));
    $('#rl-next-btn').addEventListener('click', () => showItem(state.currentIdx + 1));

    // 确认结果
    $('#rl-confirm-btn').addEventListener('click', () => {
      if (state.currentIdx < state.rows.length - 1) {
        showItem(state.currentIdx + 1);
      }
    });

    // 手动修改
    $('#rl-edit-btn').addEventListener('click', () => {
      const r = state.results[state.currentIdx];
      if (r) {
        $('#rl-edit-same').value = r.isSame ? 'Y' : 'N';
        $('#rl-edit-reason').value = r.diffPoints || '';
        $('#rl-edit-focus').value = r.focusInfo || '';
        $('#rl-edit-desc').value = r.diffDesc || '';
      }
      $('#rl-edit-modal').style.display = 'flex';
    });

    // 保存修改
    $('#rl-edit-save').addEventListener('click', () => {
      const idx = state.currentIdx;
      if (!state.results[idx]) state.results[idx] = {};
      const r = state.results[idx];
      r.isSame = $('#rl-edit-same').value === 'Y';
      r.conclusion = r.isSame ? '完全一致' : '不一致';
      r.diffPoints = $('#rl-edit-reason').value;
      r.focusInfo = $('#rl-edit-focus').value;
      r.diffDesc = $('#rl-edit-desc').value;
      renderResult(r);
      $('#rl-edit-modal').style.display = 'none';
    });

    // 取消修改
    $('#rl-edit-cancel').addEventListener('click', () => {
      $('#rl-edit-modal').style.display = 'none';
    });

    // 导出
    $('#rl-export-btn').addEventListener('click', () => exportXlsx());

    // Gemini Key 输入时启用按钮
    $('#rl-gemini-key').addEventListener('input', () => {
      const hasKey = $('#rl-gemini-key').value.trim().length > 0;
      const hasFile = state.rows.length > 0;
      $('#rl-start-btn').disabled = !(hasKey && hasFile);
    });
  }

  /* ── 初始化 ── */
  function init() {
    // 等 DOM 就绪
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { bindEvents(); });
    } else {
      bindEvents();
    }
  }

  init();

})();
