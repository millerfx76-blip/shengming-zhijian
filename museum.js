/* 正文始终在主页面中；照片在阅读中停留，并随四种联系逐步靠近。 */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const menu = $('#chapter-menu');
  const summary = menu.querySelector('summary');
  const chapters = $$('main > section[data-number]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = $('#entrance');
  const field = $('#life-field');
  const ctx = field.getContext('2d');
  const motionButton = $('#motion-button');
  let motionPaused = reduce.matches;
  let heroVisible = true, fieldFrame = 0, fieldWidth = 0, fieldHeight = 0, fieldTime = 0;
  let pointerX = 0, pointerY = 0, smoothX = 0, smoothY = 0, lastDraw = 0;
  const lenses = {
    nature:{index:0,note:'每一次呼吸，都与更古老的世界相连。'},
    social:{index:1,note:'吃、喝、劳动、照料，共同生活在这些行动中形成。'},
    self:{index:2,note:'同一段历史，落在不同的一生里。'}
  };
  function sizeField() {
    const rect = hero.getBoundingClientRect();
    fieldWidth = rect.width; fieldHeight = rect.height;
    const ratio = Math.min(1.5,devicePixelRatio || 1);
    const width = Math.round(fieldWidth*ratio), height = Math.round(fieldHeight*ratio);
    if (field.width !== width || field.height !== height) { field.width = width; field.height = height; }
    if (ctx) ctx.setTransform(ratio,0,0,ratio,0,0);
  }
  // 三条线是策展的关系隐喻，不是轨道或观测数据。
  function drawField() {
    if (!ctx) return;
    ctx.clearRect(0,0,fieldWidth,fieldHeight);
    const mobile = fieldWidth <= 600;
    const colours = ['#d8ef85','#92b6cf','#dba787'];
    const selected = lenses[hero.dataset.lens].index;
    const cx = fieldWidth*(mobile ? (selected ? .66 : .52) : (selected ? .79 : .61)) + smoothX;
    const cy = fieldHeight*(selected ? .48 : (mobile ? .27 : .35)) + smoothY;
    const radius = Math.min(fieldWidth*(mobile ? .44 : .22),fieldHeight*.35)*(selected===2 ? .72 : 1);
    for (let ring=0;ring<3;ring++) {
      const angle = [-.25,.65,1.7][ring];
      const cos = Math.cos(angle), sin = Math.sin(angle);
      ctx.beginPath();
      for (let n=0;n<=180;n++) {
        const t = n/180*Math.PI*2;
        const x = Math.cos(t)*radius;
        const y = Math.sin(t)*radius*.47;
        const px = cx+x*cos-y*sin, py=cy+x*sin+y*cos;
        if (!n) ctx.moveTo(px,py); else ctx.lineTo(px,py);
      }
      ctx.strokeStyle = colours[ring];
      ctx.globalAlpha = ring === selected ? .44 : .14;
      ctx.lineWidth = ring === selected ? 1 : .6;
      ctx.stroke();
      for (let dot=0;dot<5;dot++) {
        const t = fieldTime*(ring===1 ? -.09 : .07) + dot/5*Math.PI*2 + ring;
        const x=Math.cos(t)*radius,y=Math.sin(t)*radius*.47;
        ctx.beginPath();
        ctx.arc(cx+x*cos-y*sin,cy+x*sin+y*cos,ring===selected && dot===0 ? 3 : 1.1,0,Math.PI*2);
        ctx.fillStyle=colours[ring];ctx.globalAlpha=ring===selected ? .8 : .25;ctx.fill();
      }
    }
    ctx.globalAlpha=1;
  }
  function fieldTick(timestamp) {
    fieldFrame = 0;
    if (document.hidden || !heroVisible || motionPaused) return;
    if (timestamp-lastDraw >= 32) {
      const delta = Math.min(.05,(timestamp-lastDraw)/1000);
      lastDraw=timestamp; fieldTime+=delta;
      smoothX+=(pointerX-smoothX)*.08; smoothY+=(pointerY-smoothY)*.08;
      drawField();
    }
    fieldFrame=requestAnimationFrame(fieldTick);
  }
  function syncField() {
    if (fieldFrame) cancelAnimationFrame(fieldFrame);
    fieldFrame=0; drawField();
    if (ctx && heroVisible && !document.hidden && !motionPaused) { lastDraw=performance.now();fieldFrame=requestAnimationFrame(fieldTick); }
  }
  function syncMotion() {
    document.body.classList.toggle('motion-paused',motionPaused);
    motionButton.setAttribute('aria-pressed',String(motionPaused));
    const label = motionPaused ? '继续展览动态' : '暂停展览动态';
    motionButton.setAttribute('aria-label',label); motionButton.title=label;
    motionButton.querySelector('path').setAttribute('d',motionPaused ? 'M9 5L19 12L9 19Z' : 'M9 5V19M15 5V19');
    syncField(); schedule();
  }
  motionButton.addEventListener('click',() => { motionPaused=!motionPaused;syncMotion(); });
  $$('[data-life-lens]').forEach(button => button.addEventListener('click',() => {
    hero.dataset.lens=button.dataset.lifeLens;
    $('#hero-lens-note').textContent=lenses[button.dataset.lifeLens].note;
    const human=$('#hero-human'),nature=button.dataset.lifeLens==='nature';
    if (!nature && !human.hasAttribute('src')) human.src=human.dataset.src;
    human.setAttribute('aria-hidden',String(nature));
    $('.earthrise').setAttribute('aria-hidden',String(!nature));
    $('#hero-credit').textContent=nature ? 'Earthrise · William Anders / NASA · 1968' : 'Lewis Hine · 1920 · NARA';
    $$('[data-life-lens]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    drawField();
  }));
  if (matchMedia('(pointer:fine)').matches) {
    hero.addEventListener('pointermove',e => {
      const rect=hero.getBoundingClientRect();
      pointerX=(e.clientX/rect.width-.5)*22; pointerY=((e.clientY-rect.top)/rect.height-.5)*18;
    },{passive:true});
    hero.addEventListener('pointerleave',()=>{pointerX=0;pointerY=0;});
  }
  new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;syncField();},{threshold:0}).observe(hero);
  document.addEventListener('visibilitychange',syncField);
  window.addEventListener('resize',()=>{sizeField();syncField();});
  sizeField();
  const picture = $('.person-photo');
  const personLayout = $('.person-layout');
  const focus = [
    {zoom:1,x:'50%',y:'50%'},
    {zoom:1.12,x:'50%',y:'66%'},
    {zoom:1.55,x:'69%',y:'52%'},
    {zoom:1.7,x:'73%',y:'75%'}
  ];
  let lastPerson = -1;
  const deltaStation = $('.delta-station');
  const deltaLayout = $('.delta-layout');
  const timeStage = $('.time-stage');
  const timeLayout = $('.time-layout');
  const deltaViews = {
    overview:{zoom:1,x:.5,y:.5,label:'同一区域 / 全景'},
    mouth:{zoom:2.4,x:.8,y:.36,label:'01 / 河口 · 局部对照'},
    shore:{zoom:2.6,x:.42,y:.10,label:'02 / 海岸 · 局部对照'},
    ponds:{zoom:3,x:.16,y:.15,label:'03 / 池塘 · 局部对照'}
  };
  let deltaView = 'overview', lastDeltaStory = '', deltaOverview = false, deltaGeometry = '';
  function renderDelta() {
    const rect = $('#compare').getBoundingClientRect();
    const geometry = [rect.width,rect.height,deltaView].join('/');
    if (!rect.width || !rect.height || geometry === deltaGeometry) return;
    deltaGeometry = geometry;
    const d = deltaViews[deltaView];
    const scale = Math.min(rect.width/4019,rect.height/4469)*d.zoom;
    const width = 4019*scale, height = 4469*scale;
    const left = width <= rect.width ? (rect.width-width)/2 : Math.max(rect.width-width,Math.min(0,rect.width/2-width*d.x));
    const top = height <= rect.height ? (rect.height-height)/2 : Math.max(rect.height-height,Math.min(0,rect.height/2-height*d.y));
    const canvas = $('#compare');
    for (const [key,value] of Object.entries({'--map-width':width,'--map-height':height,'--map-left':left,'--map-top':top})) canvas.style.setProperty(key,value+'px');
  }
  function setDeltaView(key) {
    deltaView = key;
    $('#compare').dataset.view = key;
    $('#delta-focus-label').textContent = deltaViews[key].label;
    $('#delta-overview').setAttribute('aria-pressed',String(key === 'overview'));
    renderDelta();
  }
  $('#delta-overview').addEventListener('click',() => { deltaOverview = true; setDeltaView('overview'); });
  $$('[data-delta]').forEach(a => a.addEventListener('click',() => { deltaOverview = false; setDeltaView(a.dataset.delta); }));
  setDeltaView('overview');

  $$('[data-art-view]').forEach(button => button.addEventListener('click',() => {
    const art = button.closest('.idea-art');
    art.dataset.artView = button.dataset.artView;
    Array.from(art.querySelectorAll('button')).forEach(b => b.setAttribute('aria-pressed',String(b === button)));
  }));

  const atlasCases = {
    meal:{label:'一顿饭',icon:'food',nodes:['土地与食物','检验与健康','营养与知识','生产与分配'],notes:['沿着土地、劳动与运输，看食物怎样进入餐桌。','沿着检验、卫生与制度，看食物安全怎样得到保障。','沿着经验与知识，看什么被认作营养或有害。','沿着土地、水与分配，看谁获得食物，谁承担短缺。']},
    illness:{label:'一次疾病',icon:'defense',nodes:['生活与照料','治疗与防疫','病因与经验','家庭与劳动'],notes:['沿着食物、饮水与居住，看患病期间的生活怎样维持。','沿着医疗、护理与防疫，看谁能获得生命保护。','沿着经验和医学知识，看人们怎样解释疾病与风险。','沿着家庭、劳动与公共生活，看疾病怎样改变共同的安排。']},
    message:{label:'一条推送',icon:'message',nodes:['设备与能源','身体与休息','筛选与认识','平台与注意力'],notes:['沿着设备、能源与材料，看信息抵达屏幕需要什么。','沿着休息与健康，看持续连接怎样进入身体的生活。','沿着筛选与传播，看哪些信息被看见，哪些被忽略。','沿着平台规则与使用习惯，看注意力怎样被组织。']}
  };
  const atlasSystems = ['support','defense','knowledge','order'];
  let atlasCase = 'meal', atlasSystem = 'support';
  function updateAtlas() {
    const d = atlasCases[atlasCase];
    $('#atlas-case-label').textContent = d.label;
    $('#atlas-icon').setAttribute('href','#icon-'+d.icon);
    atlasSystems.forEach((key,index) => { $('#atlas-'+key).textContent = d.nodes[index]; });
    $('#atlas-description').textContent = d.notes[atlasSystems.indexOf(atlasSystem)];
    $$('[data-atlas-case]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.atlasCase === atlasCase)));
    $$('[data-atlas-system]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.atlasSystem === atlasSystem)));
    $$('[data-atlas-path]').forEach(p => p.classList.toggle('active',p.dataset.atlasPath === atlasSystem));
    $$('[data-system-story]').forEach(p => p.classList.toggle('active',p.dataset.systemStory === atlasSystem));
    const trailStart = {support:['body','身体的需要'],defense:['social','生活的保障'],knowledge:['idea-ecology','怎样认识环境'],order:['social','共同的生活']}[atlasSystem];
    const trailMiddle = {
      meal:{support:['delta','土地的改变'],defense:['body','身体的耐受'],knowledge:['idea-marx','生活与实践'],order:['river-ponds','生产的安排']},
      illness:{support:['case-meal','一顿饭的支撑'],defense:['body','身体的耐受'],knowledge:['idea-history','走近具体的人'],order:['self','个人的经历']},
      message:{support:['tools','工具与材料'],defense:['attention','沉思的空间'],knowledge:['attention','看见与判断'],order:['tools','人与技术']}
    }[atlasCase][atlasSystem];
    const last = {meal:['case-meal','回到这顿饭'],illness:['case-illness','回到这次疾病'],message:['case-message','回到这条推送']}[atlasCase];
    $('#atlas-trail').innerHTML=[trailStart,trailMiddle,last].map(([id,label],i)=>'<a href="#'+id+'"><span>0'+(i+1)+'</span>'+label+'<i aria-hidden="true">↗</i></a>').join('');
  }
  $$('[data-atlas-case]').forEach(b => b.addEventListener('click',() => { atlasCase = b.dataset.atlasCase; updateAtlas(); }));
  $$('[data-atlas-system]').forEach(b => b.addEventListener('click',() => { atlasSystem = b.dataset.atlasSystem; updateAtlas(); }));
  updateAtlas();
  function closeMenu(returnFocus = false) {
    menu.open = false;
    document.body.classList.remove('menu-open');
    $('main').inert = false;
    if (returnFocus) summary.focus();
  }
  menu.addEventListener('toggle', () => { summary.setAttribute('aria-expanded',String(menu.open));document.body.classList.toggle('menu-open',menu.open);$('main').inert=menu.open; });
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
    const narrowPerson = getComputedStyle($('.person-visual')).display === 'contents';
    const pictureRect = picture.getBoundingClientRect();
    const stickySpace = narrowPerson ? pictureRect.height : 0;
    personLayout.style.setProperty('--person-sticky-space',stickySpace+'px');
    const personReference = narrowPerson && pictureRect.top >= 0 && pictureRect.top < innerHeight
      ? Math.min(innerHeight-40,Math.max(reference,pictureRect.bottom+Math.min(100,Math.max(80,(innerHeight-pictureRect.bottom)*.2))))
      : reference;
    const timePinned = getComputedStyle(timeStage).position === 'sticky';
    const timeRect = timeStage.getBoundingClientRect();
    timeLayout.style.setProperty('--time-sticky-space',(timePinned ? timeRect.height : 0)+'px');
    const timeReference = timePinned && timeRect.top >= 0 && timeRect.top < innerHeight
      ? Math.min(innerHeight-40,Math.max(reference,timeRect.bottom+80)) : reference;
    const deltaPinned = getComputedStyle(deltaStation).position === 'sticky';
    const deltaRect = deltaStation.getBoundingClientRect();
    deltaLayout.style.setProperty('--delta-sticky-space',(deltaPinned ? deltaRect.height : 0)+'px');
    const deltaReference = deltaPinned && deltaRect.top >= 0 && deltaRect.top < innerHeight
      ? Math.min(innerHeight-40,Math.max(reference,deltaRect.bottom+80)) : reference;
    // 最后一段较短时，图像仍要完整陪伴它，随后才退出展厅。
    for (const [storiesSelector,visualSelector,pinnedElement] of [
      ['.person-stories','.person-visual',picture],
      ['.time-stories','.time-figure',timeStage],
      ['.delta-stories','.delta-visual',deltaStation]
    ]) {
      const stories = $(storiesSelector), visual = $(visualSelector);
      const visualHeight = getComputedStyle(visual).display === 'contents' ? pinnedElement.getBoundingClientRect().height : visual.getBoundingClientRect().height;
      const lastStory = stories.lastElementChild.getBoundingClientRect().height;
      stories.style.setProperty('--visual-tail-space',Math.max(0,visualHeight-lastStory+12)+'px');
    }
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
    document.body.classList.toggle('paper-scene',$$('.light,#idea-sheng,#idea-marx,.conversation').some(section=>{const rect=section.getBoundingClientRect();return rect.top<=reference && rect.bottom>reference;}));
    $$('.section-links').forEach(nav => {
      const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
      let selected = links[0];
      for (const a of links) {
        const target = document.getElementById(a.getAttribute('href').slice(1));
        const readingLine = nav.closest('.person-visual') ? personReference : nav.closest('.time-figure') ? timeReference : nav.closest('.delta-visual') ? deltaReference : reference;
        if (target && target.getBoundingClientRect().top <= readingLine) selected = a;
      }
      links.forEach(a => {
        if (a === selected) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current');
      });
    });
    const clock = $('.time-figure a[aria-current]');
    const clockKey = clock?.dataset.clock || 'earth';
    $('.time-figure').dataset.clock = clockKey;
    $('#clock-focus').textContent = {earth:'地球',social:'社会',self:'一生'}[clockKey];
    const deltaLink = $('.delta-visual a[aria-current]');
    const deltaKey = deltaLink?.dataset.delta || 'mouth';
    if (lastDeltaStory !== deltaKey) { lastDeltaStory = deltaKey; deltaOverview = false; }
    const deltaBounds = deltaLayout.getBoundingClientRect();
    const mouthVisible = $('#river-mouth').getBoundingClientRect().top <= deltaReference;
    if (deltaBounds.top < innerHeight && deltaBounds.bottom > 0 && mouthVisible && !deltaOverview) setDeltaView(deltaKey);
    renderDelta();
    const selected = $('.person-visual a[aria-current]');
    const index = selected ? Number(selected.dataset.person) : 0;
    if (lastPerson !== index) {
      lastPerson = index;
      $('#person-lens-label').textContent='观察 / '+['身体','共同生活','我的一生','工具'][index];
      const d = focus[index];
      picture.style.setProperty('--zoom',reduce.matches ? 1 : d.zoom);
      picture.style.setProperty('--focus-x',d.x);
      picture.style.setProperty('--focus-y',d.y);
    }
    $$('.idea-art').forEach(art=>{
      const bounds=art.getBoundingClientRect();
      if (bounds.bottom<0 || bounds.top>innerHeight) return;
      const progress=Math.max(0,Math.min(1,(innerHeight-bounds.top)/(innerHeight+bounds.height)));
      art.style.setProperty('--art-drift',(motionPaused || reduce.matches ? 0 : (progress-.5)*24)+'px');
      art.style.setProperty('--art-controls-inset',Math.min(Math.max(16,bounds.height-64),Math.max(24,bounds.bottom-innerHeight+24))+'px');
    });
  }
  function schedule() {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  window.addEventListener('hashchange',schedule);
  window.addEventListener('pageshow',schedule);
  reduce.addEventListener('change',() => { lastPerson = -1;motionPaused=reduce.matches;syncMotion();schedule(); });
  new ResizeObserver(schedule).observe(document.body);
  new ResizeObserver(()=>{sizeField();syncField();}).observe(hero);
  update();
  syncMotion();
})();
