"""Build the offline HTML and Markdown guide from real browser captures."""
from pathlib import Path
from html import escape
import json
import zipfile
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / 'content.json').read_text(encoding='utf-8'))
MODES = {'desktop': ('데스크톱', 1440, 1000), 'tablet': ('태블릿', 768, 1024), 'mobile': ('모바일', 390, 844)}
ROUTES = ['/', '/login', '/signup', '/signup/verify', '/signup/profile', '/auth/callback', '/signup/social', '/password/reset', '/password/reset/new', '/emails', '/emails/new', '/email/1', '/rule/2/21', '/destinations', '/destinations/new', '/deliveries', '/settings', '/404', '/session', '/success']
FAMILIES = {
    'auth': ['브랜드 설명 패널과 입력 폼을 좌우로 나눕니다.', '브랜드 패널과 폼의 2열 구성을 유지하고 여백을 줄입니다.', '브랜드 설명 패널을 접고 로고와 입력 폼만 한 열로 보여줍니다.'],
    'landing': ['서비스 설명과 주소 연결 예시를 나란히 배치합니다.', '2열 소개 구성을 유지하되 제목과 여백을 줄입니다.', '제목·시작 버튼·주소 예시를 세로로 쌓습니다. 다음 내용은 스크롤로 이어집니다.'],
    'list': ['고정 측면 메뉴와 넓은 목록으로 주소와 상태를 비교합니다.', '주 메뉴가 상단으로 이동하고 목록 열과 보조 정보를 줄입니다.', '상단 로고·계정과 하단 주 메뉴를 유지하고 목록을 카드로 읽습니다.'],
    'form': ['입력 폼과 보조 설명을 나란히 배치합니다.', '입력과 보조 설명을 한 열로 쌓아 폼 폭을 확보합니다.', '한 열 폼과 하단 저장·취소 영역을 사용합니다. 편집 화면에서는 하단 주 메뉴를 감춥니다.'],
    'detail': ['주소·규칙·관리 행동을 넓은 콘텐츠 영역에서 확인합니다.', '상단 메뉴 아래에 주소별 설정을 한 열로 배치합니다.', '긴 주소를 줄바꿈하고 규칙 카드와 관리 행동을 세로로 보여줍니다.'],
    'editor': ['조건 폼 오른쪽에 전달 미리보기를 두어 입력과 의미를 함께 확인합니다.', '전달 미리보기를 폼 아래로 이동합니다. 긴 조건은 스크롤해 읽습니다.', '선택 카드와 조건을 세로로 쌓고 하단에 저장 행동을 둡니다. 요약은 폼 아래에 이어집니다.'],
    'records': ['시각·주소·대상·결과를 표 형태로 정렬합니다.', '상단 메뉴 아래에서 기록 목록의 열 구성을 유지합니다.', '기록을 카드로 바꾸고 주소와 처리 결과를 여러 줄로 배치합니다.'],
    'settings': ['프로필 저장과 로그아웃·삭제 영역을 구분해 배치합니다.', '상단 계정 아이콘으로 진입하고 설정을 한 열로 읽습니다.', '프로필 아래에 관리 행동을 세로로 쌓습니다. 아래쪽 행동은 스크롤해 확인합니다.'],
    'recovery': ['측면 메뉴를 유지하고 복귀 안내를 콘텐츠 영역에 배치합니다.', '상단 메뉴를 유지해 오류 화면에서도 이동할 수 있습니다.', '하단 메뉴와 내 이메일 복귀 버튼으로 다음 행동을 안내합니다.'],
    'success': ['주소와 메일함 연결 관계를 가운데 완료 패널로 보여줍니다.', '상단 메뉴 아래에 완료 안내와 복귀 행동을 유지합니다.', '연결 정보를 세로로 읽고 내 이메일로 이동하는 버튼을 넓게 보여줍니다.']
}
SCREEN_MAP = {s['id']: s for s in DATA['screens']}
for i, item in enumerate(DATA['screens']):
    item['route'] = ROUTES[i]
    item['kind'] = 'page'
    item['responsive'] = FAMILIES[item['family']]
