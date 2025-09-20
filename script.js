/* ===== 育ちの場　歩｜script.js（安全化・フル置換） ===== */

/* 年表示 */
(() => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

/* モバイルナビ開閉 */
(() => {
  const toggle = document.querySelector('.nav-toggle');
  const navList = document.getElementById('nav-list');
  if (!toggle || !navList) return;
  toggle.addEventListener('click', () => {
    const open = navList.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  navList.addEventListener('click', (e) => {
    if (e.target.closest('a')) navList.classList.remove('open');
  });
})();

/* スムーススクロール（ヘッダー分オフセット） */
(() => {
  const header = document.querySelector('.site-header');
  const getHeaderH = () => (header?.offsetHeight || 64);
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      const y = el.getBoundingClientRect().top + window.scrollY - (getHeaderH() - 2);
      window.scrollTo({ top: y, behavior: 'smooth' });
      history.pushState(null, '', id);
    });
  });
})();

/* 現在セクションをナビに反映（CTA除外） */
(() => {
  const header = document.querySelector('.site-header');
  const getHeaderH = () => (header?.offsetHeight || 64);
  const sections = document.querySelectorAll('main[id], section[id]');
  const navLinks = [...document.querySelectorAll('.primary-nav a:not(.btn)')]; // CTA除外
  if (!sections.length || !navLinks.length || !('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = '#' + entry.target.id;
      navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === id));
    });
  }, { rootMargin: `-${getHeaderH() + 10}px 0px -70% 0px`, threshold: 0 });

  sections.forEach(s => io.observe(s));
})();

/* FAQ：一つ開いたら他を閉じる（toggle未対応ブラウザでも安全） */
(() => {
  const acc = document.querySelector('[data-accordion]');
  if (!acc) return;
  acc.addEventListener('click', (e) => {
    const sum = e.target.closest('summary');
    if (!sum) return;
    const cur = sum.parentElement;
    requestAnimationFrame(() => { // 状態反映後に他を閉じる
      if (cur.open) {
        acc.querySelectorAll('details').forEach(d => { if (d !== cur) d.open = false; });
      }
    });
  });
})();

