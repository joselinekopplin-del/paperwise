const seedPapers = [
  { id: 1, title: 'Retrieval-Augmented Generation: A Survey', category: 'AI & ML', type: 'PDF', date: '今天 09:18', status: '未开始', className: 'ai', summary: '系统从标题与关键词中识别出检索增强生成、语言模型与知识库等主题。' },
  { id: 2, title: 'Transformer-Based Models for Medical Imaging', category: '生命科学', type: 'PDF', date: '昨天 16:42', status: '阅读中', className: 'life', summary: '聚焦 Transformer 架构在医学影像分割与诊断任务中的表现。' },
  { id: 3, title: 'Climate Policy and Carbon Markets in East Asia', category: '气候与环境', type: 'DOC', date: '昨天 11:06', status: '已读', className: 'social', summary: '讨论东亚地区气候政策协同与碳市场机制的长期影响。' },
  { id: 4, title: 'Causal Inference in Education Research', category: '社会科学', type: 'PDF', date: '周一 14:27', status: '已读', className: 'social', summary: '梳理教育研究中常见的因果推断设计、假设与实践边界。' },
  { id: 5, title: 'Multimodal Agents for Scientific Discovery', category: 'AI & ML', type: 'PDF', date: '周一 10:51', status: '未开始', className: 'ai', summary: '研究多模态智能体如何辅助实验设计、检索与科学发现。' }
];

const state = {
  papers: JSON.parse(localStorage.getItem('paperwise-papers') || 'null') || seedPapers,
  user: JSON.parse(localStorage.getItem('paperwise-user') || 'null') || { name: '林安', email: 'demo@qq.com' },
  activeCategory: 'all',
  activeView: 'overview',
  selectedPaper: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function saveState() { localStorage.setItem('paperwise-papers', JSON.stringify(state.papers)); localStorage.setItem('paperwise-user', JSON.stringify(state.user)); }
function initials(name) { return (name || '林').slice(0, 1).toUpperCase(); }
function showToast(message) { $('#toastMessage').textContent = message; $('#toast').classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => $('#toast').classList.remove('show'), 2600); }
function openModal(id) { const modal = document.getElementById(id); modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); setTimeout(() => modal.querySelector('input')?.focus(), 80); }
function closeModal(id) { const modal = document.getElementById(id); modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }

function classifyPaper(name, text = '') {
  const source = `${name} ${text}`.toLowerCase();
  const rules = [
    { category: 'AI & ML', className: 'ai', words: ['ai', 'ml', 'machine', 'learning', 'transformer', 'neural', 'agent', 'model', 'language', 'retrieval', '人工智能', '机器学习', '模型'] },
    { category: '生命科学', className: 'life', words: ['medical', 'health', 'gene', 'biology', 'clinical', 'imaging', '医学', '生命', '生物', '基因'] },
    { category: '气候与环境', className: 'social', words: ['climate', 'carbon', 'environment', 'energy', 'policy', '生态', '气候', '碳', '环境'] },
    { category: '社会科学', className: 'social', words: ['education', 'society', 'econom', 'social', 'culture', 'causal', '教育', '社会', '经济', '因果'] }
  ];
  return rules.find(rule => rule.words.some(word => source.includes(word))) || { category: '待确认', className: '' };
}

function renderCategories() {
  const select = $('#categoryFilter');
  const categories = [...new Set(state.papers.map(paper => paper.category))];
  select.innerHTML = '<option value="all">全部主题</option>' + categories.map(category => `<option value="${category}">${category}</option>`).join('');
  select.value = state.activeCategory;
  $('#categoryCount').textContent = String(Math.max(6, categories.length)).padStart(2, '0');
}

