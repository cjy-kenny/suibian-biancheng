# 随身编程 v0.3（Python & C++ 移动端编程工具）

手机即用的双语言编程工具：代码编辑 + 真实运行 + 数据分析 + 示例 + 语法速查 + **热更新**。
网页版（浏览器即用）与安卓 APK 安装包双形态。

## 安装包（安卓 APK）

**产物**：`dist/suibian-biancheng-v0.3.apk`（约 14.3 MB，Android 7.0+）
微信传输备选：`dist/随身编程-安装包-v0.3.zip`（解压后安装）。

安装：把 APK 传到手机 → 点击安装（微信里长按文件 →「用其他应用打开」→ 软件包安装程序）
→ 允许"未知来源"。

特性：
- **完全离线运行**：Python 引擎、numpy/pandas、示例全部内置；代码不出设备
- **仅一处联网**：设置页手动点「检查更新」时才访问更新源
- 返回键 = 退到后台不杀进程；旋转屏幕不重载

## 随时更新（v0.3 新增）

分两层：

1. **热更新（界面/脚本/示例/引擎包，免重装）**
   - 电脑端改完代码 → 双击 `生成更新包.bat`（生成 `version.json` + `update/update-bundle-v0.3.zip`）
   - 手机 App：设置 → 填更新源（电脑 IP，如 `http://192.168.1.8:8642`）→「检查」→ 更新完成后点「重启应用」
   - 网页版：更新源留空=查当前站点，发现新版本后刷新页面即可
2. **整包更新（原生壳变化时）**：`打包APK.bat` 重新出 APK → 手机上覆盖安装
   （签名一致即可覆盖；热更新会在装了更新的整包后自动作废，以内置资产为准）

更新源可以是任何静态文件服务（电脑 8642、Gitee Pages、云服务器…），
只要根目录有 `version.json` 和 `update/update-bundle-vX.zip`。
信任模型：更新包内容会被执行，请只填写自己信任的更新源。

## 网页版怎么运行

**电脑**：双击 `启动服务器.bat`（自动打开 http://127.0.0.1:8642），
或手动 `python -m http.server 8642` 后访问同地址。

**手机**：与电脑同一 Wi-Fi → 电脑 `ipconfig` 查 IPv4 →
手机浏览器打开 `http://电脑IP:8642`，可"添加到主屏幕"。

> 必须走 HTTP 访问，直接双击 index.html 无法加载引擎。

## 功能

- **双语言**：Python / C++ 一键切换，代码分开自动保存（localStorage，仅本机）
- **真实运行**：Python = Pyodide（CPython 3.12 WASM）；C++ = JSCPP 教学子集解释执行
- **数据分析**：内置 numpy / pandas，按 import 自动加载（首次几秒）
- **编辑器**：语法高亮、自动配对括号、自动补全（可关）、字号调节、移动端符号工具栏
- **输入(stdin)** 框供 `input()` / `cin` 读取
- **安全保护**：Web Worker 隔离运行，死循环超时强杀（默认 10 秒可调）+ 手动停止
- **检查更新**：见上
- **示例 ×12、语法速查卡 ×12**、深/浅主题、报错栈过滤

## 目录结构

```
biancheng-app/
├── index.html            入口
├── css/ js/              界面样式与逻辑（js/runner.js 为运行内核 Worker）
├── js/examples.js        示例库（12 个）
├── js/syntax.js          语法速查数据
├── vendor/               本地化引擎（离线可用）
│   ├── pyodide/          Pyodide 0.26.4 + numpy/pandas 等 5 个 wheel
│   ├── jscpp/            JSCPP 2.0.6
│   └── codemirror/       CodeMirror 5.65.16（含补全插件）
├── android/              安卓工程（WebView 壳，无 Gradle）
│   ├── src/.../MainActivity.java   壳 + 更新桥（AndroidUpdater）
│   ├── src/.../Updater.java        热更新下载/解压（含 zip-slip 防护）
│   ├── build_apk.py      构建流水线（aapt2→javac→d8→zipalign→apksigner）
│   └── assets/           构建时自动同步的网页资产
├── update/               热更新包（生成更新包.bat 产出）
├── make_update.py        热更新包生成脚本（同时写 version.json）
├── dist/                 APK 产物 + 微信传输 zip
├── _build/               打包工具链（腾讯/阿里云镜像下载，约 180MB，可删）
├── 启动服务器.bat         网页版一键启动（同时是热更新源）
├── 打包APK.bat           APK 一键构建
└── 生成更新包.bat         热更新包一键生成
```

## 当前边界（诚实版）

- C++ 为**教学子集**：iostream/cmath 部分/数组/函数/流程控制；无类、STL、namespace、多文件。
- Python `input()` 从 stdin 框按行顺序读取，非交互式追问。
- **APK 与热更新链路尚未真机实测**（本环境无安卓设备）；网页版更新检查两种分支已实测。
  首次装机若白屏：更新系统"Android System WebView"。
- 热更新只覆盖网页层；改了 Java 原生层就要重新出 APK。
- 更新源走 HTTP（局域网）或 HTTPS 均可；更新内容未做签名校验，别填来路不明的源。

## 路线图

1. ~~pip 第三方库（numpy/pandas）~~ ✅ v0.2
2. ~~打包 APK~~ ✅ v0.2（待真机验证）
3. ~~检查更新/热更新~~ ✅ v0.3（待真机验证）
4. 代码补全升级（内置 API 提示、函数签名）
5. 云编译真 C++（服务端 gcc 或 WASM clang）
6. 更新包签名校验 + 正式签名 + 商店上架材料
7. 完整 PWA、示例扩容、错题本、学习进度

## 开源协议

[MIT](LICENSE) —— 欢迎自由使用、修改、二次分发；如果这个项目对你有帮助，欢迎 Star。

