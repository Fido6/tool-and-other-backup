// Cloudflare Worker下载代理实现

// 前端HTML页面
const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>下载代理</title>
    <!-- 添加Google Fonts链接 -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
    <!-- Material Icons -->
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <style>
        /* Material You 主题变量 */
        :root {
            --primary-color: #3b82f6;
            --primary-light: #bfdbfe;
            --primary-dark: #2563eb;
            --secondary-color: #8b5cf6;
            --error-color: #ef4444;
            --success-color: #10b981;
            --background-color: #f8fafc;
            --surface-color: #ffffff;
            --surface-variant: #f1f5f9;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --text-hint: #94a3b8;
            --border-color: #e2e8f0;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
            --border-radius-sm: 0.375rem;
            --border-radius-md: 0.5rem;
            --border-radius-lg: 0.75rem;
            --border-radius-xl: 1rem;
            --transition-fast: 0.2s ease-in-out;
            --transition-normal: 0.3s ease-in-out;
        }

        /* 暗色模式支持 */
        @media (prefers-color-scheme: dark) {
            :root {
                --background-color: #0f172a;
                --surface-color: #1e293b;
                --surface-variant: #334155;
                --text-primary: #f8fafc;
                --text-secondary: #cbd5e1;
                --text-hint: #94a3b8;
                --border-color: #475569;
                --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.2);
                --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3);
                --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4);
            }
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: var(--background-color);
            color: var(--text-primary);
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            padding: 2rem 1rem;
            transition: background-color var(--transition-normal), color var(--transition-normal);
        }

        .container {
            background-color: var(--surface-color);
            border-radius: var(--border-radius-xl);
            box-shadow: var(--shadow-lg);
            max-width: 32rem;
            width: 100%;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            transition: background-color var(--transition-normal), box-shadow var(--transition-normal);
        }

        .app-header {
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        h1 {
            color: var(--text-primary);
            font-size: 2rem;
            font-weight: 700;
            letter-spacing: -0.025em;
        }

        h2 {
            color: var(--text-secondary);
            font-size: 1rem;
            font-weight: 500;
            letter-spacing: 0;
        }

        .input-container {
            position: relative;
        }

        #urlInput {
            width: 100%;
            padding: 1rem 1.25rem;
            font-size: 1rem;
            background-color: var(--surface-variant);
            border: 3px solid var(--border-color);
            border-radius: var(--border-radius-lg);
            color: var(--text-primary);
            transition: all var(--transition-normal);
            font-family: inherit;
        }

        #urlInput:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 4px var(--primary-light);
            background-color: var(--surface-color);
        }

        #urlInput::placeholder {
            color: var(--text-hint);
        }

        .button-container {
            display: flex;
            gap: 0.75rem;
            position: relative;
        }

        #downloadButton {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            border: none;
            padding: 1rem 2rem;
            font-size: 1rem;
            font-weight: 600;
            border-radius: var(--border-radius-lg);
            cursor: pointer;
            flex: 1;
            transition: all var(--transition-normal);
            box-shadow: var(--shadow-md);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            position: relative;
            overflow: hidden;
        }

        #downloadButton::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s ease;
        }

        #downloadButton:hover::before {
            left: 100%;
        }

        #downloadButton:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        #downloadButton:active {
            transform: translateY(0);
            box-shadow: var(--shadow-md);
        }

        #settingsButton {
            width: 3.5rem;
            height: 3.5rem;
            background-color: var(--surface-variant);
            border: 0px solid var(--border-color);
            border-radius: var(--border-radius-lg);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all var(--transition-normal);
            color: var(--text-primary);
        }

        #settingsButton:hover {
            background-color: var(--border-color);
            border-color: var(--primary-color);
        }

        #settingsButton:focus {
            outline: none;
            box-shadow: 0 0 0 4px var(--primary-light);
        }

        .settings-panel {
            background-color: var(--surface-variant);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-lg);
            padding: 1.5rem;
            display: none;
            transition: all var(--transition-normal);
            animation: fadeInUp 0.3s ease-out;
        }

        .settings-panel.show {
            display: block;
        }

        .setting-group {
            margin-bottom: 1rem;
        }

        .setting-group:last-child {
            margin-bottom: 0;
        }

        .setting-label {
            display: block;
            margin-bottom: 0.5rem;
            color: var(--text-secondary);
            font-weight: 500;
            font-size: 0.875rem;
        }

        .setting-select {
            width: 100%;
            padding: 0.75rem 1rem;
            background-color: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-md);
            font-size: 0.875rem;
            color: var(--text-primary);
            transition: all var(--transition-normal);
            font-family: inherit;
        }

        .setting-select:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px var(--primary-light);
        }

        .setting-input {
            width: 100%;
            padding: 0.75rem 1rem;
            background-color: var(--surface-color);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-md);
            font-size: 0.875rem;
            color: var(--text-primary);
            transition: all var(--transition-normal);
            font-family: inherit;
        }

        .setting-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px var(--primary-light);
        }

        .setting-input::placeholder {
            color: var(--text-hint);
        }

        #status {
            margin-top: 0.5rem;
            color: var(--text-secondary);
            text-align: center;
            font-size: 0.875rem;
            min-height: 1.25rem;
            transition: all var(--transition-normal);
        }

        #status.error {
            color: var(--error-color);
            font-weight: 500;
        }

        #status.success {
            color: var(--success-color);
            font-weight: 500;
        }

        .tooltip {
            position: relative;
            display: inline-block;
        }

        .tooltip .tooltip-text {
            visibility: hidden;
            width: 120px;
            background-color: var(--text-primary);
            color: var(--background-color);
            text-align: center;
            border-radius: var(--border-radius-sm);
            padding: 0.5rem;
            position: absolute;
            z-index: 1;
            bottom: 125%;
            left: 50%;
            margin-left: -60px;
            opacity: 0;
            transition: opacity 0.3s;
            font-size: 0.75rem;
            font-weight: 500;
        }

        .tooltip:hover .tooltip-text {
            visibility: visible;
            opacity: 1;
        }

        .tooltip .tooltip-text::after {
            content: "";
            position: absolute;
            top: 100%;
            left: 50%;
            margin-left: -5px;
            border-width: 5px;
            border-style: solid;
            border-color: var(--text-primary) transparent transparent transparent;
        }

        /* 动画效果 */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* 响应式设计 */
        @media (max-width: 640px) {
            body {
                padding: 1rem;
            }
            
            .container {
                padding: 1.5rem;
            }
            
            h1 {
                font-size: 1.5rem;
            }
            
            #downloadButton {
                padding: 0.875rem 1.5rem;
                font-size: 0.875rem;
            }
            
            #settingsButton {
                width: 3rem;
                height: 3rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="app-header">
            <h1>Download Proxy</h1>
            <h2>通过worker下载</h2>
        </div>
        
        <div class="input-container">
            <input type="text" id="urlInput" placeholder="请输入要下载的链接 (http/https)...">
        </div>
        
        <!-- 设置面板 -->
        <div class="settings-panel" id="settingsPanel">
            <div class="setting-group">
                <label class="setting-label">User-Agent 设置</label>
                <select id="uaSelector" class="setting-select">
                    <option value="chrome">Chrome (默认)</option>
                    <option value="safari">Safari</option>
                    <option value="firefox">Firefox</option>
                    <option value="edge">Edge</option>
                    <option value="custom">自定义</option>
                </select>
                <input type="text" id="customUA" class="setting-input" placeholder="请输入自定义User-Agent" style="margin-top: 10px; display: none;">
            </div>
        </div>
        
        <div class="button-container">
            <button id="downloadButton" onclick="startDownload()">
                <span class="material-icons">download</span>
                下载
            </button>
            <div class="tooltip">
                <button id="settingsButton" onclick="toggleSettings()">
                    <span class="material-icons">settings</span>
                </button>
                <span class="tooltip-text">高级设置</span>
            </div>
        </div>
        
        <div id="status"></div>
    </div>

    <script>
        // 预设的UA字符串
        const presetUAs = {
            chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
            safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3.1 Safari/605.1.15',
            firefox: 'Mozilla/5.0 (Windows NT 6.2; rv:139.541.193) Gecko/20100101 Firefox/139.541.193',
            edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.3405.125'
        };
        
        // 切换设置面板显示/隐藏
        function toggleSettings() {
            const settingsPanel = document.getElementById('settingsPanel');
            settingsPanel.classList.toggle('show');
        }
        
        // 监听UA选择器变化
        document.getElementById('uaSelector').addEventListener('change', function() {
            const customUAInput = document.getElementById('customUA');
            if (this.value === 'custom') {
                customUAInput.style.display = 'block';
                // 添加淡入动画
                setTimeout(() => {
                    customUAInput.style.opacity = '1';
                }, 10);
            } else {
                customUAInput.style.display = 'none';
            }
        });
        
        // 获取当前选择的UA
        function getCurrentUA() {
            const uaSelector = document.getElementById('uaSelector');
            const selectedUA = uaSelector.value;
            
            if (selectedUA === 'custom') {
                return document.getElementById('customUA').value.trim() || presetUAs.chrome;
            } else {
                return presetUAs[selectedUA];
            }
        }
        
        // 开始下载
        function startDownload() {
            const url = document.getElementById('urlInput').value.trim();
            const status = document.getElementById('status');
            const button = document.getElementById('downloadButton');
            
            // 验证URL格式
            if (!url) {
                status.textContent = '请输入有效的链接';
                status.className = 'error';
                return;
            }
            
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                status.textContent = '链接必须以http://或https://开头';
                status.className = 'error';
                return;
            }
            
            // 使用跳转模式下载
            const workerUrl = window.location.origin;
            const targetUrl = workerUrl + '/' + encodeURIComponent(url) + '?ua=' + encodeURIComponent(getCurrentUA());
            
            // 更新状态
            // status.textContent = '正在准备下载...';
            status.className = 'success';
            
            // 跳转到代理下载链接
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 500);
        }
        
        // 监听输入事件，清除错误状态
        document.getElementById('urlInput').addEventListener('input', function() {
            const status = document.getElementById('status');
            status.textContent = '';
            status.className = '';
        });
    </script>