function renderPapers() {
  const query = $('#searchInput').value.trim().toLowerCase();
  const visible = state.papers.filter(paper => {
    const matchesCategory = state.activeCategory === 'all' || paper.category === state.activeCategory;
    const haystack = `${paper.title} ${paper.category} ${paper.summary}`.toLowerCase();
    return matchesCategory && (!query || haystack.includes(query));
  });
  $('#totalCount').textContent = 19 + state.papers.length;
  $('#pendingCount').textContent = String(Math.max(3, state.papers.filter(paper => paper.status === '未开始' || paper.category === '待确认').length)).padStart(2, '0');
  $('#paperList').innerHTML = visible.length ? visible.map(paper => `
    <article class="paper-row" data-paper-id="${paper.id}">
      <div class="paper-file ${paper.type === 'DOC' ? 'doc' : ''}">${paper.type}</div>
      <div class="paper-main"><div class="paper-title" title="${paper.title}">${paper.title}</div><div class="paper-meta"><span class="paper-category ${paper.className}">${paper.category}</span><span>${paper.date}</span></div></div>
      <div class="paper-status ${paper.status === '已读' ? 'read' : ''}">${paper.status}</div><button class="paper-more" aria-label="打开论文详情">•••</button>
    </article>`).join('') : '<div class="empty-state"><div>⌕</div><h3>没有找到匹配的论文</h3><p>试试更换关键词或清除筛选条件。</p></div>';
  $$('.paper-row').forEach(row => row.addEventListener('click', (event) => { if (event.target.closest('.paper-more') || event.currentTarget) openPaper(Number(row.dataset.paperId)); }));
}

function renderUser() { const name = state.user.name || state.user.email.split('@')[0]; $('#pageTitle').innerHTML = `早上好，${name}<span class="heading-dot">.</span>`; $('#sidebarName').textContent = name; $('#sidebarEmail').textContent = state.user.email; $('#sidebarAvatar').textContent = initials(name); $('#topAvatar').textContent = initials(name); }

function openPaper(id) { const paper = state.papers.find(item => item.id === id); if (!paper) return; state.selectedPaper = paper; $('#paperModalTitle').textContent = paper.title; $('#detailCategory').textContent = paper.category; $('#detailDate').textContent = paper.date; $('#detailStatus').textContent = paper.status; $('#detailSummary').textContent = paper.summary; openModal('paperModal'); }

function handleFiles(files) {
  const incoming = [...files]; if (!incoming.length) return;
  incoming.forEach((file, index) => {
    const category = classifyPaper(file.name);
    const extension = file.name.split('.').pop().toUpperCase();
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    state.papers.unshift({ id: Date.now() + index, title: baseName || file.name, category: category.category, type: extension === 'DOC' || extension === 'DOCX' ? 'DOC' : extension === 'TXT' || extension === 'MD' ? 'TXT' : 'PDF', date: '刚刚', status: '未开始', className: category.className, summary: `已根据文件名识别为“${category.category}”。打开论文并补充阅读标注，可让你的研究空间更精准。` });
  });
  saveState(); renderCategories(); renderPapers(); $('#uploadStatusText').textContent = `${incoming.length} 篇论文已完成归档`; showToast(`${incoming.length} 篇论文已加入你的文献库`); setTimeout(() => { $('#uploadStatusText').textContent = '智能归档已就绪'; }, 3200);
}

function switchView(view) {
  state.activeView = view; $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const labels = { overview: '研究总览', library: '我的文献', categories: '主题分类', reading: '阅读队列' };
  $('#breadcrumbTitle').textContent = labels[view] || '研究总览';
  if (view === 'library') { $('#pageSubtitle').textContent = '所有论文都在这里，按主题快速找到它们。'; showToast('已切换到我的文献'); }
  if (view === 'categories') { $('#pageSubtitle').textContent = '你的知识结构，正在逐渐清晰。'; showToast('已切换到主题分类'); }
  if (view === 'reading') { $('#pageSubtitle').textContent = '把下一篇要读的论文放在手边。'; showToast('已切换到阅读队列'); }
  if (view === 'overview') { $('#pageSubtitle').textContent = '今天也让知识井然有序。'; }
}

