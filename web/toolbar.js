/* Copyright 2016 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** @typedef {import("./event_utils.js").EventBus} EventBus */

import { AnnotationEditorType, ColorPicker, noContextMenu } from "pdfjs-lib";
import {
  DEFAULT_SCALE,
  DEFAULT_SCALE_VALUE,
  MAX_SCALE,
  MIN_SCALE,
  showNotification,
  toggleExpandedBtn,
} from "./ui_utils.js";

/**
 * @typedef {Object} ToolbarOptions
 * @property {HTMLDivElement} container - Container for the secondary toolbar.
 * @property {HTMLSpanElement} numPages - Label that contains number of pages.
 * @property {HTMLInputElement} pageNumber - Control for display and user input
 *   of the current page number.
 * @property {HTMLSelectElement} scaleSelect - Scale selection control.
 *   Its width is adjusted, when necessary, on UI localization.
 * @property {HTMLOptionElement} customScaleOption - The item used to display
 *   a non-predefined scale.
 * @property {HTMLButtonElement} previous - Button to go to the previous page.
 * @property {HTMLButtonElement} next - Button to go to the next page.
 * @property {HTMLButtonElement} zoomIn - Button to zoom in the pages.
 * @property {HTMLButtonElement} zoomOut - Button to zoom out the pages.
 * @property {HTMLButtonElement} editorFreeTextButton - Button to switch to
 *   FreeText editing.
 * @property {HTMLButtonElement} download - Button to download the document.
 */

class Toolbar {
  #colorPicker = null;

  #opts;

  /**
   * @param {ToolbarOptions} options
   * @param {EventBus} eventBus
   * @param {number} toolbarDensity - The toolbar density value.
   *   The possible values are:
   *    - 0 (default) - The regular toolbar size.
   *    - 1 (compact) - The small toolbar size.
   *    - 2 (touch) - The large toolbar size.
   */
  constructor(options, eventBus, toolbarDensity = 0) {
    this.#opts = options;
    this.eventBus = eventBus;
    const buttons = [
      { element: options.previous, eventName: "previouspage" },
      { element: options.next, eventName: "nextpage" },
      { element: options.zoomIn, eventName: "zoomin" },
      { element: options.zoomOut, eventName: "zoomout" },
      { element: options.print, eventName: "print" },
      { element: options.download, eventName: "download" },
      {
        element: options.editorFreeTextButton,
        eventName: "switchannotationeditormode",
        eventDetails: {
          get mode() {
            const { classList } = options.editorFreeTextButton;
            return classList.contains("toggled")
              ? AnnotationEditorType.NONE
              : AnnotationEditorType.FREETEXT;
          },
        },
      },
      {
        element: options.editorHighlightButton,
        eventName: "switchannotationeditormode",
        eventDetails: {
          get mode() {
            const { classList } = options.editorHighlightButton;
            return classList.contains("toggled")
              ? AnnotationEditorType.NONE
              : AnnotationEditorType.HIGHLIGHT;
          },
        },
      },
      {
        element: options.editorInkButton,
        eventName: "switchannotationeditormode",
        eventDetails: {
          get mode() {
            const { classList } = options.editorInkButton;
            return classList.contains("toggled")
              ? AnnotationEditorType.NONE
              : AnnotationEditorType.INK;
          },
        },
      },
      {
        element: options.editorStampButton,
        eventName: "switchannotationeditormode",
        eventDetails: {
          get mode() {
            const { classList } = options.editorStampButton;
            return classList.contains("toggled")
              ? AnnotationEditorType.NONE
              : AnnotationEditorType.STAMP;
          },
        },
        telemetry: {
          type: "editing",
          data: { action: "pdfjs.image.icon_click" },
        },
      },
      {
        element: options.editorSignatureButton,
        eventName: "switchannotationeditormode",
        eventDetails: {
          get mode() {
            const { classList } = options.editorSignatureButton;
            return classList.contains("toggled")
              ? AnnotationEditorType.NONE
              : AnnotationEditorType.SIGNATURE;
          },
        },
      },
      {
        element: options.refPdfButton,
        eventName: null,
      },
    ];

    // Bind the event listeners for click and various other actions.
    this.#bindListeners(buttons);

    this.#updateToolbarDensity({ value: toolbarDensity });
    this.reset();
  }