for item in DATA['states']:
    parent = SCREEN_MAP[item['related']]
    item.update(kind='state', category='상호작용 상태', route=parent['route'], states=[], flow=f"{parent['id']} {parent['title']}에서 발생하는 상태", purpose=item['result'], actions=[item['trigger']])
    if item['id'] in ['S08', 'S09']:
        item['responsive'] = ['배경을 어둡게 하고 화면 중앙에 확인 대화상자를 띄웁니다.', '같은 대화상자를 가용 폭 안에서 중앙에 배치합니다.', '좌우 여백을 남긴 대화상자 안에 설명과 선택 버튼을 배치합니다.']
    else:
        item['responsive'] = parent['responsive']

ALL = DATA['screens'] + DATA['states']
font_path = 'C:/Windows/Fonts/malgun.ttf'
bold_path = 'C:/Windows/Fonts/malgunbd.ttf'
font = ImageFont.truetype(font_path, 21)
small_font = ImageFont.truetype(font_path, 18)
title_font = ImageFont.truetype(bold_path, 30)
(ROOT / 'comparisons').mkdir(exist_ok=True)
manifest = []
for item in ALL:
    board = Image.new('RGB', (1800, 860), '#edf3f0')
    draw = ImageDraw.Draw(board)
    draw.text((40, 28), f"{item['id']}  {item['title']}", font=title_font, fill='#17324d')
    draw.text((40, 75), 'Paperplane  |  반응형 화면 비교  |  '+DATA['date'], font=small_font, fill='#5e7769')
    item['images'] = {}
    for n, (mode, (name, width, height)) in enumerate(MODES.items()):
        image_path = ROOT / 'screenshots' / f"{item['id']}-{mode}.jpg"
        if not image_path.exists():
            raise FileNotFoundError(image_path)
        image = Image.open(image_path).convert('RGB')
        ratio = image.width / image.height
        expected = width / height
        if abs(ratio / expected - 1) > .05:
            raise ValueError(f'Unexpected screenshot aspect ratio: {image_path.name} {image.size}')
        file = image_path.relative_to(ROOT).as_posix()
        item['images'][mode] = {'file': file, 'width': image.width, 'height': image.height}
        manifest.append({'id': item['id'], 'title': item['title'], 'kind': item['kind'], 'mode': mode, 'file': file, 'viewport': {'width': width, 'height': height}, 'image': {'width': image.width, 'height': image.height}, 'route': item['route'], 'captureDate': DATA['date'], 'captureMethod': 'actual browser viewport with animations disabled', 'position': 'lower section' if item['id'] in ['S05','S06','S07','S12'] else 'dialog' if item['id'] in ['S08','S09'] else 'initial viewport'})
        x, slot_width = [(40, 900), (970, 460), (1460, 300)][n]
        draw.text((x, 127), f'{name}  {width} × {height}', font=font, fill='#17324d')
        scaled = ImageOps.contain(image, (slot_width, 650), Image.Resampling.LANCZOS)
        draw.rounded_rectangle((x-1, 169, x+scaled.width+1, 171+scaled.height), radius=5, fill='#d7e2db')
        board.paste(scaled, (x, 170))
    board.save(ROOT / 'comparisons' / f"{item['id']}.jpg", quality=94)

(ROOT / 'capture-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')

def e(value):
    return escape(str(value), quote=True)

