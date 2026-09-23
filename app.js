const PAPERWISE_CONFIG = window.PAPERWISE_CONFIG || {};
const SUPABASE_READY = Boolean(window.supabase && PAPERWISE_CONFIG.supabaseUrl && PAPERWISE_CONFIG.supabaseAnonKey);
const cloudClient = SUPABASE_READY ? window.supabase.createClient(PAPERWISE_CONFIG.supabaseUrl, PAPERWISE_CONFIG.supabaseAnonKey) : null;
const LEGACY_MIGRATION_KEY = 'paperwise-local-migration-v2';

const state = {
  papers: [],
  user: null,
  activeCategory: 'all',
  activeView: 'overview',
  selectedPaper: null,
  mode: SUPABASE_READY ? 'cloud' : 'local'
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function safeParse(value, fallback = null) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function showToast(message) {
  $('#toastMessage').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => $('#toast').classList.remove('show'), 3000);
}

function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => modal.querySelector('input')?.focus(), 80);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function initials(name) { return (name || '访').slice(0, 1).toUpperCase(); }
function userKey(email) { return encodeURIComponent((email || 'guest').toLowerCase()); }
function papersKey(email) { return `paperwise-papers:${userKey(email)}`; }
function accountKey(email) { return `paperwise-account:${userKey(email)}`; }

function migrateLegacyData() {
  if (localStorage.getItem(LEGACY_MIGRATION_KEY)) return;
  // The previous release contained bundled sample papers and shared storage.
  // Remove that shared store once so a fresh workspace starts at zero.
  localStorage.removeItem('paperwise-papers');
  localStorage.removeItem('paperwise-user');
  localStorage.removeItem('paperwise-name');
  localStorage.setItem(LEGACY_MIGRATION_KEY, 'done');
}

function loadLocalSession() {
  const savedUser = safeParse(localStorage.getItem('paperwise-session'));
  if (savedUser?.email) {
    state.user = savedUser;
    state.papers = safeParse(localStorage.getItem(papersKey(savedUser.email)), []) || [];
  }
}

function saveLocalSession() {
  if (state.user) {
    localStorage.setItem('paperwise-session', JSON.stringify(state.user));
    localStorage.setItem(papersKey(state.user.email), JSON.stringify(state.papers));
  } else {
    localStorage.removeItem('paperwise-session');
  }
}

function saveLocalPapers() {
  if (state.user) localStorage.setItem(papersKey(state.user.email), JSON.stringify(state.papers));
}

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function validateQQEmail(email) {
  return /^[^\s@]+@qq\.com$/i.test(email);
}

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

function renderMode() {
  const title = $('.sync-card strong');
  const description = $('.sync-card span');
  if (state.mode === 'cloud') {
    title.textContent = '云端同步已开启';
    description.textContent = '账户数据安全同步';
  } else {
    title.textContent = '离线账户模式';
    description.textContent = '配置云端后可跨设备同步';
  }
}

function renderUser() {
  const name = state.user?.name || state.user?.email?.split('@')[0] || '访客';
  const email = state.user?.email || '尚未登录';
  $('#pageTitle').innerHTML = state.user ? `早上好，${name}<span class="heading-dot">.</span>` : `先登录你的研究空间<span class="heading-dot">.</span>`;
  $('#pageSubtitle').textContent = state.user ? '今天也让知识井然有序。' : '注册一个 QQ 邮箱账户，开始管理自己的论文。';
  $('#sidebarName').textContent = name;
  $('#sidebarEmail').textContent = email;
  $('#sidebarAvatar').textContent = initials(name);
  $('#topAvatar').textContent = initials(name);
  $('#logoutButton').hidden = !state.user;
  renderMode();
}

function renderCategories() {
  const select = $('#categoryFilter');
  const categories = [...new Set(state.papers.map(paper => paper.category))];
  select.innerHTML = '<option value="all">全部主题</option>' + categories.map(category => `<option value="${category}">${category}</option>`).join('');
  select.value = categories.includes(state.activeCategory) || state.activeCategory === 'all' ? state.activeCategory : 'all';
  state.activeCategory = select.value;
  $('#categoryCount').textContent = String(categories.length).padStart(2, '0');
}