</body>
</html>`;

// 处理fetch请求
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

/**
 * 处理请求的主要函数
 */
async function handleRequest(request) {
    const url = new URL(request.url);
    
    // 如果是根路径，返回HTML页面
    if (url.pathname === '/') {
        return new Response(HTML, {
            headers: {
                'content-type': 'text/html;charset=UTF-8',
            },
        });
    }
    
    // 否则尝试解析路径中的URL进行代理下载
    try {
        // 获取并解码用户输入的URL
        const pathParts = url.pathname.split('?')[0]; // 移除查询参数
        const targetUrl = decodeURIComponent(pathParts.substring(1));
        
        // 获取用户指定的UA（如果有）
        const userUA = url.searchParams.get('ua') || request.headers.get('User-Agent') || 'Mozilla/5.0';
        
        // 验证URL格式
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            throw new Error('Invalid URL format');
        }
        
        // 创建一个新的请求，设置用户指定的UA
        const newRequest = new Request(targetUrl, {
            method: 'GET',
            headers: {
                'User-Agent': userUA,
                'Accept': request.headers.get('Accept') || '*/*',
            },
            redirect: 'follow'
        });
        
        // 发送代理请求并获取响应
        const response = await fetch(newRequest);
        
        // 创建一个新的响应，添加CORS头
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'Content-Type');
        
        // 如果没有Content-Disposition头，添加一个以确保下载行为
        if (!headers.has('Content-Disposition')) {
            // 尝试从URL中提取文件名
            const urlObj = new URL(targetUrl);
            const pathname = urlObj.pathname;
            const parts = pathname.split('/');
            const fileName = parts[parts.length - 1];
            
           