def images_html(item):
    result = []
    for i, (mode, (name, width, height)) in enumerate(MODES.items()):
        img = item['images'][mode]
        result.append(f'''<figure class="device-frame device-{mode}"><div class="device-label"><strong>{name}</strong><span>{width} × {height}</span></div><button class="image-button" data-title="{e(item['id']+' '+item['title'])}" data-mode="{mode}" aria-label="{e(item['title'])} {name} 사진 확대"><img src="{img['file']}" width="{img['width']}" height="{img['height']}" loading="lazy" alt="{e(item['id']+' '+item['title'])} {name} 실제 촬영 화면"/></button><figcaption>{e(item['responsive'][i])}</figcaption><a class="original-link" href="{img['file']}" target="_blank" rel="noopener">원본 이미지 열기 ↗</a></figure>''')
    return '<div class="shot-set">'+''.join(result)+'</div>'

sections = []
for item in ALL:
    links = []
    if item['kind'] == 'state':
        links.append(f'<a href="#{item["related"]}">← {item["related"]} 기본 화면</a>')
    for state in item['states']:
        links.append(f'<a href="#{state}">{state} 상태 보기 →</a>')
    actions = ''.join(f'<li>{e(action)}</li>' for action in item['actions'])
    notes = f'''<div class="notes"><div><h3>{'상태를 여는 방법' if item['kind']=='state' else '주요 동작'}</h3><ul>{actions}</ul></div><div><h3>사진을 볼 때 확인할 점</h3><p>{e(item['focus'])}</p></div></div>'''
    if item['kind'] == 'state':
        notes = f'''<div class="notes"><div><h3>사진을 볼 때 확인할 점</h3><p>{e(item['focus'])}</p></div></div>'''
    sections.append(f'''<article class="screen {'state-section' if item['kind']=='state' else ''}" id="{item['id']}"><header><div class="section-id"><span>{item['id']}</span>{e(item['category'])}</div><h2>{e(item['title'])}</h2><p class="purpose">{e(item['purpose'])}</p><p class="flow">{e(item['trigger'] if item['kind']=='state' else item['flow'])}</p><p class="route">시안 경로 #{e(item['route'])} · {'하단 스크롤 위치 촬영' if item['id'] in ['S05','S06','S07','S12'] else '대화상자 촬영' if item['id'] in ['S08','S09'] else '화면 진입 위치 촬영'}</p></header>{images_html(item)}{notes}<div class="related">{''.join(links)}</div></article>''')

nav = []
for category in dict.fromkeys(s['category'] for s in ALL):
    nav.append(f'<h3>{e(category)}</h3>')
    for item in ALL:
        if item['category'] == category:
            nav.append(f'<a href="#{item["id"]}"><span>{item["id"]}</span>{e(item["title"])}</a>')

