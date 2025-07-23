# PDF.js键盘焦点修复

修复PDF.js在Chrome扩展环境中首次加载时键盘事件不工作的问题。

## 问题描述

- **症状**: 页面首次加载后键盘快捷键不工作，包括浏览器级别的Ctrl+R、Ctrl+Tab
- **原因**: `document.hasFocus() = false`，文档没有获得焦点
- **触发条件**: 需要用户点击页面才能激活键盘事件

## 解决方案

在两个关键时机主动获取文档焦点：

### 1. 文档首页加载完成后
**文件**: `web/app.js` (行1341-1351)
```javascript
// FIX: Try to gain document focus after first page loads
if (!document.hasFocus()) {
  console.log('🔧 [DEBUG] Document lacks focus after first page load, attempting focus...');
  window.focus();
  setTimeout(() => { if (this.pdfViewer) this.pdfViewer.focus(); }, 100);
}
```

### 2. 页面完全加载后兜底修复
**文件**: `web/viewer.js` (行349-370)
```javascript
// FIX: Force focus the window if document doesn't have focus
if (!document.hasFocus()) {
  window.focus();
  const viewerContainer = document.getElementById('viewer');
  if (viewerContainer) viewerContainer.focus();
}
```

## 调试日志

添加了详细调试日志用于诊断焦点问题：
- 🎹 键盘事件详情
- 🎯 焦点状态变化  
- 📄 PDF加载状态
- 🔧 焦点修复尝试

## 关键文件

- `web/app.js`: 主要键盘事件处理和文档加载后焦点修复
- `web/viewer.js`: 页面初始化和窗口焦点事件监听
- `web/pdf_viewer.js`: PDF查看器焦点管理

## 验证方法

1. 加载PDF后检查控制台：`documentHasFocus: true`
2. 测试键盘快捷键：Ctrl+R、Ctrl+Tab、方向键
3. 无需点击页面即可使用键盘导航

## 构建

```bash
npx gulp chromium
```