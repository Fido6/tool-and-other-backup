// ==================================
// 🚀 Wispbyte 多账号自动重启 (Cookie自动更新版)
// 重启指定账号的所有服务器
// curl "https://xxx.workers.dev/restart?key=你的密钥&account=user@gmail.com"
// 重启指定服务器
// curl "https://xxx.workers.dev/restart?key=你的密钥&account=user@gmail.com&server=fa8fc9d0"
// 重启所有账号的所有服务器
// curl "https://xxx.workers.dev/restart-all?key=你的密钥"
// WISPBYTE_KV=KV空间名字
// AUTH_KEY=前端密钥
// TELEGRAM_BOT_TOKEN=TG TOKEN
// TELEGRAM_CHAT_ID=TG ID
// ==================================

const BASE_URL = 'https://wispbyte.com';
const ACCOUNTS_KEY = 'wispbyte_accounts';

// ========== 前端 HTML ==========
const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wispbyte 多账号管理</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #fff;
      padding: 20px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header { text-align: center; padding: 30px 0; }
    .header h1 {
      font-size: 2rem;
      background: linear-gradient(90deg, #00d2ff, #3a7bd5);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }
    .header p { color: #888; }
    
    .card {
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .card-title {
      font-size: 1.1rem;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .auth-section { display: flex; gap: 10px; margin-bottom: 20px; }
    .auth-section input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      background: rgba(0,0,0,0.3);
      color: #fff;
      font-size: 14px;
    }
    .auth-section input:focus { outline: none; border-color: #3a7bd5; }
    
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s;
    }
    .btn-primary { background: linear-gradient(90deg, #00d2ff, #3a7bd5); color: #fff; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(58,123,213,0.4); }
    .btn-danger { background: #e74c3c; color: #fff; }
    .btn-danger:hover { background: #c0392b; }
    .btn-success { background: #27ae60; color: #fff; }
    .btn-success:hover { background: #219a52; }
    .btn-sm { padding: 8px 16px; font-size: 12px; }
    
    textarea {
      width: 100%;
      padding: 16px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      background: rgba(0,0,0,0.3);
      color: #fff;
      font-size: 14px;
      font-family: 'Monaco', 'Consolas', monospace;
      resize: vertical;
      min-height: 150px;
    }
    textarea:focus { outline: none; border-color: #3a7bd5; }
    textarea::placeholder { color: #666; }
    
    .hint { color: #888; font-size: 12px; margin-top: 8px; }
    .actions { display: flex; gap: 10px; margin-top: 16px; }
    
    .account-list { margin-top: 20px; }
    .account-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      margin-bottom: 10px;
      border-left: 3px solid #3a7bd5;
    }
    .account-info { flex: 1; }
    .account-name { font-weight: 500; margin-bottom: 4px; }
    .account-meta { font-size: 12px; color: #888; }
    .account-servers { font-size: 12px; color: #27ae60; margin-top: 4px; }
    .account-actions { display: flex; gap: 8px; }
    
    .status-bar {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      display: none;
      z-index: 1000;
    }
    .status-bar.success { background: #27ae60; display: block; }
    .status-bar.error { background: #e74c3c; display: block; }
    .status-bar.loading { background: #3a7bd5; display: block; }
    
    .empty-state { text-align: center; padding: 40px; color: #666; }
    
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
    .stat-item { background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; text-align: center; }
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      background: linear-gradient(90deg, #00d2ff, #3a7bd5);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .stat-label { font-size: 12px; color: #888; margin-top: 4px; }
    
    .cookie-status { font-size: 11px; color: #f39c12; margin-top: 2px; }
    
    @media (max-width: 600px) {
      .stats { grid-template-columns: 1fr; }
      .auth-section { flex-direction: column; }
      .account-item { flex-direction: column; align-items: flex-start; gap: 12px; }
      .account-actions { width: 100%; }
      .account-actions .btn { flex: 1; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Wispbyte 多账号管理</h1>
      <p>自动重启服务器 · Cookie自动续期</p>
    </div>
    
    <div class="card">
      <div class="card-title">🔐 API 密钥</div>
      <div class="auth-section">
        <input type="password" id="authKey" placeholder="输入 AUTH_KEY 密钥...">
        <button class="btn btn-primary" onclick="loadAccounts()">连接</button>
      </div>
    </div>
    
    <div class="stats" id="stats" style="display: none;">
      <div class="stat-item">
        <div class="stat-value" id="statAccounts">0</div>
        <div class="stat-label">账号数量</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" id="statServers">0</div>
        <div class="stat-label">服务器数量</div>
      </div>
      <div class="stat-item">
        <div class="stat-value" id="statStatus">-</div>
        <div class="stat-label">状态</div>
      </div>
    </div>
    
    <div class="card" id="addSection" style="display: none;">
      <div class="card-title">➕ 添加账号</div>
      <textarea id="accountInput" placeholder="格式：账号-----Cookie&#10;&#10;示例：&#10;user1@gmail.com-----connect.sid=s%3Axxxxxx...&#10;user2@gmail.com-----connect.sid=s%3Ayyyyyy...&#10;&#10;每行一个账号，可批量添加"></textarea>
      <div class="hint">💡 每行一个账号，格式：邮箱-----Cookie（5个减号分隔）· Cookie会自动续期</div>
      <div class="actions">
        <button class="btn btn-primary" onclick="addAccounts()">📥 添加账号</button>
        <button class="btn btn-success" onclick="restartAll()">🔄 重启全部</button>
      </div>
    </div>
    
    <div class="card" id="listSection" style="display: none;">
      <div class="card-title">📋 账号列表</div>
      <div class="account-list" id="accountList">
        <div class="empty-state">暂无账号</div>
      </div>
    </div>
  </div>
  
  <div class="status-bar" id="statusBar"></div>
  
  <script>
    const API_BASE = window.location.origin;
    let authKey = '';
    
    function showStatus(msg, type = 'loading') {
      const bar = document.getElementById('statusBar');
      bar.textContent = msg;
      bar.className = 'status-bar ' + type;
      if (type !== 'loading') setTimeout(() => { bar.className = 'status-bar'; }, 3000);
    }
    
    async function api(path, options = {}) {
      const url = API_BASE + path + (path.includes('?') ? '&' : '?') + 'key=' + authKey;
      const res = await fetch(url, options);
      return res.json();
    }
    
    async function loadAccounts() {
      authKey = document.getElementById('authKey').value;
      if (!authKey) { showStatus('请输入密钥', 'error'); return; }
      
      showStatus('加载中...');
      
      try {
        const data = await api('/accounts');
        if (!data.success && data.message === 'Unauthorized') {
          showStatus('密钥错误', 'error');
          return;
        }
        
        document.getElementById('stats').style.display = 'grid';
        document.getElementById('addSection').style.display = 'block';
        document.getElementById('listSection').style.display = 'block';
        
        renderAccounts(data.accounts || []);
        updateStats(data.accounts || []);
        showStatus('加载成功', 'success');
        loadServers();
      } catch (e) {
        showStatus('加载失败: ' + e.message, 'error');
      }
    }
    
    async function loadServers() {
      try {
        const data = await api('/servers');
        if (data.success && data.results) {
          let totalServers = 0;
          data.results.forEach(r => {
            totalServers += r.count || 0;
            const el = document.querySelector('[data-account="' + r.account + '"] .account-servers');
            if (el) el.textContent = '服务器: ' + (r.servers.join(', ') || '无');
          });
          document.getElementById('statServers').textContent = totalServers;
        }
      } catch (e) { console.error('加载服务器失败', e); }
    }
    
    function updateStats(accounts) {
      document.getElementById('statAccounts').textContent = accounts.length;
      document.getElementById('statStatus').textContent = '正常';
    }
    
    function renderAccounts(accounts) {
      const list = document.getElementById('accountList');
      if (accounts.length === 0) {
        list.innerHTML = '<div class="empty-state">暂无账号，请添加</div>';
        return;
      }
      
      list.innerHTML = accounts.map(a => {
        const cookieAge = a.cookieUpdatedAt ? 
          Math.floor((Date.now() - new Date(a.cookieUpdatedAt).getTime()) / 1000 / 60) : null;
        const cookieStatus = cookieAge !== null ? 
          (cookieAge < 60 ? '🟢 Cookie刚更新' : cookieAge < 1440 ? '🟡 ' + Math.floor(cookieAge/60) + '小时前更新' : '🔴 超过1天未更新') : '';
        
        return \`
          <div class="account-item" data-account="\${a.name}">
            <div class="account-info">
              <div class="account-name">📧 \${a.name}</div>
              <div class="account-meta">Cookie: \${a.cookieLength} 字符 · 添加于 \${new Date(a.addedAt).toLocaleString('zh-CN')}</div>
              <div class="cookie-status">\${cookieStatus}</div>
              <div class="account-servers">服务器: 加载中...</div>
            </div>
            <div class="account-actions">
              <button class="btn btn-success btn-sm" onclick="restartAccount('\${a.name}')">🔄 重启</button>
              <button class="btn btn-danger btn-sm" onclick="removeAccount('\${a.name}')">🗑️ 删除</button>
            </div>
          </div>
        \`;
      }).join('');
    }
    
    async function addAccounts() {
      const input = document.getElementById('accountInput').value.trim();
      if (!input) { showStatus('请输入账号信息', 'error'); return; }
      
      const lines = input.split('\\n').filter(l => l.trim());
      const accounts = [];
      
      for (const line of lines) {
        const parts = line.split('-----');
        if (parts.length >= 2) {
          accounts.push({ name: parts[0].trim(), cookie: parts.slice(1).join('-----').trim() });
        }
      }
      
      if (accounts.length === 0) {
        showStatus('格式错误，请使用：账号-----Cookie', 'error');
        return;
      }
      
      showStatus('添加中...');
      
      try {
        const data = await api('/accounts/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accounts })
        });
        
        if (data.success) {
          showStatus('添加成功: ' + data.imported + ' 个', 'success');
          document.getElementById('accountInput').value = '';
          loadAccounts();
        } else {
          showStatus('添加失败: ' + data.message, 'error');
        }
      } catch (e) { showStatus('添加失败: ' + e.message, 'error'); }
    }
    
    async function removeAccount(name) {
      if (!confirm('确定删除账号 "' + name + '" 吗？')) return;
      showStatus('删除中...');
      
      try {
        const data = await api('/accounts/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        
        if (data.success) { showStatus('删除成功', 'success'); loadAccounts(); }
        else { showStatus('删除失败: ' + data.message, 'error'); }
      } catch (e) { showStatus('删除失败: ' + e.message, 'error'); }
    }
    
    async function restartAccount(name) {
      showStatus('重启中...');
      try {
        const data = await api('/restart?account=' + encodeURIComponent(name));
        if (data.success) showStatus('重启成功: ' + data.success + ' 个服务器', 'success');
        else showStatus('重启失败: ' + (data.error || data.message), 'error');
      } catch (e) { showStatus('重启失败: ' + e.message, 'error'); }
    }
    
    async function restartAll() {
      if (!confirm('确定重启所有账号的服务器吗？')) return;
      showStatus('批量重启中...');
      
      try {
        const data = await api('/restart-all');
        if (data.success) {
          const msg = '完成: ' + data.summary.totalSuccess + ' 成功, ' + data.summary.totalFailed + ' 失败';
          showStatus(msg, data.summary.totalFailed === 0 ? 'success' : 'error');
        } else { showStatus('重启失败: ' + data.message, 'error'); }
      } catch (e) { showStatus('重启失败: ' + e.message, 'error'); }
    }
    
    const savedKey = localStorage.getItem('wispbyte_auth_key');
    if (savedKey) document.getElementById('authKey').value = savedKey;
    document.getElementById('authKey').addEventListener('change', function() {
      localStorage.setItem('wispbyte_auth_key', this.value);
    });
  </script>
</body>
</html>`;

// ========== 工具函数 ==========
function log(level, ...args) {
  const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const icon = { INFO: '✅', WARN: '⚠️', ERROR: '❌', DEBUG: '🔍' }[level] || 'ℹ️';
  console.log(`[${time}] ${icon}`, ...args);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function htmlResponse(html) {
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// ========== 账号管理 (KV) ==========
async function getAccounts(env) {
  const data = await env.WISPBYTE_KV.get(ACCOUNTS_KEY, 'json');
  return data || [];
}

async function saveAccounts(env, accounts) {
  await env.WISPBYTE_KV.put(ACCOUNTS_KEY, JSON.stringify(accounts), {
    metadata: { updatedAt: new Date().toISOString() }
  });
}

async function addAccount(env, name, cookie) {
  const accounts = await getAccounts(env);
  const existing = accounts.findIndex(a => a.name === name);
  const now = new Date().toISOString();
  
  if (existing >= 0) {
    accounts[existing] = { ...accounts[existing], cookie, updatedAt: now, cookieUpdatedAt: now };
  } else {
    accounts.push({ name, cookie, addedAt: now, updatedAt: now, cookieUpdatedAt: now });
  }
  
  await saveAccounts(env, accounts);
  return accounts.length;
}

async function removeAccount(env, name) {
  const accounts = await getAccounts(env);
  const newAccounts = accounts.filter(a => a.name !== name);
  await saveAccounts(env, newAccounts);
  return accounts.length - newAccounts.length;
}

// ⭐ 自动更新 Cookie
async function updateAccountCookie(env, name, newCookie) {
  if (!newCookie) return;
  
  const accounts = await getAccounts(env);
  const account = accounts.find(a => a.name === name);
  
  if (account && account.cookie !== newCookie) {
    account.cookie = newCookie;
    account.cookieUpdatedAt = new Date().toISOString();
    await saveAccounts(env, accounts);
    log('INFO', `🔄 [${name}] Cookie 已自动更新`);
  }
}

// ========== Telegram 通知 ==========
async function notify(env, { ok, account, serverId, servers, summary }) {
  try {
    const token = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    let text = '';
    
    if (summary) {
      const status = summary.totalFailed === 0 ? '✅ 重启成功' : '⚠️ 部分失败';
      const details = servers.map(s => 
        `账号：${s.account}\n服务器: ${s.servers.filter(sv => sv.status === 'success').map(sv => sv.id).join(', ') || '无'}`
      ).join('\n\n');
      
      text = `${status}

${details}

成功: ${summary.totalSuccess} / 失败: ${summary.totalFailed}
时间：${time}

Wispbyte Auto Restart`;
    } else if (serverId) {
      text = `${ok ? '✅ 重启成功' : '❌ 重启失败'}

账号：${account}
服务器: ${serverId}
时间：${time}

Wispbyte Auto Restart`;
    } else if (servers && servers.length > 0) {
      const serverList = servers.map(s => s.id).join(', ');
      text = `${ok ? '✅ 重启成功' : '❌ 重启失败'}

账号：${account}
服务器: ${serverList}
时间：${time}

Wispbyte Auto Restart`;
    }

    if (text) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text })
      });
    }
  } catch (e) {
    log('DEBUG', 'Telegram 通知失败:', e.message);
  }
}

// ========== API 请求（带 Cookie 更新）==========
async function apiRequest(path, cookie, options = {}) {
  const url = `${BASE_URL}${path}`;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cookie': cookie,
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers, redirect: 'follow' });
  
  // ⭐ 提取新 Cookie
  let newCookie = null;
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    // 解析 set-cookie，提取 connect.sid
    const cookies = [];
    const parts = setCookieHeader.split(/,(?=\s*\w+=)/);
    
    for (const part of parts) {
      const match = part.match(/^([^=]+)=([^;]+)/);
      if (match) {
        cookies.push(`${match[1].trim()}=${match[2].trim()}`);
      }
    }
    
    // 合并新旧 Cookie
    if (cookies.length > 0) {
      const oldCookies = cookie.split(';').map(c => c.trim());
      const cookieMap = {};
      
      // 先放旧的
      for (const c of oldCookies) {
        const [key] = c.split('=');
        if (key) cookieMap[key.trim()] = c;
      }
      
      // 用新的覆盖
      for (const c of cookies) {
        const [key] = c.split('=');
        if (key) cookieMap[key.trim()] = c;
      }
      
      newCookie = Object.values(cookieMap).join('; ');
    }
  }
  
  return { response, newCookie };
}

// ========== 获取服务器ID ==========
async function getServerIds(cookie) {
  const { response, newCookie } = await apiRequest('/client', cookie);
  const html = await response.text();
  
  if (html.includes('login') && !html.includes('logout')) {
    throw new Error('Cookie 已过期');
  }
  
  const serverIds = new Set();
  const patterns = [
    /server[^>]{0,100}?([a-f0-9]{8})/gi,
    /data-[^=]*=["']([a-f0-9]{8})["']/gi,
    /(?:onclick|href)[^>]{0,50}?([a-f0-9]{8})/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      serverIds.add(match[1].toLowerCase());
    }
  }
  
  if (serverIds.size === 0) {
    const allIds = [...html.matchAll(/(?<![a-f0-9-])([a-f0-9]{8})(?![a-f0-9-])/gi)]
      .map(m => m[1].toLowerCase());
    [...new Set(allIds.slice(-20))].forEach(id => serverIds.add(id));
  }
  
  return { serverIds: [...serverIds], newCookie };
}

// ========== 验证服务器 ==========
async function validateServer(cookie, serverId) {
  try {
    const { response } = await apiRequest(`/client/servers/${serverId}/console`, cookie);
    return response.status === 200;
  } catch {
    return false;
  }
}

// ========== 获取账号的有效服务器 ==========
async function getAccountServers(env, account) {
  const { serverIds: candidateIds, newCookie } = await getServerIds(account.cookie);
  
  // ⭐ 自动更新 Cookie
  if (newCookie) {
    await updateAccountCookie(env, account.name, newCookie);
  }
  
  const validServers = [];
  const cookieToUse = newCookie || account.cookie;
  
  for (const id of candidateIds.slice(0, 15)) {
    if (await validateServer(cookieToUse, id)) {
      validServers.push(id);
    }
    await new Promise(r => setTimeout(r, 200));
  }
  
  return { servers: validServers, updatedCookie: newCookie };
}

// ========== 重启单个服务器 ==========
async function restartSingleServer(env, account, serverId) {
  let cookieToUse = account.cookie;
  
  const { response: consoleRes, newCookie: cookie1 } = await apiRequest(
    `/client/servers/${serverId}/console`, 
    cookieToUse
  );
  
  if (cookie1) {
    cookieToUse = cookie1;
    await updateAccountCookie(env, account.name, cookie1);
  }
  
  if (consoleRes.status !== 200) {
    throw new Error(`服务器 ${serverId} 不存在`);
  }
  
  const html = await consoleRes.text();
  let csrfToken = '';
  const csrfMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/);
  if (csrfMatch) csrfToken = csrfMatch[1];
  
  const { response: restartRes, newCookie: cookie2 } = await apiRequest(
    '/client/api/server/restart', 
    cookieToUse, 
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${BASE_URL}/client/servers/${serverId}/console`
      },
      body: JSON.stringify({ serverId })
    }
  );
  
  // ⭐ 再次更新 Cookie
  if (cookie2) {
    await updateAccountCookie(env, account.name, cookie2);
  }
  
  if (restartRes.status !== 200) {
    throw new Error(`重启失败，状态码: ${restartRes.status}`);
  }
  
  return true;
}

// ========== 重启账号的所有服务器 ==========
async function restartAccountServers(env, account, specificServerId = null) {
  const results = { account: account.name, servers: [], success: 0, failed: 0 };
  
  try {
    let serverIds;
    
    if (specificServerId) {
      serverIds = [specificServerId];
    } else {
      const { servers } = await getAccountServers(env, account);
      serverIds = servers;
    }
    
    if (serverIds.length === 0) {
      results.error = '未找到服务器';
      return results;
    }
    
    // 重新获取最新的账号信息（可能Cookie已更新）
    const accounts = await getAccounts(env);
    const freshAccount = accounts.find(a => a.name === account.name) || account;
    
    for (const serverId of serverIds) {
      try {
        await restartSingleServer(env, freshAccount, serverId);
        results.servers.push({ id: serverId, status: 'success' });
        results.success++;
        log('INFO', `[${account.name}] ✅ 服务器 ${serverId} 重启成功`);
        
        if (specificServerId) {
          await notify(env, { ok: true, account: account.name, serverId });
        }
      } catch (e) {
        results.servers.push({ id: serverId, status: `failed: ${e.message}` });
        results.failed++;
        log('ERROR', `[${account.name}] ❌ 服务器 ${serverId} 重启失败: ${e.message}`);
        
        if (specificServerId) {
          await notify(env, { ok: false, account: account.name, serverId });
        }
      }
      
      await new Promise(r => setTimeout(r, 2000));
    }
    
    if (!specificServerId && results.servers.length > 0) {
      await notify(env, {
        ok: results.failed === 0,
        account: account.name,
        servers: results.servers.filter(s => s.status === 'success')
      });
    }
  } catch (e) {
    results.error = e.message;
  }
  
  return results;
}

// ========== 重启所有账号 ==========
async function restartAllAccounts(env) {
  log('INFO', '==================== 开始批量重启 ====================');
  
  const accounts = await getAccounts(env);
  
  if (accounts.length === 0) {
    return { success: false, message: '没有配置任何账号', results: [] };
  }
  
  const allResults = [];
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (const account of accounts) {
    log('INFO', `📦 处理账号: ${account.name}`);
    const result = await restartAccountServers(env, account);
    allResults.push(result);
    totalSuccess += result.success;
    totalFailed += result.failed;
    await new Promise(r => setTimeout(r, 3000));
  }
  
  log('INFO', `==================== 批量重启完成 ====================`);
  
  await notify(env, {
    ok: totalFailed === 0,
    summary: { totalSuccess, totalFailed },
    servers: allResults
  });
  
  return {
    success: true,
    message: `处理了 ${accounts.length} 个账号`,
    summary: { totalSuccess, totalFailed },
    results: allResults
  };
}

// ========== Worker 入口 ==========
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/' && !url.searchParams.has('key')) {
      return htmlResponse(HTML_PAGE);
    }
    
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    
    const authKey = url.searchParams.get('key');
    if (env.AUTH_KEY && authKey !== env.AUTH_KEY) {
      return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
    }

    // 列出账号
    if (url.pathname === '/accounts' && request.method === 'GET') {
      const accounts = await getAccounts(env);
      return jsonResponse({
        success: true,
        message: `共 ${accounts.length} 个账号`,
        accounts: accounts.map(a => ({
          name: a.name,
          cookieLength: a.cookie?.length || 0,
          addedAt: a.addedAt,
          updatedAt: a.updatedAt,
          cookieUpdatedAt: a.cookieUpdatedAt
        }))
      });
    }
    
    // 添加账号
    if (url.pathname === '/accounts/add' && request.method === 'POST') {
      try {
        const { name, cookie } = await request.json();
        if (!name || !cookie) {
          return jsonResponse({ success: false, message: '缺少 name 或 cookie' }, 400);
        }
        
        try {
          const { response } = await apiRequest('/client', cookie);
          const html = await response.text();
          if (html.includes('login') && !html.includes('logout')) {
            return jsonResponse({ success: false, message: 'Cookie 无效或已过期' }, 400);
          }
        } catch (e) {
          return jsonResponse({ success: false, message: `验证失败: ${e.message}` }, 400);
        }
        
        const count = await addAccount(env, name, cookie);
        return jsonResponse({ success: true, message: `账号 "${name}" 添加成功`, totalAccounts: count });
      } catch (e) {
        return jsonResponse({ success: false, message: e.message }, 500);
      }
    }
    
    // 删除账号
    if (url.pathname === '/accounts/remove' && request.method === 'POST') {
      try {
        const { name } = await request.json();
        if (!name) return jsonResponse({ success: false, message: '缺少 name' }, 400);
        
        const removed = await removeAccount(env, name);
        return jsonResponse({
          success: removed > 0,
          message: removed > 0 ? `账号 "${name}" 已删除` : `账号 "${name}" 不存在`
        });
      } catch (e) {
        return jsonResponse({ success: false, message: e.message }, 500);
      }
    }
    
    // 批量导入
    if (url.pathname === '/accounts/import' && request.method === 'POST') {
      try {
        const { accounts: importList } = await request.json();
        if (!Array.isArray(importList)) {
          return jsonResponse({ success: false, message: '需要 accounts 数组' }, 400);
        }
        
        let imported = 0, failed = 0;
        const errors = [];
        
        for (const item of importList) {
          if (!item.name || !item.cookie) {
            failed++;
            errors.push(`${item.name || '未命名'}: 缺少字段`);
            continue;
          }
          try {
            await addAccount(env, item.name, item.cookie);
            imported++;
          } catch (e) {
            failed++;
            errors.push(`${item.name}: ${e.message}`);
          }
        }
        
        return jsonResponse({
          success: true,
          message: `导入: ${imported} 成功, ${failed} 失败`,
          imported, failed,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (e) {
        return jsonResponse({ success: false, message: e.message }, 500);
      }
    }
    
    // 获取服务器
    if (url.pathname === '/servers') {
      const accountName = url.searchParams.get('account');
      const accounts = await getAccounts(env);
      
      if (accountName) {
        const account = accounts.find(a => a.name === accountName);
        if (!account) return jsonResponse({ success: false, message: '账号不存在' }, 404);
        
        try {
          const { servers } = await getAccountServers(env, account);
          return jsonResponse({ success: true, account: accountName, servers });
        } catch (e) {
          return jsonResponse({ success: false, message: e.message }, 500);
        }
      }
      
      const results = [];
      for (const account of accounts) {
        try {
          const { servers } = await getAccountServers(env, account);
          results.push({ account: account.name, servers, count: servers.length });
        } catch (e) {
          results.push({ account: account.name, error: e.message, servers: [], count: 0 });
        }
        await new Promise(r => setTimeout(r, 500));
      }
      
      return jsonResponse({ success: true, results });
    }
    
    // 重启
    if (url.pathname === '/restart') {
      const accountName = url.searchParams.get('account');
      const serverId = url.searchParams.get('server');
      const accounts = await getAccounts(env);
      
      if (!accountName) {
        const result = await restartAllAccounts(env);
        return jsonResponse(result);
      }
      
      const account = accounts.find(a => a.name === accountName);
      if (!account) return jsonResponse({ success: false, message: '账号不存在' }, 404);
      
      const result = await restartAccountServers(env, account, serverId);
      return jsonResponse({ success: result.failed === 0, ...result });
    }
    
    // 重启全部
    if (url.pathname === '/restart-all') {
      const result = await restartAllAccounts(env);
      return jsonResponse(result);
    }
    
    // 状态
    if (url.pathname === '/status') {
      const accounts = await getAccounts(env);
      return jsonResponse({
        success: true,
        data: { accountCount: accounts.length, accounts: accounts.map(a => a.name) }
      });
    }
    
    return htmlResponse(HTML_PAGE);
  },

  async scheduled(event, env, ctx) {
    log('INFO', '⏰ 定时任务触发');
    await restartAllAccounts(env);
  }
};