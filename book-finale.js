(() => {
  'use strict';
  const app = document.getElementById('app');
  const world = window.STORY_WORLD;
  if (!app || !world) return;
  const questions = world.chronicle?.quiz || [];

  const journey = [
    ['mountain-lesson', 'Dağ kulübesindeki ilk ders'],
    ['central-city', 'Merkez Şehir’e varış'],
    ['ragewind-meeting', 'Ragewind’de karşılaşma'],
    ['three-arrows', 'Aragorn’un üç oku'],
    ['healing-circle', 'Ron’un şifa çemberi'],
    ['divine-awakening', 'Frosthold’da ilahi uyanış'],
    ['frosthold-renewed', 'Frosthold’da yeni bir sabah'],
  ].flatMap(([id, title]) => {
    const scene = world.scenes.find(item => item.id === id);
    return scene ? [{ ...scene, title }] : [];
  });

  const dialog = document.createElement('dialog');
  dialog.id = 'book-finale';
  dialog.setAttribute('aria-labelledby', 'book-finale-title');
  dialog.innerHTML = `
    <header class="finale-header">
      <h2 id="book-finale-title">Frosthold’un ardından</h2>
      <form method="dialog"><button class="finale-close" aria-label="Final eklerini kapat" autofocus>×</button></form>
    </header>
    <nav class="finale-menu" aria-label="Final ekleri">
      <button type="button" data-finale-view="compare" aria-current="true" aria-controls="finale-compare">Önce ve sonra</button>
      <button type="button" data-finale-view="letters" aria-controls="finale-letters">Mektuplar</button>
      <button type="button" data-finale-view="album" aria-controls="finale-album">Final albümü</button>
      <button type="button" data-finale-view="newspaper" aria-controls="finale-newspaper">Gazete</button>
      ${questions.length ? '<button type="button" data-finale-view="quiz" aria-controls="finale-quiz">Bilgi testi</button>' : ''}
    </nav>
    <div class="finale-content">
      <section id="finale-compare" data-finale-panel="compare">
        <h3>Frosthold’un iki hâli</h3>
        <div class="finale-compare-art">
          <img src="./assets/images/frosthold-final-sonra.webp" width="1080" height="720" loading="lazy" alt="Gün doğumunda yeniden kurulan Frosthold.">
          <img class="finale-before" src="./assets/images/frosthold-final-once.webp" width="1080" height="720" loading="lazy" alt="Aynı dağ yamacında, kar altındaki Frosthold harabeleri.">
          <span class="finale-divider" aria-hidden="true"></span>
        </div>
        <label class="finale-range">
          <span class="sr-only">Frosthold’un yıkılmış ve yeniden kurulan hâli arasındaki sınır</span>
          <input type="range" min="0" max="100" value="50" aria-valuetext="Yarım yıkılmış, yarım yeniden kurulmuş Frosthold">
          <span aria-hidden="true">Yıkılıştan sonra</span>
          <span aria-hidden="true">Yeniden kurulduğunda</span>
        </label>
      </section>
      <section id="finale-letters" data-finale-panel="letters" hidden>
        <h3>Finale özel iki mektup</h3>
        <details class="finale-letter" open>
          <summary>Fredo’dan ustasına</summary>
          <div class="finale-letter-paper">
            <img src="./assets/images/mountain-lesson-480.webp" width="480" height="319" loading="lazy" alt="Fredo ile ustası karlı dağ kulübesinin önünde.">
            <p>Ustam,</p>
            <p>Kulübenin önünde bana koca bir kayanın içindeki tek kum tanesini oynatmayı öğretmiştiniz. Bugün meydandaki son taşı yerine koyarken elim yine o günkü gibi titredi. Bu kez yanımda bir şehri birlikte kurduğum insanlar vardı.</p>
            <p>İlk kar yağdığında sizi Frosthold’a bekliyorum. Pencerenin yanındaki yerinizi ayırdım. Çayı da her zamanki gibi demleyeceğim.</p>
            <p class="finale-signature">Öğrenciniz, Fredo</p>
          </div>
        </details>
        <details class="finale-letter">
          <summary>Aisha’dan Fredo’ya</summary>
          <div class="finale-letter-paper">
            <img src="./assets/images/frosthold-renewed-480.webp" width="480" height="319" loading="lazy" alt="Fredo ile Aisha yeniden kurulan Frosthold meydanında el ele.">
            <p>Fredo,</p>
            <p>Ragewind’de çözemediğim o büyüyü nasıl anlattığını hatırlıyor musun? Eve döner dönmez defterime yazmıştım. Bugün defteri açınca kenarına küçük harflerle adını da yazdığımı gördüm.</p>
            <p>Yarın güneş doğarken meydanda buluşalım. Bu kez acelemiz yok. Yol boyunca bana dağdaki kulübeyi anlatırsın.</p>
            <p class="finale-signature">Aisha</p>
            <details class="finale-reply">
              <summary>Mektuba cevap yaz</summary>
              <form class="finale-reply-form">
                <label for="finale-reply-text">Aisha’ya cevabın</label>
                <textarea id="finale-reply-text" rows="5" maxlength="2400" placeholder="Sevgili Aisha," aria-describedby="finale-reply-help"></textarea>
                <p id="finale-reply-help">Cevabın yalnızca bu tarayıcıda saklanır.</p>
                <button type="submit">Cevabı kaydet</button>
                <p class="finale-reply-status" role="status"></p>
              </form>
            </details>
          </div>
        </details>
      </section>
      <section id="finale-album" data-finale-panel="album" hidden>
        <h3>Yolculuğun resimli albümü</h3>
        <figure class="finale-album-frame">
          <img width="1200" height="800" alt="">
          <figcaption aria-live="polite"><strong></strong><p></p></figcaption>
        </figure>
        <div class="finale-album-controls">
          <button type="button" data-album-step="-1">← Önceki</button>
          <output aria-label="Albümdeki sahne"></output>
          <button type="button" data-album-step="1">Sonraki →</button>
        </div>
      </section>
      <section id="finale-newspaper" data-finale-panel="newspaper" hidden>
        <div class="finale-newspaper">
          <header class="finale-newspaper-head">
            <h3>Frosthold Gazetesi</h3>
            <p>İlk sayı · Yeniden kuruluş</p>
          </header>
          <article class="finale-newspaper-lead">
            <h4>Meydanın ilk pazarı</h4>
            <p>Frosthold’un büyük meydanında bu sabah ilk tezgâhlar açıldı. Dağ köylerinden gelenler bal ve yün sattı. Fırıncılar, meydanı onaran ustalara ilk somunları ayırdı. Gelecek hafta pazara komşu krallıklardan tüccarlar da katılacak.</p>
            <figure>
              <img src="./assets/images/frosthold-final-sonra.webp" width="1080" height="720" loading="lazy" alt="Gün doğarken yeniden kurulan Frosthold ve evlerinin arasından geçen sokaklar.">
              <figcaption>Yeni Frosthold’da sabah.</figcaption>
            </figure>
          </article>
          <div class="finale-newspaper-briefs">
            <article>
              <h4>Okul yeniden açıldı</h4>
              <p>Meydanın yanındaki okul ilk öğrencilerini karşıladı. Kütüphaneden getirilen kitaplar raflara dizildi. İlk dersin ardından öğrenciler, avluya astıkları panoya öğrenmek istedikleri konuları yazdı.</p>
            </article>
            <article>
              <h4>Köprünün fenerleri yandı</h4>
              <p>Kuzey köprüsüne yeni fenerler takıldı. Mahalleli, akşam ilk fenerleri yakmak için köprü başında buluştu. Köprüden geçen ilk yolcular, dağ köylerine dönen pazar esnafıydı.</p>
            </article>
          </div>
        </div>
      </section>
      ${questions.length ? '<section id="finale-quiz" data-finale-panel="quiz" hidden><h3>Yolculuğu ne kadar hatırlıyorsun?</h3><div class="finale-quiz-body"></div></section>' : ''}
    </div>`;
  app.append(dialog);

  const replyForm = dialog.querySelector('.finale-reply-form');
  const reply = replyForm.querySelector('textarea');
  const replyStatus = replyForm.querySelector('[role="status"]');
  const replyKey = `${window.BOOK_PLAN.storageId}:aisha-reply:v1`;
  let savedReply = '';
  try { savedReply = localStorage.getItem(replyKey) || ''; } catch {}
  reply.value = savedReply;
  reply.addEventListener('input', () => {
    replyStatus.textContent = reply.value === savedReply ? '' : 'Henüz kaydedilmedi.';
  });
  replyForm.addEventListener('submit', event => {
    event.preventDefault();
    const value = reply.value.trim();
    try {
      if (value) localStorage.setItem(replyKey, value);
      else localStorage.removeItem(replyKey);
      reply.value = savedReply = value;
      replyStatus.textContent = value ? 'Cevabın bu tarayıcıya kaydedildi.' : 'Kayıtlı cevap temizlendi.';
    } catch {
      replyStatus.textContent = 'Cevap kaydedilemedi. Tarayıcının depolama iznini kontrol et.';
    }
  });

  const sections = [...dialog.querySelectorAll('[data-finale-panel]')];
  const tabs = [...dialog.querySelectorAll('[data-finale-view]')];
  const range = dialog.querySelector('.finale-range input');
  const comparison = dialog.querySelector('.finale-compare-art');
  const album = dialog.querySelector('#finale-album');
  const albumImage = album.querySelector('img');
  const albumButtons = [...album.querySelectorAll('[data-album-step]')];
  let sceneIndex = 0;

  function compare() {
    const percent = Number(range.value);
    comparison.style.setProperty('--before-width', percent + '%');
    range.setAttribute('aria-valuetext', `Yüzde ${percent} yıkılmış, yüzde ${100 - percent} yeniden kurulmuş Frosthold`);
  }
  range.addEventListener('input', compare);
  compare();

  function showScene() {
    const scene = journey[sceneIndex];
    if (!scene) return;
    albumImage.alt = scene.alt;
    albumImage.src = './' + scene.src;
    album.querySelector('figcaption strong').textContent = scene.title;
    album.querySelector('figcaption p').textContent = scene.alt;
    album.querySelector('output').textContent = `${sceneIndex + 1} / ${journey.length}`;
    albumButtons[0].disabled = sceneIndex === 0;
    albumButtons[1].disabled = sceneIndex === journey.length - 1;
  }
  for (const button of albumButtons) {
    button.addEventListener('click', () => {
      sceneIndex += Number(button.dataset.albumStep);
      showScene();
    });
  }
  if (questions.length) setupQuiz(dialog.querySelector('.finale-quiz-body'));

  function setupQuiz(body) {
    let answers = [];
    const make = (tag, text) => {
      const node = document.createElement(tag);
      if (text !== undefined) node.textContent = text;
      return node;
    };
    function action(label, click) {
      const control = make('button', label);
      control.type = 'button';
      control.addEventListener('click', click);
      return control;
    }
    function focusHeading(node) {
      node.tabIndex = -1;
      node.focus();
    }

    function questionPage() {
      const index = answers.length;
      const question = questions[index];
      const step = make('p', `Soru ${index + 1} / ${questions.length}`);
      step.className = 'finale-quiz-step';
      const form = make('form');
      const choices = make('fieldset');
      const questionLabel = make('legend', question.question);
      choices.append(questionLabel);
      const options = question.choices.map((choice, number) => {
        const label = make('label');
        const radio = make('input');
        radio.type = 'radio';
        radio.name = 'quiz-answer';
        radio.value = String(number);
        radio.required = true;
        label.append(radio, make('span', choice));
        choices.append(label);
        return label;
      });
      const check = make('button', 'Cevabı kontrol et');
      check.type = 'submit';
      const feedback = make('div');
      feedback.className = 'finale-quiz-feedback';
      feedback.setAttribute('role', 'status');
      const controls = make('div');
      controls.className = 'finale-quiz-controls';
      controls.append(check);
      form.append(choices, feedback, controls);
      form.addEventListener('submit', event => {
        event.preventDefault();
        const selected = choices.querySelector('input:checked');
        if (!selected || choices.disabled) return;
        const answer = Number(selected.value);
        answers.push(answer);
        choices.disabled = true;
        options[question.answer].dataset.answer = 'correct';
        if (answer !== question.answer) options[answer].dataset.answer = 'wrong';
        const result = answer === question.answer ? 'Doğru cevap!' : 'Doğru cevap · ' + question.choices[question.answer];
        feedback.append(make('strong', result), make('blockquote', question.quote));
        const done = answers.length === questions.length;
        const next = action(done ? 'Sonucu gör' : 'Sonraki soru →', done ? resultPage : questionPage);
        controls.replaceChildren(next);
        next.focus({ preventScroll: true });
      });
      body.replaceChildren(step, form);
      focusHeading(questionLabel);
    }

    function resultPage() {
      const correct = answers.filter((answer, index) => answer === questions[index].answer).length;
      const score = make('h4', `${questions.length} soruda ${correct} doğru`);
      score.className = 'finale-quiz-score';
      const review = make('ol');
      review.className = 'finale-quiz-review';
      questions.forEach((question, index) => {
        const item = make('li');
        const answer = question.choices[question.answer];
        const correct = answers[index] === question.answer;
        item.append(make('strong', question.question), make('p', (correct ? 'Doğru · ' : 'Doğru cevap · ') + answer),
          action('Sahneye dön', async () => {
            dialog.close();
            await window.BookReader.seek(question.sourceStart, { preferText: true });
            window.BookChronicle?.readingFocus();
          }));
        review.append(item);
      });
      body.replaceChildren(score, review, action('Tekrar çöz', () => {
        answers = [];
        questionPage();
      }));
      focusHeading(score);
    }

    const intro = make('p', 'Dağ kulübesinden Frosthold meydanına uzanan yolculuktan beş soru.');
    body.append(intro, action('Teste başla', questionPage));
  }

  function show(view) {
    for (const section of sections) section.hidden = section.dataset.finalePanel !== view;
    for (const button of tabs) {
      if (button.dataset.finaleView === view) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
    if (view === 'album') showScene();
    dialog.scrollTop = 0;
  }
  for (const button of tabs) button.addEventListener('click', () => show(button.dataset.finaleView));

  function mount() {
    const page = document.querySelector('#book-spread .end-page .page-content');
    if (!page || page.querySelector('.finale-entry')) return;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'finale-entry';
    trigger.textContent = 'Final eklerini aç';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', dialog.id);
    for (const type of ['pointerdown', 'pointerup']) trigger.addEventListener(type, event => event.stopPropagation());
    trigger.addEventListener('click', event => {
      event.stopPropagation();
      document.dispatchEvent(new CustomEvent('book:panel-open', { detail: 'book-finale' }));
      dialog.showModal();
      show('compare');
    });
    page.querySelector('.folio').before(trigger);
  }
  document.addEventListener('book:location', mount);
  mount();
})();
