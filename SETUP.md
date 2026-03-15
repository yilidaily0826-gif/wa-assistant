# 商家协作台 — 配置指南

## 快速开始（3 步完成配置）

---

### 第一步：Google Cloud 项目配置

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)
2. 新建项目（或选择已有项目）
3. 左侧菜单 → **API 和服务** → **启用 API 和服务**
4. 搜索并启用以下两个 API：
   - `Google Sheets API`
   - `Google Drive API`（可选，用于附件）

---

### 第二步：创建凭据

#### 2a. 创建 OAuth 2.0 客户端 ID

1. **API 和服务** → **凭据** → **创建凭据** → **OAuth 客户端 ID**
2. 应用类型选 **Web 应用**
3. 已获授权的 JavaScript 来源，添加：
   - `http://localhost:5173`（本地开发）
   - 你的线上域名（如有）
4. 复制生成的 **客户端 ID**

#### 2b. 创建 API 密钥

1. **凭据** → **创建凭据** → **API 密钥**
2. 建议点击「限制密钥」→ 限制为 `Google Sheets API`
3. 复制生成的 **API 密钥**

---

### 第三步：创建 Google Spreadsheet

1. 打开 [Google Sheets](https://sheets.google.com/) 新建表格
2. 将第一个 Sheet 页重命名为 `Projects`
3. 在第一行添加表头（A1 开始）：

   | A | B | C | D | E | F | G | H |
   |---|---|---|---|---|---|---|---|
   | client | date | status | title | tags | tool | budget | due |

4. 从 URL 复制 Spreadsheet ID：
   ```
   https://docs.google.com/spreadsheets/d/【这里就是 ID】/edit
   ```
5. 点击右上角「共享」→ 将表格共享给所有需要访问的团队成员（编辑者权限）

---

### 第四步：填入配置

打开 `script.js`，找到顶部 `CONFIG` 对象，填入你的值：

```js
const CONFIG = {
  CLIENT_ID      : '你的客户端ID.apps.googleusercontent.com',
  API_KEY        : '你的API密钥',
  SPREADSHEET_ID : '你的SpreadsheetID',
  SHEET_NAME     : 'Projects',
  ALLOWED_DOMAIN : 'yourcompany.com',  // 留空则不限制邮箱域名
};
```

---

### 本地运行

```bash
npm start
# 访问 http://localhost:5173
```

---

## 权限控制说明

- 成员管理：在 Google Spreadsheet 里新建一个 `Members` 页，A1 填表头 `email`，A2 开始每行填一个允许登录的邮箱
- 新增/移除成员：直接在 Sheets 里加减邮箱，实时生效，无需改代码
- Members Sheet 读取失败时（如未创建），系统会跳过校验允许所有人登录，建议配置完成后测试
- Google Sheets 共享设置：只共享给团队成员，数据层面双重保护

### Members Sheet 格式示例

| A |
|---|
| email |
| alice@gmail.com |
| bob@gmail.com |
| charlie@gmail.com |

## 数据说明

所有数据存储在你的 Google Spreadsheet 中，不经过任何第三方服务器。
