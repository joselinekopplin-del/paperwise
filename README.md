# Paperwise · 论文整理工作台

Paperwise 是一个适合小范围朋友使用的论文整理网页：每个人使用自己的 QQ 邮箱注册和登录，登录后只看到自己的论文。

## 当前能力

- QQ 邮箱注册、登录、退出和找回密码流程
- 上传 PDF、Word、TXT、Markdown 文件
- 基于文件名关键词的自动主题分类
- 搜索、筛选、阅读状态和清单导出
- 空库默认从 0 开始，不再放置演示论文
- 默认字号已整体放大，适合长时间阅读
- 没有云端配置时，同一设备不同账户也会各自隔离数据

## 开启朋友之间的跨设备账户

GitHub Pages 只能托管网页，不能安全保存密码和论文文件。要让朋友在不同设备登录并同步论文，需要接入 Supabase：

1. 创建一个 Supabase 项目。
2. 打开 SQL Editor，把本目录的 `supabase-schema.sql` 全部执行一次。
3. 在 Supabase Authentication → Providers → Email 中开启邮箱密码登录。
4. 将项目的 URL 和 Publishable key 填入 `config.js` 的 `supabaseUrl` 和 `supabasePublishableKey`。旧项目如果只有 anon key，也可以填入 `supabaseAnonKey`。
5. 重新提交并推送 `config.js`。anon public key 可以出现在网页中，数据库和文件安全依靠上面的 RLS 策略。
6. 在 Supabase 的邮件设置中配置正式发信服务，QQ 邮箱验证和找回密码才会真正发送邮件。

没有填写 `config.js` 时，网页会自动使用“离线账户模式”：密码只保存为浏览器端哈希值，账户和论文只存在当前设备，适合先体验，不适合多人正式使用。

## GitHub Pages

这是纯静态网页，不需要 Node.js 或构建命令。将根目录发布到 GitHub Pages 即可。当前仓库地址：

https://github.com/joselinekopplin-del/paperwise

