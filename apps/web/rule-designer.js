/* UI model for the local prototype. All conditions stay in browser memory. */
(() => {
  'use strict';
  const labels = {subject:'제목',from:'보낸 주소',name:'보낸 사람',content:'본문',newsletter:'뉴스레터',date:'수신 날짜',attachment:'첨부파일'};
  const escape = (s='') => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const term = () => ({op:'middle',value:'',end:'',ext:''});
  const field = (key='subject') => ({key,mode:'all',terms:[term()],newsletter:'true'});
  const group = () => ({mode:'all',fields:[field()]});
  const attrs = (g,f,t) => `data-g="${g}" data-f="${f}" data-t="${t}"`;
  const select = (key,options,value,at,label) => `<select data-rd-key="${key}" ${at} aria-label="${label}">${options.map(([v,l])=>`<option value="${v}" ${v===value?'selected':''}>${l}</option>`).join('')}</select>`;
  const modeOptions = [['all','모두 일치 (AND)'],['any','하나 이상 일치 (OR)']];
  const opOptions = [['middle','포함'],['prefix','시작'],['suffix','끝']];
  const input = (key,value,at,label,placeholder='',type='text') => `<input type="${type}" data-rd-key="${key}" ${at} aria-label="${label}" placeholder="${placeholder}" value="${escape(value)}"/>`;
  const remove = (action,at,label) => `<button type="button" class="rd-remove" data-rd-action="${action}" ${at} aria-label="${label}">×</button>`;

  function normalize(rule) {
    if(rule?.groups) return structuredClone(rule.groups);
    const g=group(); g.mode=rule?.mode || 'all'; g.fields=[];
    for(const c of rule?.conditions || []) {
      let f=g.fields.find(f=>f.key===c.field);
      if(!f){f=field(c.field);f.terms=[];g.fields.push(f);}
      f.terms.push({...term(),value:c.value,op:c.op==='prefix'||c.op==='suffix'?c.op:'middle'});
    }
    return [g.fields.length?g:group()];
  }

  function render(groups) {
    return groups.map((g,gi)=>`${gi?'<div class="rd-or"><span>또는</span></div>':''}<section class="rd-group" aria-label="조건 그룹 ${gi+1}"><header class="rd-group-header"><div><span class="rd-number">${String(gi+1).padStart(2,'0')}</span><strong>조건 그룹 ${gi+1}</strong></div>${remove('group-remove',attrs(gi,0,0),`그룹 ${gi+1} 삭제`)}</header><div class="rd-group-mode"><span>아래 항목이</span>${select('group-mode',modeOptions,g.mode,attrs(gi,0,0),`그룹 ${gi+1} 항목 결합`)}<span>하는 메일</span></div>${g.fields.map((f,fi)=>renderField(g,f,gi,fi)).join('')}<button type="button" class="text-button" data-rd-action="field-add" data-g="${gi}" ${g.fields.length>=7?'disabled':''}>＋ 다른 항목 추가</button></section>`).join('')+`<button type="button" class="rd-add-group" data-rd-action="group-add">＋ 또는 조건 그룹 추가</button>`;
  }

  function renderField(g,f,gi,fi) {
    const at=attrs(gi,fi,0),prefix=`그룹 ${gi+1} ${labels[f.key]}`;
    const available=Object.entries(labels).filter(([key])=>key===f.key||!g.fields.some(other=>other.key===key));
    let inner;
    if(f.key==='newsletter') inner=select('newsletter',[['true','뉴스레터만'],['false','뉴스레터 제외'],['all','구분 안 함']],f.newsletter,at,`${prefix} 구분`);
    else inner=`${f.terms.length>1&&f.key!=='date'?`<div class="rd-term-mode"><span>${f.key==='attachment'?'같은 파일에서 조건이':'검색어가'}</span>${select('field-mode',modeOptions,f.mode,at,`${prefix} 검색어 결합`)}</div>`:''}${f.terms.map((t,ti)=>{
      const ta=attrs(gi,fi,ti),label=`${prefix} ${ti+1}`;
      if(f.key==='date') return `<div class="rd-term rd-date">${input('value',t.value,ta,`${label} 시작`,'','date')}<span>부터</span>${input('end',t.end,ta,`${label} 종료`,'','date')}${remove('term-remove',ta,`${label} 기간 삭제`)}</div>`;
      if(f.key==='attachment') return `<div class="rd-attachment"><div class="rd-term">${select('op',opOptions,t.op,ta,`${label} 이름 비교`)}${input('value',t.value,ta,`${label} 파일 이름`,'파일 이름 (선택)')}${remove('term-remove',ta,`${label} 조건 삭제`)}</div><div class="rd-extension"><span>확장자</span>${input('ext',t.ext,ta,`${label} 확장자`,'예: pdf')}<span class="small muted">이름과 확장자를 함께 입력하면 모두 확인해요.</span></div></div>`;
      return `<div class="rd-term">${select('op',opOptions,t.op,ta,`${label} 비교`)}${input('value',t.value,ta,`${label} 검색어`,f.key==='subject'?'예: 영수증':f.key==='from'?'예: @example.com':'검색어를 입력하세요')}${remove('term-remove',ta,`${label} 검색어 삭제`)}</div>`;
    }).join('')}<button type="button" class="text-button rd-add-term" data-rd-action="term-add" ${at}>＋ ${f.key==='date'?'기간':f.key==='attachment'?'첨부 조건':'검색어'} 추가</button>${f.key==='date'?'<p class="hint">종료 날짜까지 포함해요. 여러 기간 중 하나에 맞으면 전달해요.</p>':''}`;
    return `<div class="rd-field"><div class="rd-field-header">${select('field',available,f.key,at,`그룹 ${gi+1} 항목 ${fi+1}`)}${remove('field-remove',at,`${prefix} 항목 삭제`)}</div>${inner}</div>`;
  }

  function update(groups,target){
    const g=groups[Number(target.dataset.g)], f=g?.fields[Number(target.dataset.f)], t=f?.terms[Number(target.dataset.t)];
    const key=target.dataset.rdKey,value=target.value;
    if(key==='group-mode')g.mode=value;
    else if(key==='field-mode')f.mode=value;
    else if(key==='newsletter')f.newsletter=value;
    else if(key==='field'){
      f.cache ||= {}; f.cache[f.key]={terms:structuredClone(f.terms),newsletter:f.newsletter,mode:f.mode};
      f.key=value; const saved=f.cache[value]; f.terms=saved?.terms||[term()];f.newsletter=saved?.newsletter||'true';f.mode=saved?.mode||'all';
    } else if(t)t[key]=value;
    return key==='field';
  }
  function action(groups,target){
    const g=groups[Number(target.dataset.g)], f=g?.fields[Number(target.dataset.f)];
    switch(target.dataset.rdAction){
      case 'group-add':groups.push(group());break;
      case 'group-remove':groups.splice(Number(target.dataset.g),1);break;
      case 'field-add':{const key=Object.keys(labels).find(k=>!g.fields.some(f=>f.key===k));if(key)g.fields.push(field(key));break;}
      case 'field-remove':g.fields.splice(Number(target.dataset.f),1);break;
      case 'term-add':f.terms.push(term());break;
      case 'term-remove':f.terms.splice(Number(target.dataset.t),1);break;
    }
  }
  function validate(groups){
    if(!groups.length)return '조건 그룹을 추가하거나 모든 메일을 선택해 주세요.';
    for(const [gi,g] of groups.entries()){
      if(!g.fields.length)return `그룹 ${gi+1}에 조건 항목을 추가해 주세요.`;
      let effective=0;
      for(const f of g.fields){
        if(f.key==='newsletter'){if(f.newsletter!=='all')effective++;continue;}
        if(!f.terms.length)return `그룹 ${gi+1}의 ${labels[f.key]} 조건을 입력해 주세요.`;
        for(const t of f.terms){
          if(f.key==='date'){
            if(!t.value&&!t.end)return '시작 또는 종료 날짜를 입력해 주세요.';
            if(t.value&&t.end&&t.value>t.end)return '종료 날짜는 시작 날짜 이후로 선택해 주세요.';
          }else if(f.key==='attachment'){
            if(!t.value.trim()&&!t.ext.replace(/^\./,'').trim())return '첨부파일 이름 또는 확장자를 입력해 주세요.';
          }else if(!t.value.trim())return `그룹 ${gi+1}의 ${labels[f.key]} 검색어를 입력해 주세요.`;
        }
        effective++;
      }
      if(!effective)return `그룹 ${gi+1}에 실제로 확인할 조건이 없어요. 뉴스레터 구분을 선택해 주세요.`;
    }
    return '';
  }
  const compare=(value,t)=>{
    const source=value.toLowerCase(),query=t.value.toLowerCase();
    return t.op==='prefix'?source.startsWith(query):t.op==='suffix'?source.endsWith(query):source.includes(query);
  };
  const combine=(results,mode)=>mode==='all'?results.every(Boolean):results.some(Boolean);
  function matches(groups,sample){
    return groups.some(g=>{
      const results=g.fields.filter(f=>f.key!=='newsletter'||f.newsletter!=='all').map(f=>{
        if(f.key==='newsletter')return sample.newsletter===f.newsletter;
        if(f.key==='date')return !!sample.date&&f.terms.some(t=>(!t.value||sample.date>=t.value)&&(!t.end||sample.date<=t.end));
        if(f.key==='attachment')return (sample.attachment||'').split(',').map(s=>s.trim()).filter(Boolean).some(filename=>{
          const dot=filename.lastIndexOf('.'),name=dot<0?filename:filename.slice(0,dot),ext=dot<0?'':filename.slice(dot+1).toLowerCase();
          return combine(f.terms.map(t=>(!t.value||compare(name,t))&&(!t.ext||ext===t.ext.replace(/^\./,'').trim().toLowerCase())),f.mode);
        });
        return combine(f.terms.map(t=>compare(sample[f.key]||'',t)),f.mode);
      });
      return combine(results,g.mode);
    });
  }
  function fieldText(f){
    if(f.key==='newsletter')return f.newsletter==='true'?'뉴스레터인 메일':f.newsletter==='false'?'뉴스레터가 아닌 메일':'뉴스레터 구분 안 함';
    const terms=f.terms.map(t=>f.key==='date'?`${t.value||'처음'} ~ ${t.end||'이후 전체'}`:f.key==='attachment'?`${t.value?`이름에 “${t.value}” ${t.op==='prefix'?'시작':t.op==='suffix'?'끝':'포함'}`:''}${t.value&&t.ext?' · ':''}${t.ext?`${t.ext.replace(/^\./,'')} 파일`:''}`:`“${t.value||'…'}” ${t.op==='prefix'?'시작':t.op==='suffix'?'끝':'포함'}`);
    return `${labels[f.key]}: ${terms.join(f.key==='date'||f.mode==='any'?' 또는 ':' 그리고 ')||'조건을 추가해 주세요'}`;
  }
  function describe(groups){return groups.map((g,i)=>`${groups.length>1?`그룹 ${i+1}\n`:''}${g.fields.filter(f=>f.key!=='newsletter'||f.newsletter!=='all').map(fieldText).join(g.mode==='all'?'\n그리고 ':'\n또는 ')||'조건을 추가해 주세요'}`).join('\n\n또는\n\n');}
  function flatten(groups){return groups.flatMap(g=>g.fields).map(f=>({field:f.key,op:'middle',value:fieldText(f)}));}
  window.RuleDesigner={normalize,render,update,action,validate,matches,describe,flatten,labels};
})();