function setupAuth() {
  $$('.auth-tab').forEach(tab => tab.addEventListener('click', () => { $$('.auth-tab').forEach(item => item.classList.toggle('active', item === tab)); $$('.auth-form').forEach(form => form.classList.remove('active')); $(`#${tab.dataset.authTab}Form`).classList.add('active'); }));
  $('#loginForm').addEventListener('submit', event => { event.preventDefault(); const email = $('#loginEmail').value.trim(); if (!email.endsWith('@qq.com')) return showToast('请输入有效的 QQ 邮箱'); state.user = { email, name: localStorage.getItem('paperwise-name') || email.split('@')[0] }; saveState(); renderUser(); closeModal('authModal'); showToast('登录成功，欢迎回来'); });
  $('#registerForm').addEventListener('submit', event => { event.preventDefault(); const email = $('#registerEmail').value.trim(); if (!email.endsWith('@qq.com')) return showToast('注册请使用 QQ 邮箱'); state.user = { email, name: email.split('@')[0] }; localStorage.setItem('paperwise-name', state.user.name); saveState(); renderUser(); closeModal('authModal'); showToast('研究空间已创建'); });
  $('#forgotButton').addEventListener('click', () => { $$('.auth-form').forEach(form => form.classList.remove('active')); $('#resetForm').classList.add('active'); $$('.auth-tab').forEach(tab => tab.classList.remove('active')); });
  $('#resetForm').addEventListener('submit', event => { event.preventDefault(); showToast('演示模式：重置邮件流程已触发'); });
  $('.back-login').addEventListener('click', () => { $$('.auth-form').forEach(form => form.classList.remove('active')); $('#loginForm').classList.add('active'); $('.auth-tab[data-auth-tab="login"]').classList.add('active'); });
  $$('.show-password').forEach(button => button.addEventListener('click', () => { const input = document.getElementById(button.dataset.target); input.type = input.type === 'password' ? 'text' : 'password'; button.textContent = input.type === 'password' ? '显示' : '隐藏'; }));
}

function setup() {
  renderUser(); renderCategories(); renderPapers(); setupAuth();
  $('#uploadButton').addEventListener('click', () => $('#fileInput').click()); $('#dropUploadButton').addEventListener('click', () => $('#fileInput').click()); $('#fileInput').addEventListener('change', event => handleFiles(event.target.files));
  const dropZone = $('#dropZone'); ['dragenter', 'dragover'].forEach(eventName => dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.add('dragging'); })); ['dragleave', 'drop'].forEach(eventName => dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.remove('dragging'); })); dropZone.addEventListener('drop', event => handleFiles(event.dataTransfer.files));
  $('#searchInput').addEventListener('input', renderPapers); $('#categoryFilter').addEventListener('change', event => { state.activeCategory = event.target.value; renderPapers(); });
  $$('.nav-item[data-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view))); $('#uploadButton').addEventListener('click', () => showToast('请选择要整理的论文文件')); $('#loadMoreButton').addEventListener('click', () => showToast('演示版已展示最近 5 篇论文')); $('#exportButton').addEventListener('click', () => { const text = state.papers.map(paper => `${paper.title}\t${paper.category}\t${paper.status}`).join('\n'); const blob = new Blob([`标题\t分类\t状态\n${text}`], { type: 'text/tab-separated-values;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'paperwise-library.tsv'; link.click(); URL.revokeObjectURL(url); showToast('清单已导出'); });
  $('#profileButton').addEventListener('click', () => openModal('authModal')); $('#topAvatar').addEventListener('click', () => openModal('authModal')); $('#reviewPendingButton').addEventListener('click', () => { state.activeCategory = '待确认'; $('#categoryFilter').value = '待确认'; renderPapers(); showToast('已筛选待确认论文'); }); $('#exploreTopicButton').addEventListener('click', () => { state.activeCategory = 'AI & ML'; $('#categoryFilter').value = 'AI & ML'; renderPapers(); showToast('已查看 AI & ML 主题'); }); $('#notificationsButton').addEventListener('click', () => showToast('暂无新的通知')); $$('.nav-item[data-action]').forEach(button => button.addEventListener('click', () => showToast('该设置将在后续版本开放')));
  $$('[data-close-modal]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.closeModal))); $$('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => { if (event.target === backdrop) closeModal(backdrop.id); })); document.addEventListener('keydown', event => { if (event.key === 'Escape') $$('.modal-backdrop.open').forEach(modal => closeModal(modal.id)); if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#searchInput').focus(); } });
  $('#markReadButton').addEventListener('click', () => { if (!state.selectedPaper) return; state.selectedPaper.status = '已读'; saveState(); renderPapers(); $('#detailStatus').textContent = '已读'; closeModal('paperModal'); showToast('已标记为已读'); });
}

document.addEventListener('DOMContentLoaded', setup);
