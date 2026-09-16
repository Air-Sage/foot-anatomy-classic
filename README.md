# 下肢人体解剖 3D 模型（旧版）

保存整体 UI、渲染优化之前的版本，包含分组列表、分类显示、原位高亮、部位抽出与回位、独立隐藏、旋转平移和透视。

本版本恢复自完整历史发布包。JavaScript、CSS 和 GLB 保持历史版本内容，HTML 的资源链接仅增加了缓存版本参数。

## 本地运行

在仓库根目录执行：

```bash
python3 -m http.server 8098 --bind 127.0.0.1
```

访问 http://127.0.0.1:8098/ 。无需安装 npm 依赖或构建；浏览器需要联网加载 Three.js 与 Draco 解码器。

## 文件

- `index.html`：页面结构与依赖映射。
- `main.js`：模型加载、解剖信息、渲染和交互。
- `style.css`：旧版界面样式。
- `assets/open3dmodel/`：GLB 模型与署名。

## 版本

新版单独保存在 `Air-Sage/foot-anatomy`，本仓库用于保留旧版，不混入新版 UI 与渲染改造。

## 模型与许可

模型来自 AnatomyTOOL Open3DModel，采用 CC BY-SA 4.0；详见 [模型署名](assets/open3dmodel/ATTRIBUTION.md)。

仅用于交互式学习展示，不用于医学诊断。
