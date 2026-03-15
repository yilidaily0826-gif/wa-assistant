/* ============================================================
   商家协作台 — script.js
   数据存储：Google Sheets（当作数据库使用，使用 API Key 只读）
   ============================================================ */

// ──────────────────────────────────────────────
// ⚙️  配置区
// ──────────────────────────────────────────────
const CONFIG = {
  // Google Cloud Console → API 和服务 → 凭据 → API 密钥
  API_KEY: 'AIzaSyBbGn2Rb-hJRAXQcSZ83-F5XxXlOUyhyYI',

  // 你的 Google Spreadsheet ID
  SPREADSHEET_ID: '1rGAEuDHA90iJqZDCarrFoaSzLTt5FOYX0Be3pzt_LrA',

  // Sheet 页名称
  SHEET_NAME: 'Projects',
};

// ──────────────────────────────────────────────
// 全局状态
// ──────────────────────────────────────────────
let gapiReady = false;
let projectsLoaded = false;

// ──────────────────────────────────────────────
// DOM 引用
// ──────────────────────────────────────────────
const cardsRow      = document.getElementById('cards-row');
const loadingRow    = document.getElementById('loading-row');
const syncStatus    = document.getElementById('sync-status');
const refreshBtn    = document.getElementById('refresh-btn');
const newProjectBtn = document.getElementById('new-project-btn');
const modalOverlay  = document.getElementById('modal-overlay');
const modalCancel   = document.getElementById('modal-cancel');
const modalSave     = document.getElementById('modal-save');
const tabs          = Array.from(document.querySelectorAll('.tab'));

// ──────────────────────────────────────────────
// 1. 初始化 Google API Client (gapi) — 只读 API Key
// ──────────────────────────────────────────────
function initGapi() {
  if (gapiReady) return;

  gapi.load('client', async () => {
    await gapi.client.init({
      apiKey: CONFIG.API_KEY,
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    });
    gapiReady = true;
    loadProjects();
  });
}

// ──────────────────────────────────────────────
// 5. 从 Google Sheets 读取项目数据
// ──────────────────────────────────────────────
async function loadProjects(forceReload = false) {
  if (projectsLoaded && !forceReload) return;

  if (loadingRow) loadingRow.style.display = 'flex';
  if (cardsRow) cardsRow.innerHTML = '';
  setSyncStatus(t('loading'));

  try {
    const range = `${CONFIG.SHEET_NAME}!A2:H`;
    const resp = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range,
    });

    const rows = resp.result.values || [];
    const projects = rows.map(rowToProject).filter(Boolean);

    renderCards(projects);
    projectsLoaded = true;
    setSyncStatus(`已同步 · ${projects.length} 个项目 · ${new Date().toLocaleTimeString('zh-CN')}`);
  } catch (err) {
    console.error('读取 Sheets 失败', err);
    setSyncStatus('⚠️ 同步失败，请检查 Spreadsheet ID 和权限');
    renderCards(DEMO_PROJECTS);
  } finally {
    if (loadingRow) loadingRow.style.display = 'none';
  }
}

// Sheets 行 → 项目对象
// 列顺序：A=client, B=date, C=status, D=title, E=tags, F=tool, G=budget, H=due
function rowToProject(row) {
  if (!row[0]) return null;
  return {
    client : row[0] || '',
    date   : row[1] || '',
    status : (row[2] || 'active').toLowerCase(),
    title  : row[3] || '',
    tags   : (row[4] || '').split(',').map(t => t.trim()).filter(Boolean),
    tool   : row[5] || '',
    budget : row[6] || '',
    due    : row[7] || '',
  };
}

// ──────────────────────────────────────────────
// 7. 写入新项目到 Google Sheets
// ──────────────────────────────────────────────
async function appendProject(project) {
  const row = [
    project.client,
    project.date,
    project.status,
    project.title,
    project.tags.join(', '),
    project.tool,
    project.budget,
    project.due,
  ];

  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: CONFIG.SPREADSHEET_ID,
    range: `${CONFIG.SHEET_NAME}!A:H`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [row] },
  });
}