html = f'''<!doctype html><html lang="ko"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>{DATA['title']}</title><meta name="description" content="Paperplane 기본 20개 화면과 12개 상호작용 상태를 96장 사진으로 설명하는 반응형 화면 가이드"/><link rel="stylesheet" href="guide.css"/></head><body data-view="compare"><a class="skip-link" href="#main">본문으로 이동</a><aside class="side"><a class="doc-brand" href="#top"><img src="brand-icon.png" alt=""/><span>Paperplane<small>SCREEN GUIDE</small></span></a><nav aria-label="문서 목차">{''.join(nav)}</nav><div class="side-bottom">DESIGN PROTOTYPE<br/>{DATA['date']} · 한국어 화면 설명서<br/>기본 화면 20종 · 추가 상태 12종</div></aside><main class="main" id="main"><header class="cover" id="top"><div class="kicker">DESIGN REFERENCE · {DATA['date']}</div><h1>Paperplane<br/>반응형 화면 가이드</h1><p class="lead">{DATA['intro']}</p><p class="scope">{DATA['scope']}</p><div class="summary"><div><strong>20</strong><span>기본 화면</span></div><div><strong>12</strong><span>상호작용 상태</span></div><div><strong>96</strong><span>실제 촬영 사진</span></div></div><figure class="cover-figure"><img src="comparisons/P10.jpg" width="1800" height="860" alt="내 이메일의 데스크톱 태블릿 모바일 비교"/><figcaption>같은 내 이메일 화면이 넓은 행 목록에서 모바일 카드로 달라지는 모습입니다.</figcaption></figure><div class="reading"><div><h2>문서 읽는 방법</h2><ol><li>목차 또는 검색으로 화면을 찾습니다.</li><li>나란히 비교하거나 원하는 화면 크기만 선택합니다.</li><li>사진을 누르면 확대할 수 있습니다. 확대 창의 원본 크기로 세부 글자를 확인합니다.</li><li>기본 화면의 상태 보기 링크에서 오류·확인·완료 동작을 이어서 봅니다.</li></ol></div><div><h2>촬영 기준</h2><p>아래 크기는 브라우저에 설정한 CSS 뷰포트입니다. 사진은 화면에 보이는 영역을 촬영했으며, 스크롤이 필요한 화면의 하단은 일부 상태 사진에서 따로 보여줍니다. 브라우저 스크롤바와 캡처 배율 때문에 원본 이미지의 픽셀 크기는 일부 다를 수 있습니다.</p><table class="viewport-table"><thead><tr><th>구분</th><th>설정 크기</th><th>기본 구조</th></tr></thead><tbody><tr><td>데스크톱</td><td>1440 × 1000</td><td>측면 메뉴와 넓은 콘텐츠</td></tr><tr><td>태블릿</td><td>768 × 1024</td><td>상단 메뉴와 축소된 열 구성</td></tr><tr><td>모바일</td><td>390 × 844</td><td>한 열 콘텐츠와 하단 메뉴</td></tr></tbody></table></div></div></header><div class="toolbar"><button class="toc-button" aria-expanded="false">목차</button><label class="search"><input id="search" type="search" placeholder="화면 이름, 기능, P13 등 검색" aria-label="화면 검색"/></label><div class="views" role="group" aria-label="사진 크기별 보기"><button data-view="compare" aria-pressed="true">나란히 비교</button><button data-view="desktop" aria-pressed="false">데스크톱</button><button data-view="tablet" aria-pressed="false">태블릿</button><button data-view="mobile" aria-pressed="false">모바일</button></div><button class="print-button" id="print">인쇄</button></div><p class="result-count" id="result-count" role="status"></p><div class="empty-result">해당하는 화면이 없습니다. 다른 단어로 검색해 주세요.</div>{''.join(sections)}<footer class="doc-footer"><p>실제 HTML·CSS·JavaScript를 사용한 촬영이며 이미지 생성이나 합성 UI를 사용하지 않았습니다. 촬영 전용 capture.html은 진입 애니메이션만 멈춰 중간 프레임이 찍히지 않도록 합니다.</p><p>주소와 계정은 예시입니다. 실제 메일 발송·OAuth·API 검증·영구 저장은 연결하지 않았습니다. 설정 완료와 실제 메일 전달 성공은 구분해 해석해야 합니다.</p><p><a href="README.md">Markdown 문서</a> · <a href="capture-manifest.json">사진 목록과 크기</a></p></footer></main><a class="jump-top" href="#top">↑ 처음으로</a><dialog id="viewer" aria-labelledby="viewer-title"><header class="lightbox-header"><h2 id="viewer-title">화면 확대</h2><div class="actions"><button id="zoom">원본 크기</button><a id="download" download>이미지 저장</a><button id="close-viewer">닫기</button></div></header><div class="lightbox-body"><img id="viewer-image" alt=""/></div></dialog><script src="guide.js" defer></script></body></html>'''
(ROOT / 'index.html').write_text(html, encoding='utf-8')