  #updateToolbarDensity({ value }) {
    let name = "normal";
    switch (value) {
      case 1:
        name = "compact";
        break;
      case 2:
        name = "touch";
        break;
    }
    document.documentElement.setAttribute("data-toolbar-density", name);
  }

  setPageNumber(pageNumber, pageLabel) {
    this.pageNumber = pageNumber;
    this.pageLabel = pageLabel;
    this.#updateUIState(false);
  }

  setPagesCount(pagesCount, hasPageLabels) {
    this.pagesCount = pagesCount;
    this.hasPageLabels = hasPageLabels;
    this.#updateUIState(true);
  }

  setPageScale(pageScaleValue, pageScale) {
    this.pageScaleValue = (pageScaleValue || pageScale).toString();
    this.pageScale = pageScale;
    this.#updateUIState(false);
  }

  reset() {
    this.#colorPicker = null;
    this.pageNumber = 0;
    this.pageLabel = null;
    this.hasPageLabels = false;
    this.pagesCount = 0;
    this.pageScaleValue = DEFAULT_SCALE_VALUE;
    this.pageScale = DEFAULT_SCALE;
    this.#updateUIState(true);
    this.updateLoadingIndicatorState();

    // Reset the Editor buttons too, since they're document specific.
    this.#editorModeChanged({ mode: AnnotationEditorType.DISABLE });
  }

  #bindListeners(buttons) {
    const { eventBus } = this;
    const {
      editorHighlightColorPicker,
      editorHighlightButton,
      pageNumber,
      scaleSelect,
    } = this.#opts;
    const self = this;

    // The buttons within the toolbar.
    for (const { element, eventName, eventDetails, telemetry } of buttons) {
      element.addEventListener("click", evt => {
        if (element === this.#opts.refPdfButton) {
          // 获取PDF文档的标题
          const title = window.PDFViewerApplication?._docTitle || 
                       window.PDFViewerApplication?._docFilename || 
                       "Unknown PDF";
          
          // 获取当前页码
          const currentPage = window.PDFViewerApplication?.page || 1;
          
          // 获取当前URL并处理页码参数
          let currentUrl = new URL(window.location.href);
          
          // 如果是Chrome扩展URL，提取其中的file://部分
          if (currentUrl.href.includes('chrome-extension://') && currentUrl.href.includes('file://')) {
            const fileUrlMatch = currentUrl.href.match(/file:\/\/[^#&?]*/);
            if (fileUrlMatch) {
              const fileUrl = fileUrlMatch[0];
              const hash = currentUrl.hash;
              // 重新构建URL，只使用file://部分
              currentUrl = new URL(fileUrl + hash);
            }
          }
          
          const hash = currentUrl.hash;
          
          let newHash = '';
          if (hash.includes('page=')) {
            // 如果URL已包含page参数，替换页码
            newHash = hash.replace(/page=\d+/, `page=${currentPage}`);
          } else if (hash.length > 1) {
            // 如果有其他hash参数，添加&page=
            newHash = `${hash}&page=${currentPage}`;
          } else {
            // 如果没有hash，添加#page=
            newHash = `#page=${currentPage}`;
          }
          
          // 构建完整的URL
          const resultUrl = `${currentUrl.origin}${currentUrl.pathname}${currentUrl.search}${newHash}`;
          
          // 构建Markdown格式的字符串
          const markdownString = `[${title} + page ${currentPage}](${resultUrl})`;
          
          // 将Markdown字符串写入剪贴板
          const copyToClipboard = async (text) => {
            console.log('🔍 检查剪贴板权限...');
            console.log('navigator.clipboard:', !!navigator.clipboard);
            console.log('navigator.clipboard.writeText:', !!navigator.clipboard?.writeText);
            
            // 方法1: 尝试使用现代Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
              try {
                console.log('📋 尝试使用Clipboard API...');
                await navigator.clipboard.writeText(text);
                console.log('✅ Clipboard API成功');
                return true;
              } catch (error) {
                console.error('❌ Clipboard API失败:', error);
                console.log('🔄 降级到execCommand...');
              }
            }
            
            // 方法2: 降级处理 - 使用execCommand
            return new Promise((resolve) => {
              const textArea = document.createElement('textarea');
              textArea.value = text;
              textArea.style.position = 'fixed';
              textArea.style.left = '-9999px';
              textArea.style.top = '-9999px';
              textArea.style.opacity = '0';
              textArea.setAttribute('readonly', '');
              textArea.setAttribute('tabindex', '-1');
              document.body.appendChild(textArea);
              
              try {
                textArea.focus();
                textArea.select();
                textArea.setSelectionRange(0, textArea.value.length);
                
                const successful = document.execCommand('copy');
                console.log(successful ? '✅ execCommand成功' : '❌ execCommand失败');
                document.body.removeChild(textArea);
                resolve(successful);
              } catch (err) {
                console.error('❌ execCommand异常:', err);
                document.body.removeChild(textArea);
                resolve(false);
              }
            });
          };
          
          // 执行复制操作
          copyToClipboard(markdownString).then(success => {
            if (success) {
              showNotification(`引用链接已复制: ${title} (第${currentPage}页)`, true);
            } else {
              // 如果复制失败，显示内容以便手动复制
              showNotification(`复制失败，请手动复制: ${markdownString}`, false, 8000);
            }
          });
          return;
        }
        if (eventName !== null) {
          eventBus.dispatch(eventName, {
            source: this,
            ...eventDetails,
            // evt.detail is the number of clicks.
            isFromKeyboard: evt.detail === 0,
          });
        }
        if (telemetry) {
          eventBus.dispatch("reporttelemetry", {
            source: this,
            details: telemetry,
          });
        }
      });
    }
    // The non-button elements within the toolbar.
    pageNumber.addEventListener("click", function () {
      this.select();
    });
    pageNumber.addEventListener("change", function () {
      eventBus.dispatch("pagenumberchanged", {
        source: self,
        value: this.value,
      });
    });

    scaleSelect.addEventListener("change", function () {
      if (this.value === "custom") {
        return;
      }
      eventBus.dispatch("scalechanged", {
        source: self,
        value: this.value,
      });
    });
    // Here we depend on browsers dispatching the "click" event *after* the
    // "change" event, when the <select>-element changes.
    scaleSelect.addEventListener("click", function ({ target }) {
      // Remove focus when an <option>-element was *clicked*, to improve the UX
      // for mouse users (fixes bug 1300525 and issue 4923).
      if (
        this.value === self.pageScaleValue &&
        target.tagName.toUpperCase() === "OPTION"
      ) {
        this.blur();
      }
    });
    // Suppress context menus for some controls.
    scaleSelect.oncontextmenu = noContextMenu;

    eventBus._on(
      "annotationeditormodechanged",
      this.#editorModeChanged.bind(this)
    );
    eventBus._on("showannotationeditorui", ({ mode }) => {
      switch (mode) {
        case AnnotationEditorType.HIGHLIGHT:
          editorHighlightButton.click();
          break;
      }
    });
    eventBus._on("toolbardensity", this.#updateToolbarDensity.bind(this));

    if (editorHighlightColorPicker) {
      eventBus._on("annotationeditoruimanager", ({ uiManager }) => {
        const cp = (this.#colorPicker = new ColorPicker({ uiManager }));
        uiManager.setMainHighlightColorPicker(cp);
        editorHighlightColorPicker.append(cp.renderMainDropdown());
      });

      eventBus._on("mainhighlightcolorpickerupdatecolor", ({ value }) => {
        this.#colorPicker?.updateColor(value);
      });
    }
  }

  #editorModeChanged({ mode }) {
    const {
      editorFreeTextButton,
      editorFreeTextParamsToolbar,
      editorHighlightButton,
      editorHighlightParamsToolbar,
      editorInkButton,
      editorInkParamsToolbar,
      editorStampButton,
      editorStampParamsToolbar,
      editorSignatureButton,
      editorSignatureParamsToolbar,
    } = this.#opts;

    toggleExpandedBtn(
      editorFreeTextButton,
      mode === AnnotationEditorType.FREETEXT,
      editorFreeTextParamsToolbar
    );
    toggleExpandedBtn(
      editorHighlightButton,
      mode === AnnotationEditorType.HIGHLIGHT,
      editorHighlightParamsToolbar
    );
    toggleExpandedBtn(
      editorInkButton,
      mode === AnnotationEditorType.INK,
      editorInkParamsToolbar
    );
    toggleExpandedBtn(
      editorStampButton,
      mode === AnnotationEditorType.STAMP,
      editorStampParamsToolbar
    );
    toggleExpandedBtn(
      editorSignatureButton,
      mode === AnnotationEditorType.SIGNATURE,
      editorSignatureParamsToolbar
    );

    const isDisable = mode === AnnotationEditorType.DISABLE;
    editorFreeTextButton.disabled = isDisable;
    editorHighlightButton.disabled = isDisable;
    editorInkButton.disabled = isDisable;
    editorStampButton.disabled = isDisable;
    editorSignatureButton.disabled = isDisable;
  }

  #updateUIState(resetNumPages = false) {
    const { pageNumber, pagesCount, pageScaleValue, pageScale } = this;
    const opts = this.#opts;

    if (resetNumPages) {
      if (this.hasPageLabels) {
        opts.pageNumber.type = "text";

        opts.numPages.setAttribute("data-l10n-id", "pdfjs-page-of-pages");
      } else {
        opts.pageNumber.type = "number";

        opts.numPages.setAttribute("data-l10n-id", "pdfjs-of-pages");
        opts.numPages.setAttribute(
          "data-l10n-args",
          JSON.stringify({ pagesCount })
        );
      }
      opts.pageNumber.max = pagesCount;
    }

    if (this.hasPageLabels) {
      opts.pageNumber.value = this.pageLabel;

      opts.numPages.setAttribute(
        "data-l10n-args",
        JSON.stringify({ pageNumber, pagesCount })
      );
    } else {
      opts.pageNumber.value = pageNumber;
    }

    opts.previous.disabled = pageNumber <= 1;
    opts.next.disabled = pageNumber >= pagesCount;

    opts.zoomOut.disabled = pageScale <= MIN_SCALE;
    opts.zoomIn.disabled = pageScale >= MAX_SCALE;

    let predefinedValueFound = false;
    for (const option of opts.scaleSelect.options) {
      if (option.value !== pageScaleValue) {
        option.selected = false;
        continue;
      }
      option.selected = true;
      predefinedValueFound = true;
    }
    if (!predefinedValueFound) {
      opts.customScaleOption.selected = true;
      opts.customScaleOption.setAttribute(
        "data-l10n-args",
        JSON.stringify({
          scale: Math.round(pageScale * 10000) / 100,
        })
      );
    }
  }

  updateLoadingIndicatorState(loading = false) {
    const { pageNumber } = this.#opts;
    pageNumber.classList.toggle("loading", loading);
  }
}

export { Toolbar };