function renderPapers() {
  const query = $('#searchInput').value.trim().toLowerCase();
  const visible = state.papers.filter(paper => {
    const matchesCategory = state.activeCategory === 'all' || paper.category === state.activeCategory;
    const haystack = `${paper.title} ${paper.category} ${paper.summary}`.toLowerCase();
    return matchesCategory && (!query || haystack.includes(query));
  });
  $('#totalCount').textContent = state.papers.length;
  $('#pendingCount').textContent = state.papers.filter(paper => paper.status === '未开始' || paper.category === '待确认').length;  const readCount = state.papers.filter(paper => paper.status === '已读').length;
  const readingProgress = state.papers.length ? Math.round((readCount / state.papers.length) * 100) : 0;
  $('#readingProgress').innerHTML = `${readingProgress}<span class="unit">%</span>`;
  $('#readingTrend').textContent = state.papers.length ? `${readCount}/${state.papers.length}` : '—';
  $('#readingTrendLabel').textContent = state.papers.length ? '已读论文' : '暂无阅读记录';
  $('.nav-item[data-view="library"] .nav-count').textContent = state.papers.length;
  $('#loadMoreButton').hidden = !state.papers.length;
  if (!visible.length) {
    const copy = state.papers.length ? '没有找到匹配的论文' : '你的文献库还是空的';
    const detail = state.papers.length ? '试试更换关键词或清除筛选条件。' : '上传第一篇论文，Paperwise 会帮你自动归类。';
    $('#paperList').innerHTML = `<div class="empty-state"><div>⌁</div><h3>${copy}</h3><p>${detail}</p>${state.user && !state.papers.length ? '<button class="button button-primary button-small empty-upload">上传第一篇论文</button>' : ''}</div>`;
    $('.empty-upload')?.addEventListener('click', () => $('#fileInput').click());
    return;
  }
  $('#paperList').innerHTML = visible.map(paper => `
    <article class="paper-row" data-paper-id="${paper.id}">
      <div class="paper-file ${paper.type === 'DOC' ? 'doc' : ''}">${paper.type}</div>
      <div class="paper-main"><div class="paper-title" title="${paper.title}">${paper.title}</div><div class="paper-meta"><span class="paper-category ${paper.className}">${paper.category}</span><span>${paper.date}</span></div></div>
      <div class="paper-status ${paper.status === '已读' ? 'read' : ''}">${paper.status}</div><button class="paper-more" aria-label="打开论文详情">•••</button>
    </article>`).join('');
  $$('.paper-row').forEach(row => row.addEventListener('click', () => openPaper(row.dataset.paperId)));
}

function openPaper(id) {
  const paper = state.papers.find(item => String(item.id) === String(id));
  if (!paper) return;
  state.selectedPaper = paper;
  $('#paperModalTitle').textContent = paper.title;
  $('#detailCategory').textContent = paper.category;
  $('#detailDate').textContent = paper.date;
  $('#detailStatus').textContent = paper.status;
  $('#detailSummary').textContent = paper.summary;
  openModal('paperModal');
}

function renderAll() { renderUser(); renderCategories(); renderPapers(); }