// ──────────────────────────────────────────────
// 8. 渲染项目卡片
// ──────────────────────────────────────────────
const THUMB_THEMES = ['', 'blue', 'purple', 'green', 'orange'];

function renderCards(projects) {
  if (!cardsRow) return;
  cardsRow.innerHTML = '';
  if (!projects.length) {
    cardsRow.innerHTML = `<p class="empty-hint">${t('empty')}</p>`;
    return;
  }

  projects.forEach((p, i) => {
    const theme = THUMB_THEMES[i % THUMB_THEMES.length];
    const tagsHtml = p.tags.map(t => `<span>${t}</span>`).join('');
    const card = document.createElement('article');
    card.className = 'project-card';
    card.dataset.status = p.status;
    card.innerHTML = `
      <div class="card-top">
        <div class="mini-brand">${escHtml(p.client)}<br/><span>${escHtml(p.date)}</span></div>
        <span class="status ${p.status}">${statusLabel(p.status)}</span>
      </div>
      <div class="thumbs ${theme}">
        <div class="thumb left"></div>
        <div class="thumb right"></div>
      </div>
      <h3>${escHtml(p.title)}</h3>
      <div class="tags">${tagsHtml}</div>
      <ul class="meta">
        ${p.tool   ? `<li>${escHtml(p.tool)}</li>`   : ''}
        ${p.budget ? `<li>${escHtml(p.budget)}</li>` : ''}
        ${p.due    ? `<li>Due ${escHtml(p.due)}</li>` : ''}
      </ul>`;
    cardsRow.appendChild(card);
  });

  // 重新绑定 tab 过滤
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) filterCards(activeTab.dataset.filter);
}

function statusLabel(s) {
  return { active: 'Active', negotiating: 'Negotiating', archived: 'Archived' }[s] || s;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ──────────────────────────────────────────────
// 9. Tab 过滤
// ──────────────────────────────────────────────
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    filterCards(tab.dataset.filter);
  });
});

function filterCards(filter) {
  if (!cardsRow) return;

  const cards = Array.from(cardsRow.querySelectorAll('.project-card'));
  cards.forEach(card => {
    card.classList.toggle('hidden', card.dataset.status !== filter);
  });
}

// ──────────────────────────────────────────────
// 10. 新建项目弹窗
// ──────────────────────────────────────────────
newProjectBtn?.addEventListener('click', () => {
  if (modalOverlay) modalOverlay.style.display = 'flex';
});

modalCancel?.addEventListener('click', () => {
  if (modalOverlay) modalOverlay.style.display = 'none';
});

modalOverlay?.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.style.display = 'none';
});

modalSave?.addEventListener('click', async () => {
  const titleEl = document.getElementById('f-title');
  const clientEl = document.getElementById('f-client');
  const statusEl = document.getElementById('f-status');
  const tagsEl = document.getElementById('f-tags');
  const budgetEl = document.getElementById('f-budget');
  const dueEl = document.getElementById('f-due');

  if (!titleEl || !clientEl || !statusEl || !tagsEl || !budgetEl || !dueEl) return;

  const title = titleEl.value.trim();
  const client = clientEl.value.trim();
  if (!title || !client) {
    alert('请填写客户名称和项目标题');
    return;
  }

  const project = {
    client,
    date  : new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }),
    status: statusEl.value,
    title,
    tags  : tagsEl.value.split(',').map(t => t.trim()).filter(Boolean),
    tool  : '',
    budget: budgetEl.value.trim(),
    due   : dueEl.value,
  };

  modalSave.disabled = true;
  modalSave.textContent = '保存中…';

  try {
    await appendProject(project);
    if (modalOverlay) modalOverlay.style.display = 'none';
    clearForm();
    await loadProjects(true);
  } catch (err) {
    console.error('写入失败', err);
    alert('保存失败，请检查 Sheets 权限');
  } finally {
    modalSave.disabled = false;
    modalSave.textContent = '保存到 Sheets';
  }
});

function clearForm() {
  ['f-client','f-title','f-tags','f-budget','f-due'].forEach(id => {
    const field = document.getElementById(id);
    if (field) field.value = '';
  });

  const statusField = document.getElementById('f-status');
  if (statusField) statusField.value = 'active';
}

