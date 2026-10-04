/* 正文始终在主页面中；交互只负责定位、影像比较与暂停动态。 */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const menu = $('#chapter-menu');
  const summary = menu.querySelector('summary');
  const chapters = $$('main > section[data-number]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const picture = $('.person-photo');
  const focus = [
    {zoom:1,x:'50%',y:'50%'},
    {zoom:1.12,x:'50%',y:'66%'},
    {zoom:1.36,x:'69%',y:'52%'},
    {zoom:1.5,x:'73%',y:'75%'}
  ];
  let lastPerson = -1;
  function closeMenu(returnFocus = false) {
    menu.open = false;
    if (returnFocus) summary.focus();
  }
  menu.addEventListener('toggle', () => summary.setAttribute('aria-expanded',String(menu.open)));
  document.addEventListener('click', e => {
    if (menu.open && !menu.contains(e.target)) closeMenu();
    const link = e.target.closest('a[href^="#"]');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = link.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    closeMenu();
    // 保留原生锚点与浏览器历史，焦点随阅读位置移动。
    requestAnimationFrame(() => {
      if (target.hasAttribute('tabindex')) target.focus({preventScroll:true});
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.open) { e.preventDefault(); closeMenu(true); }
  });

  const handle = $('#compare-handle');
  const range = $('#compare-range');
  const image = $('#compare');
  function compare(value) {
    value = Math.round(Math.max(0,Math.min(100,Number(value))));
    image.style.setProperty('--split',value+'%');
    range.value = value;
    const text = value === 0 ? '显示2020年影像' : value === 100 ? '显示1989年影像' : '左侧1989年，右侧2020年，分界位于'+value+'%';
    handle.setAttribute('aria-valuenow',String(value));
    handle.setAttribute('aria-valuetext',text);
    range.setAttribute('aria-valuetext',text);
    $$('[data-compare]').forEach(b => b.setAttribute('aria-pressed',String(Number(b.dataset.compare) === value)));
  }
  range.addEventListener('input',e => compare(e.target.value));
  $$('[data-compare]').forEach(b => b.addEventListener('click',() => compare(b.dataset.compare)));
  let pointer = null;
  handle.addEventListener('pointerdown',e => {
    if (e.button !== 0) return;
    pointer = {id:e.pointerId,x:e.clientX,y:e.clientY};
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove',e => {
    if (!pointer || pointer.id !== e.pointerId) return;
    // 允许手机继续纵向滑动；横向动作才改变分界。
    if (e.pointerType === 'touch' && Math.abs(e.clientX-pointer.x) <= Math.abs(e.clientY-pointer.y)) return;
    const rect = image.getBoundingClientRect();
    compare((e.clientX-rect.left)/rect.width*100);
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => handle.addEventListener(type,() => { pointer = null; }));
  handle.addEventListener('keydown',e => {
    const current = Number(range.value);
    const values = {ArrowLeft:current-5,ArrowRight:current+5,Home:0,End:100,PageDown:current-10,PageUp:current+10};
    if (!(e.key in values)) return;
    e.preventDefault();
    compare(values[e.key]);
  });
  compare(50);

  $('#quiet-button').addEventListener('click',e => {
    const quiet = $('#attention').classList.toggle('quiet');
    e.currentTarget.setAttribute('aria-pressed',String(quiet));
    e.currentTarget.innerHTML = quiet ? '继续连接<span aria-hidden="true">▷</span>' : '留出一刻<span aria-hidden="true">Ⅱ</span>';
    $('#quiet-response').innerHTML = quiet ? '此刻，注意力回到这里。' : '什么可以交给工具？<br>什么仍需自己判断？';
  });

  let queued = false;
  function update() {
    queued = false;
    const reference = Math.min(innerHeight*.4,Math.max(140,innerHeight-100));
    let active = chapters[0];
    for (const chapter of chapters) if (chapter.getBoundingClientRect().top <= reference) active = chapter;
    $('#current-room').textContent = active.dataset.number+' / '+active.dataset.label;
    $$('[data-room],#exhibition-nav a').forEach(a => {
      const on = a.getAttribute('href') === '#'+active.id;
      if (on) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current');
    });
    const fraction = Math.max(0,Math.min(1,scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)));
    $('#progress').style.transform = 'scaleX('+fraction+')';
    document.body.classList.toggle('has-scrolled',scrollY > innerHeight*.65);
    $$('.section-links').forEach(nav => {
      const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
      let selected = links[0];
      for (const a of links) {
        const target = document.getElementById(a.getAttribute('href').slice(1));
        if (target && target.getBoundingClientRect().top <= reference) selected = a;
      }
      links.forEach(a => {
        if (a === selected) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current');
      });
    });
    const selected = $('.person-visual a[aria-current]');
    const index = selected ? Number(selected.dataset.person) : 0;
    if (lastPerson !== index) {
      lastPerson = index;
      const d = focus[index];
      picture.style.setProperty('--zoom',reduce.matches ? 1 : d.zoom);
      picture.style.setProperty('--focus-x',d.x);
      picture.style.setProperty('--focus-y',d.y);
    }
  }
  function schedule() {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  window.addEventListener('hashchange',schedule);
  window.addEventListener('pageshow',schedule);
  reduce.addEventListener('change',() => { lastPerson = -1; schedule(); });
  new ResizeObserver(schedule).observe(document.body);
  update();
})();
