# Resona AI · 声学逆向解构与定制语音克隆工坊

基于 Google Gemini API（`gemini-3.8-flash-lite-tts` 与 `gemini-3.8-flash-tts`）和原生 Web Audio DSP 声学工程的实时语音合成与个性化音色克隆系统。

---

## ✨ 核心特性

- 🎙️ **多模态声学特征解构**：上传或麦克风录制参考音频，客户端自相关算法自动识别声音基频（$F_0$）与性别，无缝绑定底层声学模型。
- 🎛️ **Web Audio 实时声学塑形调音台**：提供音高微调（Pitch Shift）、胸腔温暖度（220Hz EQ）、头腔空气感（6.5kHz EQ）和语速变速，实时重构音色。
- 🇨🇳🇺🇸 **中英双语朗读测试与对比预览**：支持中英文一键切换、范文测试，并在音色效果预览中提供源文件与克隆音频的左右双轨直观对比与 A/B 音色快速切换。
- 🛡️ **高可用弹性双模型热备**：内置自动退避与多模型重试机制，配合声学仿真降级保障，确保任何环境下试听与合成稳定可用。

---

## 🚀 本地运行与部署

### 1. 克隆 / 下载项目代码
```bash
git clone <你的 GitHub 仓库地址>
cd <项目目录>
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
复制根目录下的 `.env.example` 为 `.env`：
```bash
cp .env.example .env
```
在 `.env` 中填入你的 Google Gemini API Key：
```env
GEMINI_API_KEY="你的_GEMINI_API_KEY"
PORT=3000
```
> 💡 提示：可以在 [Google AI Studio 控制台](https://aistudio.google.com/apikey) 免费申请 API Key。

### 4. 启动本地开发服务
```bash
npm run dev
```
启动成功后，在浏览器访问 `http://localhost:3000` 即可开始使用。

---

## 📦 生产环境打包与部署

### 本地编译生产版本
```bash
npm run build
npm start
```

### 部署到云平台（如 Railway、Render、Zeabur、Docker 或 Vercel）
- **Node.js 环境**：要求 Node.js 18+ 或 20+。
- **启动命令 (Start Command)**：`npm start`
- **构建命令 (Build Command)**：`npm run build`
- **环境变量 (Environment Variables)**：配置 `GEMINI_API_KEY`。