async function persistPaper(paper, file) {
  if (state.mode === 'local') {
    state.papers.unshift(paper);
    saveLocalPapers();
    return true;
  }
  const storagePath = `${state.user.id}/${paper.id}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const upload = await cloudClient.storage.from(PAPERWISE_CONFIG.supabaseBucket || 'papers').upload(storagePath, file, { upsert: false });
  if (upload.error) throw upload.error;
  const insert = await cloudClient.from('papers').insert({ id: paper.id, user_id: state.user.id, title: paper.title, category: paper.category, type: paper.type, status: paper.status, summary: paper.summary, file_path: storagePath }).select().single();
  if (insert.error) throw insert.error;
  state.papers.unshift({ ...paper, ...insert.data });
  return true;
}

async function handleFiles(files) {
  if (!state.user) { openModal('authModal'); return showToast('请先登录或注册账户'); }
  const incoming = [...files];
  if (!incoming.length) return;
  $('#uploadStatusText').textContent = '正在整理论文…';
  let completed = 0;
  try {
    for (const [index, file] of incoming.entries()) {
      const category = classifyPaper(file.name);
      const extension = file.name.split('.').pop().toUpperCase();
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
      const paper = { id: `${Date.now()}-${index}`, title: baseName || file.name, category: category.category, type: extension === 'DOC' || extension === 'DOCX' ? 'DOC' : extension === 'TXT' || extension === 'MD' ? 'TXT' : 'PDF', date: '刚刚', status: '未开始', className: category.className, summary: `已根据文件名识别为“${category.category}”。打开论文并补充阅读标注，可让你的研究空间更精准。` };
      await persistPaper(paper, file);
      completed += 1;
    }
    renderCategories(); renderPapers();
    $('#uploadStatusText').textContent = `${completed} 篇论文已完成归档`;
    showToast(`${completed} 篇论文已加入你的文献库`);
  } catch (error) {
    console.error(error);
    if (state.mode === 'cloud') showToast('云端保存失败，请检查 Supabase 配置和数据表');
    else showToast('论文保存失败，请重试');
  } finally {
    setTimeout(() => { $('#uploadStatusText').textContent = state.mode === 'cloud' ? '云端同步已就绪' : '本地整理已就绪'; }, 3500);
  }
}

async function loadCloudPapers() {
  const result = await cloudClient.from('papers').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false });
  if (result.error) throw result.error;
  state.papers = result.data || [];
}

async function loadUserData() {
  if (state.mode === 'cloud') {
    try { await loadCloudPapers(); } catch (error) { console.error(error); showToast('暂时无法读取云端文献，请检查数据库表'); state.papers = []; }
  } else {
    state.papers = safeParse(localStorage.getItem(papersKey(state.user.email)), []) || [];
  }
  renderAll();
}

async function signOut() {
  if (state.mode === 'cloud') await cloudClient.auth.signOut();
  state.user = null; state.papers = []; saveLocalSession(); renderAll(); closeModal('authModal'); showToast('已退出当前账户');
}

async function localRegister(email, password) {
  const key = accountKey(email);
  if (localStorage.getItem(key)) throw new Error('该邮箱已注册，请直接登录');
  const account = { email, passwordHash: await hashPassword(password), name: email.split('@')[0] };
  localStorage.setItem(key, JSON.stringify(account));
  state.user = { id: `local:${userKey(email)}`, email, name: account.name };
  state.papers = [];
  saveLocalSession();
}

async function localLogin(email, password) {
  const account = safeParse(localStorage.getItem(accountKey(email)));
  if (!account || account.passwordHash !== await hashPassword(password)) throw new Error('邮箱或密码不正确');
  state.user = { id: `local:${userKey(email)}`, email, name: account.name };
  state.papers = safeParse(localStorage.getItem(papersKey(email)), []) || [];
  saveLocalSession();
}

function authError(error) {
  const message = error?.message || '操作失败，请稍后重试';
  if (message.includes('already registered')) return '该邮箱已经注册，请直接登录';
  if (message.includes('Invalid login')) return '邮箱或密码不正确';
  if (message.includes('Email not confirmed')) return '请先查收邮件并完成邮箱验证';
  return message;
}

async function register(email, password) {
  if (state.mode === 'cloud') {
    const result = await cloudClient.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
    if (result.error) throw result.error;
    if (!result.data.session) { showToast('注册成功，请先查收 QQ 邮箱完成验证'); return; }
    state.user = { id: result.data.user.id, email: result.data.user.email, name: result.data.user.email.split('@')[0] };
    await loadUserData();
  } else {
    await localRegister(email, password);
    renderAll();
    showToast('账户已创建（当前为本地模式）');
  }
  closeModal('authModal');
}

async function login(email, password) {
  if (state.mode === 'cloud') {
    const result = await cloudClient.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    state.user = { id: result.data.user.id, email: result.data.user.email, name: result.data.user.email.split('@')[0] };
    await loadUserData();
  } else {
    await localLogin(email, password);
    renderAll();
    showToast('登录成功');
  }
  closeModal('authModal');
}

function setupAuth() {
  $$('.auth-tab').forEach(tab => tab.addEventListener('click', () => { $$('.auth-tab').forEach(item => item.classList.toggle('active', item === tab)); $$('.auth-form').forEach(form => form.classList.remove('active')); $(`#${tab.dataset.authTab}Form`).classList.add('active'); }));
  $('#loginForm').addEventListener('submit', async event => { event.preventDefault(); const email = $('#loginEmail').value.trim().toLowerCase(); const password = $('#loginPassword').value; if (!validateQQEmail(email)) return showToast('请输入有效的 QQ 邮箱'); if (password.length < 6) return showToast('密码至少需要 6 位'); try { await login(email, password); } catch (error) { showToast(authError(error)); } });
  $('#registerForm').addEventListener('submit', async event => { event.preventDefault(); const email = $('#registerEmail').value.trim().toLowerCase(); const password = $('#registerPassword').value; if (!validateQQEmail(email)) return showToast('注册请使用 QQ 邮箱'); if (password.length < 6) return showToast('密码至少需要 6 位'); try { await register(email, password); } catch (error) { showToast(authError(error)); } });
  $('#forgotButton').addEventListener('click', () => { $$('.auth-form').forEach(form => form.classList.remove('active')); $('#resetForm').classList.add('active'); $$('.auth-tab').forEach(tab => tab.classList.remove('active')); });
  $('#resetForm').addEventListener('submit', async event => { event.preventDefault(); const email = $('#resetEmail').value.trim().toLowerCase(); if (!validateQQEmail(email)) return showToast('请输入有效的 QQ 邮箱'); if (state.mode === 'cloud') { const result = await cloudClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname }); if (result.error) return showToast(authError(result.error)); } showToast(state.mode === 'cloud' ? '重置邮件已发送，请查收 QQ 邮箱' : '本地模式暂不发送邮件，请直接使用原账户登录'); });
  $('.back-login').addEventListener('click', () => { $$('.auth-form').forEach(form => form.classList.remove('active')); $('#loginForm').classList.add('active'); $('.auth-tab[data-auth-tab="login"]').classList.add('active'); });
  $('#logoutButton').addEventListener('click', signOut);
  $$('.show-password').forEach(button => button.addEventListener('click', () => { const input = document.getElementById(button.dataset.target); input.type = input.type === 'password' ? 'text' : 'password'; button.textContent = input.type === 'password' ? '显示' : '隐藏'; }));
}

