;(() => {
  // 이벤트 참여 주소. 수급 전이라 비워 둔다.
  const EVENT_URL = '';
  const D_DAY = '2026-11-21';
  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

  const seoulToday = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const pick = (type) => parts.find((part) => part.type === type).value;
    return `${pick('year')}-${pick('month')}-${pick('day')}`;
  };

  const dayDiff = (from, to) => {
    const [y1, m1, d1] = from.split('-').map(Number);
    const [y2, m2, d2] = to.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  };

  const dateParts = (iso) => {
    const [year, month, day] = iso.split('-').map(Number);
    const weekday = WEEK[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
    return { year, month, day, weekday };
  };

  const formatDate = (iso) => {
    const { month, day, weekday } = dateParts(iso);
    return `${month}월 ${day}일(${weekday})`;
  };

  const formatBadgeDate = (iso) => {
    const { month, day, weekday } = dateParts(iso);
    return `${month}월 ${day}일 (${weekday})`;
  };

  const restLabel = (iso) => {
    const diff = dayDiff(iso, D_DAY);
    if (diff > 0) return `D-${diff}`;
    if (diff === 0) return 'D-DAY';
    return `D+${-diff}`;
  };

  const eventDetail = document.querySelector('.event-detail');
  const eventDetailOpen = document.querySelector('[aria-controls="event-details"]');
  const eventDetailClose = eventDetail.querySelector('.close');
  const eventModalQuery = window.matchMedia('(min-width: 1024px)');
  let eventReturnFocus = null;

  const isEventModal = () => eventModalQuery.matches;

  const eventFocusable = () => [...eventDetail.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.getClientRects().length > 0);

  const openEvent = () => {
    eventReturnFocus = document.activeElement;
    eventDetail.classList.add('is-open');
    eventDetail.tabIndex = -1;
    eventDetail.setAttribute('role', 'dialog');
    eventDetail.setAttribute('aria-modal', 'true');
    eventDetail.setAttribute('aria-labelledby', 'event-detail-title');
    document.querySelector('#container').inert = true;
    document.querySelector('.date-lab')?.setAttribute('inert', '');
    eventDetail.offsetWidth;
    eventDetailClose.focus();
  };

  const closeEvent = ({ restoreFocus = true } = {}) => {
    if (!eventDetail.classList.contains('is-open')) return;
    eventDetail.classList.remove('is-open');
    eventDetail.removeAttribute('role');
    eventDetail.removeAttribute('aria-modal');
    eventDetail.removeAttribute('aria-labelledby');
    document.querySelector('#container').inert = false;
    document.querySelector('.date-lab')?.removeAttribute('inert');
    if (restoreFocus) eventReturnFocus?.focus();
  };

  eventDetailOpen.addEventListener('click', (event) => {
    if (!isEventModal()) return;
    event.preventDefault();
    openEvent();
  });

  eventDetailClose.addEventListener('click', () => {
    if (!isEventModal()) return;
    closeEvent();
  });

  document.addEventListener('keydown', (event) => {
    if (!isEventModal() || !eventDetail.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeEvent();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = eventFocusable();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  eventModalQuery.addEventListener('change', () => {
    if (isEventModal() || !eventDetail.classList.contains('is-open')) return;
    closeEvent({ restoreFocus: false });
    eventDetail.scrollIntoView({ block: 'start' });
  });

  const boot = async () => {
    const response = await fetch('/ibs15th/stories.json');
    if (!response.ok) throw new Error('stories.json');
    const list = await response.json();
    const stories = Object.fromEntries(list.map((story) => [String(story.id), story]));

    const previewDate = () => document.querySelector('#date-lab-input')?.value || seoulToday();
    let currentDate = previewDate();

    const storyPop = document.querySelector('#story-pop');
    const soonPop = document.querySelector('#story-soon');
    const storyBadge = document.querySelector('#story-pop-badge');
    const storyTitle = document.querySelector('#story-pop-title');
    const storyBody = document.querySelector('#story-pop-body');
    const storyView = document.querySelector('#story-view');
    const quizView = document.querySelector('#quiz-view');
    const quizQuestion = document.querySelector('#story-pop-question');
    const quizOptions = document.querySelector('#story-pop-options');
    const quizResult = document.querySelector('#story-pop-result');
    const quizQr = document.querySelector('#story-pop-qr');
    const quizEvent = document.querySelector('#story-pop-event');
    const soonBadge = document.querySelector('#story-soon-badge');
    const soonTitle = document.querySelector('#story-soon-title');
    const countEl = document.querySelector('#calendar-total-count');
    const items = [...document.querySelectorAll('.calendar-list .item')];

    let activeItem = null;
    let solved = false;

    const showResult = (state, message) => {
      quizResult.dataset.state = state;
      quizResult.textContent = message;
      quizResult.hidden = false;
    };

    const resetQuiz = (story) => {
      solved = false;
      quizResult.hidden = true;
      quizResult.textContent = '';
      delete quizResult.dataset.state;
      quizEvent.hidden = true;
      quizQr.hidden = true;
      quizOptions.replaceChildren();

      story.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'story-pop-option';
        const num = document.createElement('span');
        num.className = 'num';
        num.textContent = String(index + 1);
        const text = document.createElement('span');
        text.className = 'txt';
        text.textContent = choice;
        button.append(num, text);
        button.addEventListener('click', () => grade(story, index));
        quizOptions.append(button);
      });
    };

    const grade = (story, index) => {
      if (solved) return;
      const buttons = [...quizOptions.children];
      buttons.forEach((button, buttonIndex) => {
        button.classList.toggle('is-selected', buttonIndex === index);
        button.classList.remove('is-wrong');
      });

      if (index !== story.answer) {
        buttons[index].classList.add('is-wrong');
        quizEvent.hidden = true;
        quizQr.hidden = true;
        showResult('bad', '오답입니다. 다시 퀴즈를 풀어주세요.');
        return;
      }

      solved = true;
      buttons.forEach((button) => {
        button.disabled = true;
      });

      const eligible = activeItem.dataset.date === currentDate;
      if (eligible) {
        showResult('ok', '정답입니다. 이벤트 참여가 가능합니다.');
        quizEvent.hidden = false;
        quizQr.hidden = false;
        return;
      }

      showResult('late', '정답입니다. 이벤트 참여는 해당 일자에 공개된 콘텐츠에 한해서만 가능합니다.');
    };

    const openSoon = (iso) => {
      const { month, day } = dateParts(iso);
      soonBadge.textContent = `${formatBadgeDate(iso)} · Open`;
      soonTitle.textContent = `${month}월 ${day}일에 공개되는 내용입니다.`;
      if (storyPop.open) storyPop.close();
      if (!soonPop.open) soonPop.showModal();
      soonPop.focus();
    };

    const openStory = (item) => {
      const story = stories[item.dataset.story];
      if (!story) return;
      activeItem = item;
      storyBadge.textContent = `${formatBadgeDate(item.dataset.date)} · ${story.badge}`;
      storyTitle.textContent = story.card;
      storyBody.innerHTML = story.body;
      storyView.hidden = false;
      quizView.hidden = true;
      storyPop.setAttribute('aria-labelledby', 'story-pop-title');
      if (soonPop.open) soonPop.close();
      if (!storyPop.open) storyPop.showModal();
      storyPop.focus();
    };

    document.querySelector('#story-quiz-open').addEventListener('click', () => {
      const story = stories[activeItem.dataset.story];
      resetQuiz(story);
      quizQuestion.textContent = story.question;
      storyView.hidden = true;
      quizView.hidden = false;
      storyPop.setAttribute('aria-labelledby', 'story-quiz-title');
      storyPop.focus();
    });

    if (EVENT_URL) {
      quizEvent.href = EVENT_URL;
      quizEvent.target = '_blank';
      quizEvent.rel = 'noopener noreferrer';
    }

    quizEvent.addEventListener('click', (event) => {
      if (!EVENT_URL) event.preventDefault();
    });

    [storyPop, soonPop].forEach((dialog) => {
      dialog.querySelectorAll('[data-close]').forEach((button) => {
        button.addEventListener('click', () => dialog.close());
      });
    });

    const applyState = () => {
      // before: 11월 21일 전 / after: 11월 21일부터. 표시는 CSS에서 연결한다.
      document.documentElement.dataset.phase = currentDate >= D_DAY ? 'after' : 'before';
      let opened = 0;

      items.forEach((item) => {
        const date = item.dataset.date;
        const weekOpen = currentDate >= item.closest('.row').dataset.week;
        const isToday = date === currentDate;

        item.classList.toggle('is-lock', !weekOpen);
        item.classList.toggle('is-today', weekOpen && isToday);
        if (weekOpen && isToday) item.setAttribute('aria-current', 'date');
        else item.removeAttribute('aria-current');
        const { month, day, weekday } = dateParts(date);
        item.querySelector('.date').innerHTML = `
          <span>${month}월 ${day}일 <span>(${weekday})</span></span>
        `;
        item.querySelector('.rest').textContent = restLabel(date);
        if (date <= currentDate) opened += 1;

        const opener = item.querySelector('.opener');
        const buttonLabel = isToday ? '오늘의 이야기' : '이야기 보기';
        opener.textContent = buttonLabel;
        opener.setAttribute('aria-label', `${formatDate(date)} ${buttonLabel}`);
      });

      if (countEl) countEl.textContent = `오늘까지 ${opened}개 공개`;
    };

    items.forEach((item) => {
      item.querySelector('.opener').addEventListener('click', () => {
        const date = item.dataset.date;
        const weekOpen = currentDate >= item.closest('.row').dataset.week;
        if (!weekOpen || date > currentDate) {
          openSoon(date);
          return;
        }
        openStory(item);
      });
    });

    applyState();

    document.querySelector('#open-today')?.addEventListener('click', () => {
      const todayItem = document.querySelector('.calendar-list .item.is-today');
      if (todayItem) {
        todayItem.querySelector('.opener').click();
        return;
      }
      document.querySelector('.main-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.querySelector('#date-lab-input')?.addEventListener('change', () => {
      currentDate = previewDate();
      applyState();
    });
  };

  boot();
})();

;(() => {
  const mainMovie = document.querySelector('.main-movie');
  if (!mainMovie) return;
  const box = mainMovie.querySelector('.movie-box');
  const video = box.querySelector('video');
  const togglePlay = (state) => {
    if (state) {
      video.play();
      box.classList.add('is-playing');
    } else {
      video.pause();
      box.classList.remove('is-playing');
    }
  };
  box.addEventListener('click', () => {
    togglePlay(video.paused);
  });
  video.addEventListener('ended', () => {
    togglePlay(false);
    setTimeout(() => {
      video.currentTime = 0;
    }, 100);
  });
})();

;(() => { // 임시 테스트용. 반영 전에 이 함수만 삭제
  const style = document.createElement('style');
  style.textContent = `
    .date-lab {
      position: fixed; left: 4px; bottom: 4px; z-index: 20;
      padding: 10px; border-radius: 8px; background: rgba(255,255,255,.8); color: #16325C; gap: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, .28); font-weight: 700; font-size: 14px; line-height: 1.2; display: grid; grid-template-columns: 1fr auto; 
    }
    .date-lab-parts { display: flex; align-items: center; gap: 12px; grid-column: 1 / 3; }
    .date-lab-part { display: flex; align-items: center; gap: 3px; }
    .date-lab-value { font-size: 18px; font-variant-numeric: tabular-nums; font-weight: 500; }
    .date-lab-btns { display: flex; gap: 2px; }
    .date-lab button {
      width: 24px; aspect-ratio: 1; border: 1px solid #16325C; border-radius: 6px; background: #fff; color: #16325C; cursor: pointer;
    }
    .date-lab button:hover:not(:disabled) { background: #EAF3FF; }
    .date-lab button:disabled { opacity: .35; cursor: default; }
    .date-lab button:focus-visible { outline: 2px solid #1F5EFF; outline-offset: 2px; }
    .date-lab-presets { display: flex; gap: 6px;}
    .date-lab-presets button { width: auto; aspect-ratio: auto; padding: 4px; font-weight: 700; }
    .date-lab-presets button.is-current { background: #16325C; color: #fff; }
    .date-lab .date-lab-controls { display: flex; gap: 4px; }
    .date-lab .date-lab-control-btn {padding: 4px; height: auto; aspect-ratio: auto; width: auto; }
    #date-lab-maximize { display: none; }
    .date-lab.is-minimized {
      padding: 4px; opacity: .5; gap: 0;
      .date-lab-parts { display: none; }
      .date-lab-presets { display: none; }
      #date-lab-minimize { display: none; }
      #date-lab-maximize { display: block; }
    }
  `;
  document.head.append(style);

  const lab = document.createElement('div');
  lab.className = 'date-lab';
  lab.setAttribute('role', 'group');
  lab.setAttribute('aria-labelledby', 'date-lab-label');
  lab.innerHTML = `
    <p style="font-size: 1.1em;">테스트용 컨트롤러</p>
    <div class="date-lab-parts">
      <div class="date-lab-part">
        <span class="date-lab-value" data-show="year">2026</span>
        <span class="date-lab-btns">
          <button type="button" data-unit="year" data-step="1" aria-label="연도 올리기">▲</button>
          <button type="button" data-unit="year" data-step="-1" aria-label="연도 내리기">▼</button>
        </span>
      </div>
      <div class="date-lab-part">
        <span class="date-lab-value" data-show="month">11</span>
        <span class="date-lab-btns">
          <button type="button" data-unit="month" data-step="1" aria-label="월 올리기">▲</button>
          <button type="button" data-unit="month" data-step="-1" aria-label="월 내리기">▼</button>
        </span>
      </div>
      <div class="date-lab-part">
        <span class="date-lab-value" data-show="day">01</span>
        <span class="date-lab-btns">
          <button type="button" data-unit="day" data-step="1" aria-label="일 올리기">▲</button>
          <button type="button" data-unit="day" data-step="-1" aria-label="일 내리기">▼</button>
        </span>
      </div>
    </div>
    <div class="date-lab-presets">
      <button type="button" data-date="2026-11-02">D-19</button>
      <button type="button" data-date="2026-11-20">D-1</button>
      <button type="button" data-date="2026-11-21">당일</button>
    </div>
    <div class="date-lab-controls">
      <button type="button" class="date-lab-control-btn" aria-label="최소화" id="date-lab-minimize">최소화</button>
      <button type="button" class="date-lab-control-btn" aria-label="최대화" id="date-lab-maximize">최대화</button>
      <button type="button" class="date-lab-control-btn" aria-label="닫기" id="date-lab-close">닫기</button>
    </div>
    <input type="hidden" id="date-lab-input" value="">
  `;
  document.body.append(lab);

  const input = lab.querySelector('#date-lab-input');
  const shows = {
    year: lab.querySelector('[data-show="year"]'),
    month: lab.querySelector('[data-show="month"]'),
    day: lab.querySelector('[data-show="day"]'),
  };
  const seoulToday = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const pick = (type) => Number(parts.find((part) => part.type === type).value);
    return { year: pick('year'), month: pick('month'), day: pick('day') };
  };
  const today = seoulToday();
  let year = today.year;
  let month = today.month;
  let day = today.day;
  const pad = (value) => String(value).padStart(2, '0');
  const lastDay = () => new Date(year, month, 0).getDate();

  const paint = () => {
    day = Math.min(day, lastDay());
    input.value = `${year}-${pad(month)}-${pad(day)}`;
    shows.year.textContent = String(year);
    shows.month.textContent = pad(month);
    shows.day.textContent = pad(day);
    lab.querySelector('[data-unit="year"][data-step="1"]').disabled = year >= 2027;
    lab.querySelector('[data-unit="year"][data-step="-1"]').disabled = year <= 2026;
    lab.querySelector('[data-unit="month"][data-step="1"]').disabled = month >= 12;
    lab.querySelector('[data-unit="month"][data-step="-1"]').disabled = month <= 1;
    lab.querySelector('[data-unit="day"][data-step="1"]').disabled = day >= lastDay();
    lab.querySelector('[data-unit="day"][data-step="-1"]').disabled = day <= 1;
    lab.querySelectorAll('[data-date]').forEach((button) => {
      button.classList.toggle('is-current', button.dataset.date === input.value);
    });
    input.dispatchEvent(new Event('change'));
  };

  lab.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.disabled || button.classList.contains('date-lab-close')) return;
    if (button.dataset.date) {
      const [nextYear, nextMonth, nextDay] = button.dataset.date.split('-').map(Number);
      year = nextYear;
      month = nextMonth;
      day = nextDay;
      paint();
      return;
    }
    const step = Number(button.dataset.step);
    if (button.dataset.unit === 'year') year += step;
    if (button.dataset.unit === 'month') month += step;
    if (button.dataset.unit === 'day') day += step;
    paint();
  });

  paint();
  lab.querySelector('#date-lab-close').addEventListener('click', () => {
    lab.remove();
  });
  lab.querySelector('#date-lab-minimize').addEventListener('click', () => {
    lab.classList.add('is-minimized');
  });
  lab.querySelector('#date-lab-maximize').addEventListener('click', () => {
    lab.classList.remove('is-minimized');
  });
})();