/* ============ Slider（自動/ループ/スワイプ/ドット/Lightbox/横長白背景） ============ */
(() => {
  const reduceMotion = matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.slider').forEach((root) => {
    const track = root.querySelector('.slides');
    const prev = root.querySelector('.sl-nav.prev');
    const next = root.querySelector('.sl-nav.next');
    let dotsWrap = root.querySelector('.sl-dots');

    if (!track) return;
    const slides = Array.from(track.children).filter(el => el.tagName === 'FIGURE');
    if (!slides.length) return;

    // ドット容器がなければ作る
    if (!dotsWrap) {
      dotsWrap = document.createElement('div');
      dotsWrap.className = 'sl-dots';
      root.appendChild(dotsWrap);
    }

    const perView = () => {
      // data-per-view を優先（未指定なら1）
      const v = parseInt(root.dataset.perView || '1', 10);
      return Number.isFinite(v) && v > 0 ? v : 1;
    };

    let index = 0;
    let timer = null;
    const interval = Number(root.dataset.autoplay || 3000);
    const loop = root.dataset.loop !== 'false';

    // ドット生成
    dotsWrap.innerHTML = '';
    slides.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `${i + 1}枚目へ`);
      b.addEventListener('click', () => goTo(i, true));
      dotsWrap.appendChild(b);
    });

    function update() {
      const per = perView();
      track.style.transform = `translateX(${-index * (100 / per)}%)`;

      // ドット更新（存在しない場合も安全）
      dotsWrap.querySelectorAll('button').forEach((b, i) => {
        b.setAttribute('aria-current', i === index ? 'true' : 'false');
      });

      // 横長（data-wide）対応：可視範囲を抽出して .sq.wide を付与
      const visibleIdx = [];
      for (let i = 0; i < per; i++) visibleIdx.push((index + i) % slides.length);
      slides.forEach(s => s.querySelector('.sq')?.classList.remove('wide'));
      visibleIdx.forEach(i => {
        const fig = slides[i];
        if (fig?.dataset?.wide === 'true') {
          fig.querySelector('.sq')?.classList.add('wide'); // 背景白
        }
      });
    }

    function goTo(i, stopAuto = false) {
      const per = perView();
      const last = slides.length - 1;
      index = loop ? (i + slides.length) % slides.length : Math.max(0, Math.min(i, last - (per - 1)));
      update();
      if (stopAuto) restart();
    }
    const nextSlide = () => goTo(index + 1);
    const prevSlide = () => goTo(index - 1);

    // 矢印
    prev?.addEventListener('click', prevSlide);
    next?.addEventListener('click', nextSlide);

    // オートプレイ
    function start() { if (!reduceMotion) { stop(); timer = setInterval(nextSlide, interval); } }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    function restart() { stop(); start(); }

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);
    window.addEventListener('resize', () => update());

    // スワイプ（Pointer Events）
    let startX = 0, dx = 0, dragging = false, pid = null;
    const threshold = 40;
    track.addEventListener('pointerdown', (e) => {
      dragging = true; startX = e.clientX; pid = e.pointerId; dx = 0;
      try { track.setPointerCapture?.(pid); } catch {}
      stop();
    });
    track.addEventListener('pointermove', (e) => { if (dragging) dx = e.clientX - startX; });
    track.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      try { track.releasePointerCapture?.(pid); } catch {}
      if (dx > threshold) prevSlide();
      else if (dx < -threshold) nextSlide();
      else restart();
      dx = 0; pid = null;
    });

    // クリック拡大（Lightbox）
    track.addEventListener('click', (e) => {
      const img = e.target.closest('img');
      if (img) openLightbox(img);
    });

    // 初期化
    update(); start();
  });

  /* Lightbox（動的生成・使わないページでも安全） */
  let lb;
  function openLightbox(imgEl) {
    if (!lb) {
      lb = document.createElement('div');
      lb.className = 'lb-overlay';
      lb.innerHTML = `
        <button class="lb-close" aria-label="閉じる">×</button>
        <img alt="">
        <p class="lb-cap"></p>
      `;
      lb.hidden = true;
      document.body.appendChild(lb);
      lb.addEventListener('click', (e) => {
        if (e.target === lb || e.target.closest('.lb-close')) closeLightbox();
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
    }
    const img = lb.querySelector('img');
    const cap = lb.querySelector('.lb-cap');
    if (img) {
      img.src = imgEl.currentSrc || imgEl.src;
      img.alt = imgEl.alt || '';
    }
    if (cap) {
      const fc = imgEl.closest('figure')?.querySelector('figcaption')?.textContent || '';
      cap.textContent = fc;
    }
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    if (!lb) return;
    lb.hidden = true;
    const img = lb.querySelector('img');
    if (img) img.src = '';
    document.body.style.overflow = '';
  }
})();

/* フォーム：簡易バリデーション & ダミー送信（要素がなければ何もしない） */
(() => {
  const form = document.getElementById('contactForm');
  const statusEl = document.getElementById('formStatus');
  if (!form || !statusEl) return;

  function showStatus(msg, ok = false) {
    statusEl.textContent = msg;
    statusEl.style.color = ok ? '#1a7f37' : '#b4002a';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showStatus('');
    if (!form.checkValidity()) {
      const name = form.elements['name'];
      const email = form.elements['email'];
      const message = form.elements['message'];
      const agree = form.elements['agree'];
      if (!name?.value || name.value.length < 2) showStatus('氏名を2文字以上で入力してください。');
      else if (!email?.validity?.valid) showStatus('有効なメールアドレスを入力してください。');
      else if (!message?.value || message.value.length < 10) showStatus('お問い合わせ内容は10文字以上で入力してください。');
      else if (!agree?.checked) showStatus('プライバシーポリシーへの同意が必要です。');
      else showStatus('未入力の項目をご確認ください。');
      return;
    }
    const payload = {
      name: form.elements['name']?.value.trim(),
      email: form.elements['email']?.value.trim(),
      topic: form.elements['topic']?.value || '',
      message: form.elements['message']?.value.trim(),
      agree: !!form.elements['agree']?.checked,
      ts: new Date().toISOString()
    };
    try {
      await new Promise(r => setTimeout(r, 500)); // ダミー送信
      console.log('send payload', payload);
      showStatus('送信が完了しました。自動返信メールをお送りしました【仮】。', true);
      form.reset();
    } catch (err) {
      console.error(err);
      showStatus('送信に失敗しました。時間をおいて再度お試しください。');
    }
  });
})();
