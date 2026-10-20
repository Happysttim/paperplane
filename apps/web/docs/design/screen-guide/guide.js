(() => {
  const articles = [...document.querySelectorAll('.screen')];
  const search = document.querySelector('#search');
  const result = document.querySelector('#result-count');
  const viewer = document.querySelector('#viewer');
  const image = document.querySelector('#viewer-image');
  const imageBody = document.querySelector('.lightbox-body');
  const sizeNames = {desktop:'데스크톱',tablet:'태블릿',mobile:'모바일'};
  function filter() {
    const query = search.value.trim().toLowerCase();
    let count = 0;
    for (const article of articles) {
      article.hidden = !article.textContent.toLowerCase().includes(query);
      if (!article.hidden) count++;
    }
    result.textContent = `${count}개 항목 · 사진을 누르면 크게 볼 수 있습니다`;
    document.querySelector('.empty-result').style.display = count ? 'none' : 'block';
  }
  search.addEventListener('input', filter);
  document.querySelectorAll('.views [data-view]').forEach(button => button.addEventListener('click', () => {
    document.body.dataset.view = button.dataset.view;
    document.querySelectorAll('.views button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  }));
  document.querySelectorAll('a[href^="#P"],a[href^="#S"]').forEach(link => link.addEventListener('click', () => {
    search.value = ''; filter();
    document.querySelectorAll('.side a.active').forEach(a => a.classList.remove('active'));
    document.querySelector(`.side a[href="${link.hash}"]`)?.classList.add('active');
    document.querySelector('.side').classList.remove('open');
    document.querySelector('.toc-button').setAttribute('aria-expanded','false');
  }));
  document.querySelector('.toc-button').addEventListener('click', e => {
    const open = document.querySelector('.side').classList.toggle('open');
    e.currentTarget.setAttribute('aria-expanded',String(open));
    if(open)document.querySelector('.side').scrollIntoView();
  });
  document.querySelectorAll('.image-button').forEach(button => button.addEventListener('click', () => {
    const img = button.querySelector('img');
    image.src = img.src; image.alt = img.alt;
    document.querySelector('#viewer-title').textContent = `${button.dataset.title} · ${sizeNames[button.dataset.mode]}`;
    document.querySelector('#download').href = img.src;
    document.querySelector('#download').download = img.src.split('/').pop();
    imageBody.classList.remove('actual');
    document.querySelector('#zoom').textContent='원본 크기';
    viewer.showModal();
    document.querySelector('#close-viewer').focus();
  }));
  document.querySelector('#zoom').addEventListener('click', e => {
    const actual = imageBody.classList.toggle('actual');
    e.currentTarget.textContent = actual ? '화면에 맞춤' : '원본 크기';
  });
  document.querySelector('#close-viewer').addEventListener('click',()=>viewer.close());
  viewer.addEventListener('click',e=>{if(e.target===viewer)viewer.close();});
  document.querySelector('#print').addEventListener('click',()=>window.print());
  filter();
})();