md = [f"# {DATA['title']}", f"{DATA['date']} · 기본 화면 20종 · 상호작용 상태 12종 · 사진 96장", DATA['intro'], DATA['scope'], '[확대와 크기별 비교가 가능한 HTML 문서](index.html)', '## 촬영 기준', '| 구분 | 브라우저 설정 크기 |\n| --- | --- |\n| 데스크톱 | 1440 × 1000 |\n| 태블릿 | 768 × 1024 |\n| 모바일 | 390 × 844 |', '진입 애니메이션을 멈춘 실제 HTML 시안을 촬영했습니다. 사진은 뷰포트 기준이며, 아래쪽 내용은 S05~S07·S12의 하단 촬영으로 보완했습니다. 모든 긴 페이지의 전체 스크롤 내용을 한 장에 담은 자료는 아닙니다. 원본 픽셀 크기는 캡처 배율에 따라 일부 다릅니다.', '## 화면 목록', '| ID | 화면 | 구분 |\n| --- | --- | --- |']
md[-1] += '\n'+'\n'.join(f"| {s['id']} | [{s['title']}](#{s['id'].lower()}) | {s['category']} |" for s in ALL)
for item in ALL:
    md += [f'<a id="{item["id"].lower()}"></a>', f"## {item['id']} {item['title']}", item['purpose'], f"**{'진입 동작' if item['kind']=='state' else '사용 흐름'}**  \n{item['trigger'] if item['kind']=='state' else item['flow']}", f"![{item['title']} 반응형 비교](comparisons/{item['id']}.jpg)"]
    md.append(' · '.join(f"[{name} 원본]({item['images'][mode]['file']})" for mode,(name,_,_) in MODES.items()))
    if item['kind']=='page':
        md += ['**주요 동작**', '\n'.join('- '+a for a in item['actions'])]
    md += ['**반응형 변화**', '\n'.join(f"- {name}: {item['responsive'][i]}" for i,(name,_,_) in enumerate(MODES.values())), '**확인할 점**  \n'+item['focus']]
    if item['states']:
        md.append('관련 상태: '+', '.join(f'[{sid}](#{sid.lower()})' for sid in item['states']))
md += ['## 자료 사용 안내', 'HTML 문서는 서버 없이 index.html을 브라우저에서 열어 볼 수 있습니다. 다른 위치로 옮길 때는 HTML만 복사하지 말고 화면집 폴더 전체 또는 ZIP을 함께 사용하세요. 화면 사진의 예시 데이터는 실제 전달 기록이 아닙니다.']
(ROOT / 'README.md').write_text('\n\n'.join(md)+'\n', encoding='utf-8')
(ROOT / 'brand-icon.png').write_bytes((ROOT.parents[2] / 'public' / 'icon.png').read_bytes())

# Contact sheets remain outside the final document bundle.
qa = ROOT.parents[4] / '.tmp' / 'screen-guide-qa'
qa.mkdir(parents=True, exist_ok=True)
for mode in MODES:
    canvas = Image.new('RGB', (1600, 2560), '#eaf0ed')
    draw = ImageDraw.Draw(canvas)
    for i, item in enumerate(ALL):
        x,y=(i%4)*400,(i//4)*320
        draw.text((x+12,y+9),f"{item['id']} {item['title']}",font=small_font,fill='#17324d')
        img=Image.open(ROOT/item['images'][mode]['file'])
        img=ImageOps.contain(img,(376,275),Image.Resampling.LANCZOS)
        canvas.paste(img,(x+12,y+38))
    canvas.save(qa / f'{mode}.jpg', quality=94)

archive = ROOT.parent / 'paperplane-screen-guide.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for filename in ['index.html','guide.css','guide.js','README.md','brand-icon.png','capture-manifest.json','content.json']:
        bundle.write(ROOT/filename,filename)
    for folder in ['screenshots','comparisons']:
        for file in sorted((ROOT/folder).glob('*.jpg')):
            bundle.write(file,file.relative_to(ROOT))
print(json.dumps({'screens':len(DATA['screens']),'states':len(DATA['states']),'photos':len(manifest),'html':str(ROOT/'index.html'),'markdown':str(ROOT/'README.md'),'zip':str(archive),'qa':str(qa)},ensure_ascii=False))
