# 如何在PDF.js中添加键盘快捷键

本文档记录了在PDF.js中添加新键盘快捷键的完整方法。

## 核心实现位置

**文件**: `web/app.js`
**函数**: `onKeyDown(evt)`
**位置**: 约第2796行，在cmd变量定义后添加

## 添加快捷键的模式

### 1. 基本结构
```javascript
// Handle [KEY_NAME] key for [FUNCTIONALITY]
if (evt.keyCode === [KEY_CODE] && !evt.ctrlKey && !evt.altKey && !evt.metaKey) {
  // 调用相应功能
  this.[COMPONENT]?.[METHOD]();
  handled = true; // 阻止默认行为
}
```

### 2. 实际示例 - Tab键切换侧边栏
```javascript
// Handle Tab key for sidebar toggle (prevent default tab behavior)
if (evt.keyCode === 9 && !evt.ctrlKey && !evt.altKey && !evt.metaKey) {
  this.pdfSidebar?.toggle();
  handled = true;
}
```

## 常用KeyCode参考

- Tab: 9
- Enter: 13
- Escape: 27
- Space: 32
- Page Up: 33
- Page Down: 34
- Home: 36
- End: 35
- Arrow Keys: 37-40
- F4: 115

## 可用组件方法

### 侧边栏 (this.pdfSidebar)
- `toggle()` - 切换显示/隐藏
- `open()` - 打开侧边栏
- `close()` - 关闭侧边栏

### PDF查看器 (this.pdfViewer)
- `focus()` - 设置焦点
- `nextPage()` - 下一页
- `previousPage()` - 上一页
- `currentScaleValue` - 当前缩放级别

### 查找栏 (this.findBar)
- `open()` - 打开查找栏
- `close()` - 关闭查找栏

### 工具栏 (this.toolbar)
- 各种工具栏操作

## 修饰键检查

```javascript
// 单独按键（无修饰键）
if (evt.keyCode === 9 && !evt.ctrlKey && !evt.altKey && !evt.metaKey)

// Ctrl + 按键
if ((evt.ctrlKey || evt.metaKey) && evt.keyCode === 70) // Ctrl+F

// Alt + 按键  
if (evt.altKey && evt.keyCode === 71)

// Shift + 按键
if (evt.shiftKey && evt.keyCode === 32)
```

## 已存在的快捷键（避免冲突）

- **F4**: 切换侧边栏
- **Ctrl+F**: 查找
- **Ctrl+G**: 查找下一个
- **方向键**: 页面导航
- **Page Up/Down**: 翻页
- **Space**: 向下翻页
- **Home/End**: 首页/末页

## 插入位置

在 `onKeyDown` 函数中，`cmd` 变量定义后，第一个大的条件判断之前：

```javascript
const cmd = (evt.ctrlKey ? 1 : 0) | (evt.altKey ? 2 : 0) | (evt.shiftKey ? 4 : 0) | (evt.metaKey ? 8 : 0);

// 在这里添加新的快捷键处理
if (evt.keyCode === [KEY_CODE] && [MODIFIER_CONDITIONS]) {
  // 功能实现
  handled = true;
}

// First, handle the key bindings that are independent...
if (cmd === 1 || cmd === 8 || cmd === 5 || cmd === 12) {
```

## 构建命令

```bash
npx gulp chromium
```

## 注意事项

1. 检查是否与现有快捷键冲突
2. 优先处理单键快捷键，避免被其他逻辑拦截
3. 使用 `handled = true` 阻止默认浏览器行为
4. 使用可选链操作符 `?.` 防止组件未初始化错误