function switchView(view) {
  state.activeView = view; $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const labels = { overview: '研究总览', library: '我的文献', categories: '主题分类', reading: '阅读队列' };
  $('#breadcrumbTitle').textContent = labels[view] || '研究总览';
  if (view === 'library') { $('#pageSubtitle').textContent = '所有论文都在这里，按主题快速找到它们。'; showToast('已切换到我的文献'); }
  if (view === 'categories') { $('#pageSubtitle').textContent = '你的知识结构，正在逐渐清晰。'; showToast('已切换到主题分类'); }
  if (view === 'reading') { $('#pageSubtitle').textContent = '把下一篇要读的论文放在手边。'; showToast('已切换到阅读队列'); }
  if (view === 'overview') renderUser();
}

function setupWorkspace() {
  $('#uploadButton').addEventListener('click', () => $('#fileInput').click());
  $('#dropUploadButton').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', event => { handleFiles(event.target.files); event.target.value = ''; });
  const dropZone = $('#dropZone');
  ['dragenter', 'dragover'].forEach(eventName => dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach(eventName => dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.remove('dragging'); }));
  dropZone.addEventListener('drop', event => handleFiles(event.dataTransfer.files));
  $('#searchInput').addEventListener('input', renderPapers);
  $('#categoryFilter').addEventListener('change', event => { state.activeCategory = event.target.value; renderPapers(); });
  $$('.nav-item[data-view]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  $('#loadMoreButton').addEventListener('click', () => showToast('当前已展示全部论文'));
  $('#exportButton').addEventListener('click', () => { if (!state.user || !state.papers.length) return showToast('当前没有可导出的论文'); const text = state.papers.map(paper => `${paper.title}\t${paper.category}\t${paper.status}`).join('\n'); const blob = new Blob([`标题\t分类\t状态\n${text}`], { type: 'text/tab-separated-values;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'paperwise-library.tsv'; link.click(); URL.revokeObjectURL(url); showToast('清单已导出'); });
  $('#profileButton').addEventListener('click', () => openModal('authModal')); $('#topAvatar').addEventListener('click', () => openModal('authModal'));
  $('#reviewPendingButton').addEventListener('click', () => { state.activeCategory = '待确认'; renderCategories(); $('#categoryFilter').value = '待确认'; renderPapers(); showToast('已筛选待确认论文'); });
  $('#exploreTopicButton').addEventListener('click', () => { state.activeCategory = 'AI & ML'; renderCategories(); $('#categoryFilter').value = 'AI & ML'; renderPapers(); showToast('已查看 AI & ML 主题'); });
  $('#notificationsButton').addEventListener('click', () => showToast('暂无新的通知'));
  $$('.nav-item[data-action]').forEach(button => button.addEventListener('click', () => showToast('该设置将在后续版本开放')));
  $$('[data-close-modal]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.closeModal)));
  $$('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => { if (event.target === backdrop) closeModal(backdrop.id); }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') $$('.modal-backdrop.open').forEach(modal => closeModal(modal.id)); if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#searchInput').focus(); } });
  $('#markReadButton').addEventListener('click', async () => { if (!state.selectedPaper) return; state.selectedPaper.status = '已读'; if (state.mode === 'cloud') await cloudClient.from('papers').update({ status: '已读' }).eq('id', state.selectedPaper.id).eq('user_id', state.user.id); else saveLocalPapers(); renderPapers(); $('#detailStatus').textContent = '已读'; closeModal('paperModal'); showToast('已标记为已读'); });
}

async function setupCloudAuth() {
  const session = (await cloudClient.auth.getSession()).data.session;
  if (session?.user) { state.user = { id: session.user.id, email: session.user.email, name: session.user.email.split('@')[0] }; await loadUserData(); }
  else { renderAll(); setTimeout(() => openModal('authModal'), 250); }
  cloudClient.auth.onAuthStateChange(async (_event, sessionState) => { if (!sessionState?.user) return; state.user = { id: sessionState.user.id, email: sessionState.user.email, name: sessionState.user.email.split('@')[0] }; await loadUserData(); });
}

async function setup() {
  migrateLegacyData();
  setupAuth(); setupWorkspace(); renderMode();
  if (state.mode === 'cloud') await setupCloudAuth();
  else { loadLocalSession(); renderAll(); if (!state.user) setTimeout(() => openModal('authModal'), 250); }
}

document.addEventListener('DOMContentLoaded', setup);




