/* ============================================================
   i18n.js — 多语言支持（中文 / English / Polski）
   ============================================================ */

const LANGS = {
  zh: {
    // 登录页
    'login.title'   : '商家协作台',
    'login.desc'    : '使用公司 Google 账号登录，数据实时同步至 Google Sheets',
    'login.btn'     : '使用 Google 账号登录',
    'login.hint'    : '仅限授权团队成员访问',

    // 顶栏
    'topbar.title'  : '商家协作台',
    'topbar.sub'    : '支持 Google 登录 · 在线同步 · 多人协作',
    'topbar.refresh': '↻ 刷新数据',
    'topbar.new'    : '+ 新建项目',

    // 侧边栏菜单
    'menu.workspace': 'Workspace',
    'menu.dashboard': 'Dashboard',
    'menu.projects' : 'Projects',
    'menu.tasks'    : 'Tasks',
    'menu.clients'  : 'Clients',
    'menu.messages' : 'Messages',
    'menu.leads'    : 'Leads',
    'menu.social'   : 'Social Medias',
    'menu.email'    : 'Email',
    'menu.affiliates': 'Affiliates',
    'menu.jobboard' : 'Job Board',
    'menu.payments' : 'Payments',
    'menu.invoices' : 'Invoices',
    'menu.expenses' : 'Expenses',
    'menu.income'   : 'Income',
    'menu.services' : 'Services',
    'menu.tools'    : '工具箱',
    'menu.ratelimit': '限流助手',
    'upgrade.title' : 'Upgrade Account',
    'upgrade.desc'  : '解锁所有高级功能和无限存储空间。',
    'upgrade.btn'   : '查看套餐',

    // 项目区
    'projects.title': 'Projects',
    'tab.active'    : '⚡ 进行中',
    'tab.negotiating': '◷ 洽谈中',
    'tab.archived'  : '🗂 已归档',
    'loading'       : '正在从 Google Sheets 加载数据…',
    'empty'         : '暂无项目，点击「新建项目」开始',

    // 新建弹窗
    'modal.title'   : '新建项目',
    'modal.client'  : '客户名称',
    'modal.ptitle'  : '项目标题',
    'modal.tags'    : '标签（逗号分隔）',
    'modal.budget'  : '预算范围',
    'modal.due'     : '截止日期',
    'modal.status'  : '状态',
    'modal.cancel'  : '取消',
    'modal.save'    : '保存到 Sheets',
    'modal.saving'  : '保存中…',
    'status.active' : 'Active',
    'status.negotiating': 'Negotiating',
    'status.archived': 'Archived',
  },

  en: {
    'login.title'   : 'Seller Workspace',
    'login.desc'    : 'Sign in with your Google account. Data syncs to Google Sheets in real time.',
    'login.btn'     : 'Sign in with Google',
    'login.hint'    : 'Authorized team members only',

    'topbar.title'  : 'Seller Workspace',
    'topbar.sub'    : 'Google Sign-In · Live Sync · Collaboration',
    'topbar.refresh': '↻ Refresh',
    'topbar.new'    : '+ New Project',

    'menu.workspace': 'Workspace',
    'menu.dashboard': 'Dashboard',
    'menu.projects' : 'Projects',
    'menu.tasks'    : 'Tasks',
    'menu.clients'  : 'Clients',
    'menu.messages' : 'Messages',
    'menu.leads'    : 'Leads',
    'menu.social'   : 'Social Medias',
    'menu.email'    : 'Email',
    'menu.affiliates': 'Affiliates',
    'menu.jobboard' : 'Job Board',
    'menu.payments' : 'Payments',
    'menu.invoices' : 'Invoices',
    'menu.expenses' : 'Expenses',
    'menu.income'   : 'Income',
    'menu.services' : 'Services',
    'menu.tools'    : 'Toolbox',
    'menu.ratelimit': 'Rate Limit Assistant',
    'upgrade.title' : 'Upgrade Account',
    'upgrade.desc'  : 'Gain access to all high powered features and unlimited storage.',
    'upgrade.btn'   : 'View Plans',

    'projects.title': 'Projects',
    'tab.active'    : '⚡ Active',
    'tab.negotiating': '◷ Negotiating',
    'tab.archived'  : '🗂 Archived',
    'loading'       : 'Loading data from Google Sheets…',
    'empty'         : 'No projects yet. Click "New Project" to get started.',

    'modal.title'   : 'New Project',
    'modal.client'  : 'Client Name',
    'modal.ptitle'  : 'Project Title',
    'modal.tags'    : 'Tags (comma separated)',
    'modal.budget'  : 'Budget Range',
    'modal.due'     : 'Due Date',
    'modal.status'  : 'Status',
    'modal.cancel'  : 'Cancel',
    'modal.save'    : 'Save to Sheets',
    'modal.saving'  : 'Saving…',
    'status.active' : 'Active',
    'status.negotiating': 'Negotiating',
    'status.archived': 'Archived',
  },

  pl: {
    'login.title'   : 'Panel Sprzedawcy',
    'login.desc'    : 'Zaloguj się kontem Google. Dane synchronizują się z Google Sheets w czasie rzeczywistym.',
    'login.btn'     : 'Zaloguj się przez Google',
    'login.hint'    : 'Dostęp tylko dla autoryzowanych członków zespołu',

    'topbar.title'  : 'Panel Sprzedawcy',
    'topbar.sub'    : 'Logowanie Google · Synchronizacja · Współpraca',
    'topbar.refresh': '↻ Odśwież',
    'topbar.new'    : '+ Nowy projekt',

    'menu.workspace': 'Przestrzeń robocza',
    'menu.dashboard': 'Panel główny',
    'menu.projects' : 'Projekty',
    'menu.tasks'    : 'Zadania',
    'menu.clients'  : 'Klienci',
    'menu.messages' : 'Wiadomości',
    'menu.leads'    : 'Leady',
    'menu.social'   : 'Media społecznościowe',
    'menu.email'    : 'E-mail',
    'menu.affiliates': 'Partnerzy',
    'menu.jobboard' : 'Oferty pracy',
    'menu.payments' : 'Płatności',
    'menu.invoices' : 'Faktury',
    'menu.expenses' : 'Wydatki',
    'menu.income'   : 'Przychody',
    'menu.services' : 'Usługi',
    'menu.tools'    : 'Narzędzia',
    'menu.ratelimit': 'Asystent limitów',
    'upgrade.title' : 'Ulepsz konto',
    'upgrade.desc'  : 'Uzyskaj dostęp do wszystkich zaawansowanych funkcji i nieograniczonego miejsca.',
    'upgrade.btn'   : 'Zobacz plany',

    'projects.title': 'Projekty',
    'tab.active'    : '⚡ Aktywne',
    'tab.negotiating': '◷ W negocjacji',
    'tab.archived'  : '🗂 Zarchiwizowane',
    'loading'       : 'Ładowanie danych z Google Sheets…',
    'empty'         : 'Brak projektów. Kliknij „Nowy projekt", aby zacząć.',

    'modal.title'   : 'Nowy projekt',
    'modal.client'  : 'Nazwa klienta',
    'modal.ptitle'  : 'Tytuł projektu',
    'modal.tags'    : 'Tagi (oddzielone przecinkami)',
    'modal.budget'  : 'Zakres budżetu',
    'modal.due'     : 'Termin realizacji',
    'modal.status'  : 'Status',
    'modal.cancel'  : 'Anuluj',
    'modal.save'    : 'Zapisz do Sheets',
    'modal.saving'  : 'Zapisywanie…',
    'status.active' : 'Aktywny',
    'status.negotiating': 'W negocjacji',
    'status.archived': 'Zarchiwizowany',
  },
};

// 当前语言，默认读取 localStorage，没有则强制中文
let currentLang = localStorage.getItem('lang') || 'zh';

function detectLang() {
  const nav = navigator.language || '';
  if (nav.startsWith('zh')) return 'zh';
  if (nav.startsWith('pl')) return 'pl';
  return 'en';
}

// 获取翻译文字
function t(key) {
  return (LANGS[currentLang] || LANGS['en'])[key] || key;
}

// 切换语言并重新渲染所有 data-i18n 元素
function setLang(lang) {
  if (!LANGS[lang]) return;
  currentLang = lang;
  localStorage.setItem('lang', lang);
  applyTranslations();
  // 更新语言按钮高亮
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

// 遍历所有带 data-i18n 属性的元素并替换文字
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else if (el.children.length > 0) {
      // 有子元素时只更新文本节点，不覆盖子元素（如 svg）
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          node.textContent = val;
          break;
        }
      }
    } else {
      el.textContent = val;
    }
  });
  // 单独处理 data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}
