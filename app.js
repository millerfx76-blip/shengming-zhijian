(()=>{
'use strict';
const {nodes,views,lenses,tour}=window.LIFE_MAP;
const $=id=>document.getElementById(id);
const viewport=$('map-viewport'),world=$('map-world'),lines=$('map-lines'),layer=$('map-nodes'),core=$('core-node');
const state={view:'relations',selected:'root',expanded:null,lens:'all',zoom:1,panX:0,panY:0,tourIndex:-1,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let width=0,height=0,positions={};
const svg=(tag,attrs={})=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;};
const rootId=()=>views[state.view].rootId||'root';
const parentOf=id=>views[state.view].ids.find(p=>nodes[p].children.includes(id));
const sourceOf=n=>n.source||{kind:'pdf',page:n.page||12,label:`主文本 · PDF 第 ${n.page||12} 页`};

function select(id){
if(!nodes[id])return;
state.selected=id;
if(views[state.view].ids.includes(id))state.expanded=state.expanded===id?null:id;
else state.expanded=parentOf(id)||null;
render();
}
function changeView(view,id){
if(!views[view])return;
state.view=view;state.selected=id||rootId();state.expanded=views[view].ids.includes(id)?id:parentOf(id)||null;
state.panX=state.panY=0;state.zoom=1;render();
}
function changeLens(lens){state.lens=lens;render();}
function transform(){world.style.setProperty('--pan-x',`${state.panX}px`);world.style.setProperty('--pan-y',`${state.panY}px`);world.style.setProperty('--map-zoom',state.zoom);}

function geometry(){
width=viewport.clientWidth;height=viewport.clientHeight;
const mobile=width<670,cx=width/2,cy=height/2-9,ids=views[state.view].ids;
positions={};let center={x:cx,y:cy};
if(mobile&&state.expanded){
center={x:cx,y:104};ids.forEach((id,i)=>positions[id]={x:cx,y:223,hidden:id!==state.expanded,index:i});
const kids=nodes[state.expanded].children;
if(kids.length===3&&width<330)kids.forEach((id,i)=>positions[id]={x:i===2?cx:cx+(i===0?-1:1)*(width/4.3),y:i===2?380:320,leaf:true});
else if(kids.length<=3){const margin=width<460?56:90;kids.forEach((id,i)=>positions[id]={x:kids.length===1?cx:margin+i*(width-2*margin)/(kids.length-1),y:338,leaf:true});}
else kids.forEach((id,i)=>positions[id]={x:cx+(i%2===0?-1:1)*(width/4.05),y:310+Math.floor(i/2)*59,leaf:true});
}else{
const rx=mobile?Math.min(98,width*.267):Math.min(width*.265,300),ry=mobile?129:Math.min(145,height*.285);
if(ids.length===3){positions[ids[0]]={x:cx-rx,y:cy-ry*.75,index:0};positions[ids[1]]={x:cx+rx,y:cy-ry*.75,index:1};positions[ids[2]]={x:cx,y:cy+ry,index:2};}
else ids.forEach((id,i)=>positions[id]={x:cx+(i%2===0?-rx:rx),y:cy+(i<2?-ry:ry),index:i});
if(state.expanded){
const p=positions[state.expanded],kids=nodes[state.expanded].children,top=p.y<cy;
if(!top)center.y-=38;
ids.forEach(id=>{const q=positions[id];if(top&&q.y<cy)q.y=Math.max(q.y,125);if(!top&&q.y>cy)q.y=Math.min(q.y,height-163);});
const leafY=top?42:height-88;
const margin=width<670?68:86;
kids.forEach((id,i)=>positions[id]={x:kids.length===1?cx:margin+i*(width-2*margin)/(kids.length-1),y:leafY,leaf:true});
}
}
core.style.left=`${center.x}px`;core.style.top=`${center.y}px`;core.classList.toggle('mobile-compact',mobile&&!!state.expanded);
viewport.classList.toggle('mobile-focused',mobile&&!!state.expanded);return center;
}
function connect(a,b,color,selected,leaf=false,num=0){
const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d;
const r0=Math.min(leaf?27:69,d*.32),r1=Math.min(leaf?18:43,d*.22);
const start={x:a.x+ux*r0,y:a.y+uy*r0},end={x:b.x-ux*r1,y:b.y-uy*r1},bow=leaf?16:35;
const curve=`M ${start.x} ${start.y} Q ${(start.x+end.x)/2-uy*bow} ${(start.y+end.y)/2+ux*bow} ${end.x} ${end.y}`;
const path=svg('path',{d:curve,class:`connection${selected?' selected':''}`});path.style.setProperty('--node-color',color);lines.append(path);
if(state.motion&&!leaf){const dot=svg('circle',{r:selected?2.5:1.65,class:'flow-dot'});dot.style.setProperty('--node-color',color);dot.append(svg('animateMotion',{dur:`${7+num*1.2}s`,repeatCount:'indefinite',path:curve,begin:`-${num*1.7}s`}));lines.append(dot);}
}
function renderMap(){
const focusedNode=document.activeElement?.dataset.node;
const center=geometry(),view=views[state.view];
lines.replaceChildren();lines.setAttribute('viewBox',`0 0 ${width} ${height}`);layer.replaceChildren();
world.classList.remove('view-relations','view-attributes','view-sources','view-systems');world.classList.add(`view-${state.view}`);
core.querySelector('strong').textContent=view.root;core.querySelector('.core-subline').textContent=view.subtitle;core.querySelector('.core-overline').textContent=view.intro;
core.setAttribute('aria-label',`${view.root}：查看这一层的起点`);
viewport.classList.toggle('has-expansion',!!state.expanded);
viewport.querySelector('.map-coordinate').textContent=`${view.root} · ${view.label}`;
const selectedParent=parentOf(state.selected)||state.selected;
Object.entries(positions).forEach(([id,p])=>{
const n=nodes[id],b=document.createElement('button');b.type='button';b.className=`graph-node${p.leaf?' is-leaf':''}${state.selected===id?' is-selected':''}${p.hidden?' mobile-muted':''}`;
b.classList.toggle('is-dimmed',state.lens!=='all'&&!n.scales.includes(state.lens));
b.style.setProperty('--x',`${p.x}px`);b.style.setProperty('--y',`${p.y}px`);b.style.setProperty('--node-color',n.color);b.style.animationDelay=`${(p.index||0)*60}ms`;b.dataset.node=id;
b.setAttribute('aria-pressed',String(state.selected===id));if(!p.leaf)b.setAttribute('aria-expanded',String(state.expanded===id));
if(p.hidden){b.tabIndex=-1;b.setAttribute('aria-hidden','true');}
b.innerHTML=`<span class="node-heading"><span class="node-mark"></span><span>${esc(n.title)}</span>${!p.leaf&&n.children.length?`<span class="node-expand" aria-hidden="true">${state.expanded===id?'−':'＋'}</span>`:''}</span><span class="node-subtitle">${esc(n.subtitle)}</span>`;
b.addEventListener('click',()=>select(id));layer.append(b);
if(!p.hidden)connect(p.leaf?positions[state.expanded]:center,p,n.color,selectedParent===id||state.selected===id,p.leaf,p.index||0);
});
if(state.view==='relations'&&!positions.tools.hidden){const tech=positions.tools;['nature','people','self'].forEach(id=>{const p=positions[id];if(p.hidden)return;const path=svg('path',{d:`M ${tech.x} ${tech.y-35} Q ${center.x} ${center.y-10} ${p.x} ${p.y+28}`,class:'connection secondary'});path.style.setProperty('--node-color',nodes.tools.color);lines.prepend(path);});}
$('map-hint').textContent=state.expanded?'再次选择主节点可收起 · 拖动空白处移动地图':'选择一个节点，展开它的联系';transform();
if(focusedNode)layer.querySelector(`[data-node="${focusedNode}"]`)?.focus({preventScroll:true});
}
function lensText(n){
if(n.lenses?.[state.lens])return n.lenses[state.lens];
if(state.lens==='all')return '三种时间尺度共同参与同一生命过程。可以选择一种尺度，改变观察的焦点。';
const parent=nodes[parentOf(n.id)];if(parent?.lenses?.[state.lens])return parent.lenses[state.lens];
return {earth:'从作者的地球生命时轴出发，可以追问这一问题依赖怎样的身体条件、自然过程与生态边界。',society:'从社会生命时轴出发，可以追问生产、制度、文化与知识怎样在历史中改变这些生命联系。',individual:'从个体生命时轴出发，可以追问这些条件怎样进入具体人的感受、选择和生活意义。'}[state.lens];
}
function renderPanel(){
const n=nodes[state.selected],v=views[state.view],s=sourceOf(n);
$('panel-category').textContent=state.selected==='root'?'思想起点':v.label;$('panel-index').textContent=state.selected==='root'?'00':v.index;
const children=n.children.length?n.children:(state.selected===rootId()?v.ids:[]);
const chips=children.map(id=>`<button class="child-link" data-select="${id}">${esc(nodes[id].title)}</button>`).join('');
const links=(n.links||[]).map(l=>`<button class="cross-link" data-jump-view="${l.view}" data-jump-id="${l.id}">${esc(l.text)}</button>`).join('');
const panel=$('panel-content');panel.style.setProperty('--node-color',n.color);
panel.innerHTML=`<h2>${esc(n.title)}</h2><p class="panel-subtitle">${esc(n.subtitle)}</p><p class="panel-summary">${esc(n.summary)}</p>${n.quote?`<blockquote class="panel-quote">${esc(n.quote)}<cite>王利华 · 所提供 PDF 第 ${n.quotePage||n.page} 页</cite></blockquote>`:''}${chips?`<span class="panel-section-label">展开这一层</span><div class="child-links">${chips}</div>`:''}${n.question?`<p class="view-question">${esc(n.question)}</p>`:''}<div class="lens-reading"><div class="lens-reading-label"><span>${esc(lenses[state.lens].label)}</span><span>·</span><span>观察焦点</span></div><p>${esc(lensText(n))}</p></div>${links?`<span class="panel-section-label">与其他层的联系</span>${links}`:''}${n.extraSource?`<span class="panel-section-label">相关论述</span><a class="cross-link" href="${esc(n.extraSource.url)}" target="_blank" rel="noopener">${esc(n.extraSource.label)}</a>`:''}`;
panel.classList.remove('is-changing');void panel.offsetWidth;panel.classList.add('is-changing');
panel.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.select)));
panel.querySelectorAll('[data-jump-view]').forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.jumpView,b.dataset.jumpId)));
$('panel-source').textContent=s.kind==='pdf'?'阅读论文原文':`查看来源 · ${s.label}`;
$('panel-source').onclick=()=>window.open(s.kind==='pdf'?'https://mp.weixin.qq.com/s/yv6NnyY45SzXqt00T36eOw':s.url,'_blank','noopener');
}
function render(){
document.querySelectorAll('[data-view]').forEach(b=>{const on=b.dataset.view===state.view;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on));});
document.querySelectorAll('[data-lens]').forEach(b=>{const on=b.dataset.lens===state.lens;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on));});
$('lens-description').textContent=lenses[state.lens].description;document.querySelectorAll('.ribbon').forEach(r=>r.style.opacity=state.lens==='all'||r.classList.contains(state.lens)?'1':'.24');renderMap();renderPanel();
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.view)));
document.querySelectorAll('[data-lens]').forEach(b=>b.addEventListener('click',()=>changeLens(b.dataset.lens)));
core.addEventListener('click',()=>{state.selected=rootId();state.expanded=null;render();});
$('home').addEventListener('click',e=>{e.preventDefault();state.lens='all';changeView('relations');});
$('zoom-in').addEventListener('click',()=>{state.zoom=Math.min(1.6,state.zoom+.15);transform();});
$('zoom-out').addEventListener('click',()=>{state.zoom=Math.max(.7,state.zoom-.15);transform();});
$('map-reset').addEventListener('click',()=>{state.zoom=1;state.panX=state.panY=0;state.expanded=null;render();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await viewport.requestFullscreen();}catch{state.zoom=1;transform();}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'退出':'全屏';renderMap();});
$('sources-open').addEventListener('click',()=>$('sources-dialog').showModal());$('sources-close').addEventListener('click',()=>$('sources-dialog').close());
$('sources-dialog').addEventListener('click',e=>{if(e.target===$('sources-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
let drag=null;
viewport.addEventListener('pointerdown',e=>{if(e.target.closest('button,a')||e.button!==0)return;drag={x:e.clientX,y:e.clientY,px:state.panX,py:state.panY};viewport.setPointerCapture(e.pointerId);world.classList.add('is-dragging');});
viewport.addEventListener('pointermove',e=>{if(!drag)return;state.panX=Math.max(-width*.7,Math.min(width*.7,drag.px+e.clientX-drag.x));state.panY=Math.max(-height*.6,Math.min(height*.6,drag.py+e.clientY-drag.y));transform();});
const endDrag=()=>{drag=null;world.classList.remove('is-dragging');};viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
new ResizeObserver(()=>renderMap()).observe(viewport);
function showTour(i){state.tourIndex=i;const t=tour[i];changeView(t.view,t.id);changeLens(t.lens);$('tour-bar').hidden=false;$('tour-title').textContent=t.title;$('tour-position').textContent=`${String(i+1).padStart(2,'0')} / ${String(tour.length).padStart(2,'0')}`;$('tour-prev').disabled=i===0;$('tour-next').textContent=i===tour.length-1?'完成':'下一步';}
const closeTour=()=>{state.tourIndex=-1;$('tour-bar').hidden=true;};
$('tour-start').addEventListener('click',()=>showTour(0));$('tour-prev').addEventListener('click',()=>{if(state.tourIndex>0)showTour(state.tourIndex-1);});
$('tour-next').addEventListener('click',()=>{if(state.tourIndex<tour.length-1)showTour(state.tourIndex+1);else closeTour();});$('tour-close').addEventListener('click',closeTour);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('tour-bar').hidden)closeTour();});
const canvas=$('atmosphere'),ctx=canvas.getContext('2d');let particles=[],raf=0,previous=0;
function draw(t){ctx.clearRect(0,0,innerWidth,innerHeight);const g=ctx.createRadialGradient(innerWidth*.38,innerHeight*.44,0,innerWidth*.4,innerHeight*.45,innerWidth*.65);g.addColorStop(0,'#143a352b');g.addColorStop(.4,'#0b222836');g.addColorStop(1,'#07111900');ctx.fillStyle=g;ctx.fillRect(0,0,innerWidth,innerHeight);particles.forEach(p=>{const a=.2+(Math.sin(t*.00035+p.phase)+1)*.17;ctx.fillStyle=`rgba(183,209,204,${a})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});}
function resizeBackground(){const dpr=Math.min(devicePixelRatio,1.6);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);particles=Array.from({length:Math.min(150,Math.round(innerWidth/10))},(_,i)=>({x:(i*137.51)%innerWidth,y:(i*i*29.31)%innerHeight,r:.4+(i%4)*.22,phase:i*1.71}));draw(0);}
function animate(t){if(t-previous>45){draw(t);previous=t;}raf=requestAnimationFrame(animate);}
function motion(on){state.motion=on;document.body.classList.toggle('is-static',!on);$('motion-toggle').setAttribute('aria-pressed',String(!on));$('motion-toggle').setAttribute('aria-label',on?'暂停背景动效':'开启背景动效');cancelAnimationFrame(raf);if(on)raf=requestAnimationFrame(animate);else draw(0);renderMap();}
$('motion-toggle').addEventListener('click',()=>motion(!state.motion));
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(raf);if(!document.hidden&&state.motion)raf=requestAnimationFrame(animate);});
window.addEventListener('resize',resizeBackground);resizeBackground();render();motion(state.motion);
window.lifeMapState=()=>({...state,nodeCount:Object.keys(positions).length});
})();