// ──────────────────────────────────────────────
// 11. 刷新按钮
// ──────────────────────────────────────────────
refreshBtn?.addEventListener('click', () => loadProjects(true));

// ──────────────────────────────────────────────
// 12. 同步状态文字
// ──────────────────────────────────────────────
function setSyncStatus(msg) {
  if (syncStatus) syncStatus.textContent = msg;
}

// ──────────────────────────────────────────────
// 13. 示例数据（Sheets 未配置时降级显示）
// ──────────────────────────────────────────────
const DEMO_PROJECTS = [
  {
    client: 'Baranov', date: '08 Mar, 2025', status: 'active',
    title: 'Healthcare Landing Page Redesign',
    tags: ['Web Design', 'Product Design', 'Branding'],
    tool: 'Figma', budget: '$7,950 - $10,000', due: '25 March, 2025',
  },
  {
    client: 'IT Crowd', date: '08 Mar, 2025', status: 'negotiating',
    title: 'Digital Block Management',
    tags: ['Web Design', 'Product Strategy', 'SaaS'],
    tool: 'Figma', budget: '$7,950 - $10,000', due: '25 March, 2025',
  },
  {
    client: 'Green Deal', date: '24 Feb, 2025', status: 'archived',
    title: 'Seller Growth Analytics Dashboard',
    tags: ['Data', 'Dashboard', 'Growth'],
    tool: 'Internal Tool', budget: '$6,000 - $8,200', due: '18 Feb, 2025',
  },
];

// ──────────────────────────────────────────────
// 14. 启动 + SDK 加载
// ──────────────────────────────────────────────

// gapi 加载完成后调用
window.gapiLoaded = function () { initGapi(); };

// 轮询等待 gapi 就绪
(function waitForGapi() {
  const tryGapi = () => {
    if (typeof gapi !== 'undefined') initGapi();
    else setTimeout(tryGapi, 100);
  };
  tryGapi();
})();

// ──────────────────────────────────────────────
// 15. 语言切换
// ──────────────────────────────────────────────
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

// 页面加载时应用语言（等 DOM 就绪）
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });

  // ── 菜单路由系统 ──
  initMenuRouter();
});

// ──────────────────────────────────────────────
// 16. 菜单路由系统（页面切换）
// ──────────────────────────────────────────────
function initMenuRouter() {
  const menuItems = document.querySelectorAll('.menu-item[data-page]');
  const allMenuItems = document.querySelectorAll('.menu-item');
  const mainPanel = document.getElementById('main-panel');
  const pageDefault = document.getElementById('page-default');
  const pageRateLimit = document.getElementById('page-rate-limit');

  // 默认内容：把 main-panel 里原有的非 page-view 内容移到 page-default
  if (pageDefault && mainPanel) {
    // 将原有的 projects 区域内容保留在 page-default 中
    const existingContent = mainPanel.querySelectorAll(':scope > :not(.page-view):not(#page-default):not(#page-rate-limit)');
    existingContent.forEach(el => pageDefault.appendChild(el));
    pageDefault.style.display = 'block';
  }

  function switchPage(pageName) {
    // 隐藏所有页面
    if (pageDefault) pageDefault.style.display = 'none';
    if (pageRateLimit) pageRateLimit.style.display = 'none';

    // 显示目标页面
    if (pageName === 'rate-limit') {
      if (pageRateLimit) pageRateLimit.style.display = 'block';
    } else {
      if (pageDefault) pageDefault.style.display = 'block';
    }
  }

  // 绑定带 data-page 的菜单项
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      allMenuItems.forEach(m => m.classList.remove('active'));
      item.classList.add('active');
      switchPage(item.dataset.page);
    });
  });

  // 绑定不带 data-page 的菜单项（回到默认页面）
  allMenuItems.forEach(item => {
    if (!item.dataset.page) {
      item.addEventListener('click', () => {
        allMenuItems.forEach(m => m.classList.remove('active'));
        item.classList.add('active');
        switchPage('default');
      });
    }
  });
}
