# 如何在PDF.js工具栏中添加新工具

本文档记录了在PDF.js中添加新工具栏按钮的完整步骤。

## 步骤概览

1. 在HTML中添加按钮结构
2. 在viewer.js中添加DOM元素引用
3. 在toolbar.js中配置按钮行为

## 详细步骤

### 1. 修改HTML结构

**文件**: `web/viewer.html`
**位置**: 在`editorModeButtons`容器内，通常在其他编辑器按钮之后

```html
<div id="editorCustom" class="toolbarButtonWithContainer">
  <button id="editorCustomButton" class="toolbarButton" type="button" tabindex="0" data-l10n-id="pdfjs-editor-custom-button" title="Custom Action">
    <span data-l10n-id="pdfjs-editor-custom-button-label">A</span>
  </button>
</div>
```

**说明**:
- 按钮容器使用`toolbarButtonWithContainer`类
- 按钮本身使用`toolbarButton`类
- 如果没有图标文件，可以在span中直接显示文字
- 可以添加`editorParamsToolbar`子容器来创建下拉参数面板

### 2. 添加DOM元素引用

**文件**: `web/viewer.js`
**位置**: 在toolbar配置对象中

找到类似以下的配置并添加新按钮:
```javascript
editorSignatureButton: document.getElementById("editorSignatureButton"),
editorSignatureParamsToolbar: document.getElementById("editorSignatureParamsToolbar"),
editorCustomButton: document.getElementById("editorCustomButton"), // 添加这行
```

### 3. 配置按钮行为

**文件**: `web/toolbar.js`

#### 3a. 在buttons数组中添加按钮配置

找到buttons数组（约第63行），在其中添加:
```javascript
{
  element: options.editorCustomButton,
  eventName: null, // 如果不需要发送事件，设为null
},
```

或者如果需要发送事件:
```javascript
{
  element: options.editorCustomButton,
  eventName: "customaction",
  eventDetails: {
    // 事件详细信息
  },
},
```

#### 3b. 添加特定的事件处理

在`#bindListeners`方法中（约第205行），修改事件循环:
```javascript
for (const { element, eventName, eventDetails, telemetry } of buttons) {
  element.addEventListener("click", evt => {
    // 添加特定按钮的处理
    if (element === this.#opts.editorCustomButton) {
      alert("Custom button clicked!");
      return;
    }
    
    // 原有的事件处理逻辑
    if (eventName !== null) {
      eventBus.dispatch(eventName, {
        source: this,
        ...eventDetails,
        isFromKeyboard: evt.detail === 0,
      });
    }
    // ...
  });
}
```

## 实际示例文件位置

基于最近的实现:
1. **HTML** (`/home/yiang/Work/chrome-plugins/pdf-new/web/viewer.html:335-339`): 在editorModeButtons中添加了新的自定义按钮，显示字母"A"
2. **JavaScript配置** (`/home/yiang/Work/chrome-plugins/pdf-new/web/viewer.js:69`): 添加了editorCustomButton的DOM元素引用
3. **事件处理** (`/home/yiang/Work/chrome-plugins/pdf-new/web/toolbar.js:134-137,206-209`): 添加了按钮配置和点击事件处理，显示中英文alert

## 可选功能

### 添加参数工具栏

如果需要像高亮工具那样的参数面板，可以在HTML中添加:
```html
<div class="editorParamsToolbar hidden doorHangerRight" id="editorCustomParamsToolbar">
  <div class="editorParamsToolbarContainer">
    <!-- 参数控件 -->
  </div>
</div>
```

然后在`#editorModeChanged`方法中添加相应的显示/隐藏逻辑。

### 集成到编辑器模式系统

如果新工具是一个编辑器模式，需要:
1. 在`src/shared/util.js`中的`AnnotationEditorType`枚举中添加新类型
2. 修改`eventDetails`以返回相应的编辑器类型
3. 在`#editorModeChanged`方法中添加模式切换逻辑

## 关键文件说明

- `web/viewer.html`: UI结构
- `web/viewer.js`: DOM元素配置和应用初始化
- `web/toolbar.js`: 工具栏行为和事件处理
- `web/app.js`: 应用主逻辑
- `src/shared/util.js`: 共享常量和枚举

## 注意事项

1. 确保按钮ID的唯一性
2. 遵循现有的命名约定（editor + 功能名 + Button/Toolbar）
3. 添加适当的无障碍属性（aria-*）
4. 考虑国际化（data-l10n-id属性）
5. 测试在不同设备和分辨率下的显示效果