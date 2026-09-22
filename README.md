# Paperwise · 论文整理工作台

这是一个适合发布到 GitHub Pages 的纯静态网页版本。打开后可以直接体验：论文上传、基于文件名的自动分类、搜索、主题筛选、阅读状态、清单导出，以及 QQ 邮箱注册/登录/找回密码界面。

## 当前版本说明

GitHub Pages 只能托管静态前端，因此当前演示版不会把真实密码发送到服务器，也不会实现真正的邮箱验证。账号、论文列表和阅读状态仅保存在浏览器的 `localStorage` 中，适合产品原型和交互验收。

如果要正式上线，需要接入身份与数据服务，例如 Supabase 或 Firebase：

1. 在服务中开启 Email/Password 登录，并限制邮箱域名为 `qq.com`。
2. 用数据库保存用户、论文元数据、分类和阅读状态；用对象存储保存 PDF/Word 文件。
3. 把 `app.js` 中的 `localStorage` 读写替换为服务 SDK 调用，并增加邮箱验证、重置密码和上传大小限制。
4. 不要在 GitHub Pages 的前端代码中写入服务端密钥；只放公开的项目配置。

## 发布到 GitHub Pages

将 `index.html`、`styles.css`、`app.js`、`favicon.svg` 推送到 GitHub 仓库的默认分支，在仓库的 **Settings → Pages** 中选择 **Deploy from a branch**，分支选默认分支、目录选 `/ (root)`，保存后等待 Pages 完成部署即可。

本项目不需要 Node.js、构建命令或环境变量，适合直接从仓库根目录发布。
