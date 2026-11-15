const crew = [
  { id: 'luffy', name: 'Luffy', role: 'Capitão • Lutador', type: 'FORÇA', color: 'red', power: 420, emoji: '👒', skill: 'Gomu Gomu!', portrait: 'luffy' },
  { id: 'zoro', name: 'Zoro', role: 'Espadachim', type: 'AGILIDADE', color: 'green', power: 390, emoji: '⚔️', skill: 'Três espadas', portrait: 'zoro' },
  { id: 'nami', name: 'Nami', role: 'Navegadora', type: 'TÉCNICA', color: 'blue', power: 310, emoji: '🌩️', skill: 'Clima-Tact', portrait: 'nami' },
  { id: 'sanji', name: 'Sanji', role: 'Cozinheiro', type: 'RAPIDEZ', color: 'yellow', power: 350, emoji: '🔥', skill: 'Diable Jambe', portrait: 'sanji' },
  { id: 'chopper', name: 'Chopper', role: 'Médico', type: 'TÉCNICA', color: 'blue', power: 275, emoji: '🩺', skill: 'Cura Rumble', portrait: 'chopper' },
  { id: 'robin', name: 'Robin', role: 'Arqueóloga', type: 'AGILIDADE', color: 'green', power: 325, emoji: '🌸', skill: 'Seis Fleur', portrait: 'robin' },
];
const stages = [
  { name: 'Águas turbulentas', enemy: 'Capitão Morgan', title: 'CAPITÃO', hp: 2700, level: 12, attack: 560 },
  { name: 'Porto da vila', enemy: 'Buggy, o Palhaço', title: 'PIRATA', hp: 3900, level: 15, attack: 720 },
  { name: 'A batalha final', enemy: 'Alvida, a Clava', title: 'CHEFE', hp: 5100, level: 18, attack: 880 },
];
const $ = (selector) => document.querySelector(selector);
const crewCards = $('#crewCards');
const state = {
  stage: 0, enemyHp: stages[0].hp, crewHp: 8200, maxCrewHp: 8200, turn: 1,
  selected: null, used: new Set(), skills: new Set(), chain: 0, countdown: 2,
  boost: 1, weaken: false, freeze: false, auto: false, autoTimer: null,
  speed: 1, berries: 12450, gems: 38, busy: false, ended: false,
};

function renderCards() {
  crewCards.innerHTML = crew.map((hero) => `
    <div class="crew-card" data-hero="${hero.id}" role="button" tabindex="0" aria-label="Atacar com ${hero.name}">
      <span class="tap-ring"></span><span class="card-order"></span>
      <span class="card-top"><span class="type-badge ${hero.color}">${hero.type}</span><span class="card-cost">✦ ${hero.power}</span></span>
      <span class="portrait ${hero.portrait}"><i class="hair"></i><i class="face-mark"></i><span class="portrait-icon">${hero.emoji}</span></span>
      <span class="card-name">${hero.name}</span><span class="card-role">${hero.role}</span>
      <span class="power">ATQ ${hero.power}</span>
      <span class="timing-meter"><i></i><b></b></span>
      <button class="skill-chip" data-skill="${hero.id}" title="${hero.skill}">✦ <span>${hero.skill}</span></button>
    </div>`).join('');
}
renderCards();

function updateHud() {
  const stage = stages[state.stage];
  $('#waveLabel').textContent = `ETAPA ${state.stage + 1} DE ${stages.length}`;
  $('#stageName').textContent = stage.name;
  $('#enemyName').textContent = stage.enemy;
  $('.enemy-type').textContent = stage.title;
  $('.enemy-level').textContent = `NV. ${stage.level}`;
  const ratio = Math.max(0, state.enemyHp / stage.hp);
  $('#enemyHpFill').style.width = `${ratio * 100}%`;
  $('#enemyHpText').textContent = `${formatNumber(Math.max(0, state.enemyHp))} / ${formatNumber(stage.hp)}`;
  $('#crewHpFill').style.width = `${Math.max(0, state.crewHp / state.maxCrewHp) * 100}%`;
  $('#crewHpLabel').textContent = `PV ${formatNumber(Math.max(0, state.crewHp))} / ${formatNumber(state.maxCrewHp)}`;
  $('#turnNumber').textContent = String(state.turn).padStart(2, '0');
  $('#chainCount').textContent = state.chain;
  $('#chainWord').textContent = state.chain === 1 ? 'TOQUE' : 'TOQUES';
  $('#enemyCountdown').textContent = state.countdown;
  $('#berryCount').textContent = state.berries.toLocaleString('pt-BR');
  $('#gemCount').textContent = state.gems;
  $('#crewCount').textContent = `${crew.length - state.used.size}/6`;
  $('#enemyStatus').innerHTML = `${state.freeze ? '<span>❄</span> Atordoado' : '<span>✦</span> Pronto para atacar'} <b id="enemyCountdown">${state.countdown}</b>`;
  $('#turnLabel').textContent = state.busy ? 'ATAQUE!' : state.ended ? 'FIM DE JOGO' : 'SUA VEZ';
  $('#battleHint').innerHTML = state.busy ? '<span class="hint-spark">✦</span> Corrente de ataques em andamento…' : state.used.size === crew.length ? '<span class="hint-spark">✦</span> Turno completo! Prepare-se para o contra-ataque.' : '<span class="hint-spark">✦</span> Toque nos personagens no ritmo para atacar!';
  crewCards.querySelectorAll('.crew-card').forEach((card) => {
    const id = card.dataset.hero;
    card.classList.toggle('selected', id === state.selected && !state.used.has(id));
    card.classList.toggle('done', state.used.has(id));
    card.setAttribute('aria-disabled', String(state.busy || state.ended || state.used.has(id)));
    const order = card.querySelector('.card-order');
    order.textContent = state.used.has(id) ? '✓' : id === state.selected ? '!' : '';
    const skill = card.querySelector('.skill-chip');
    skill.classList.toggle('spent', state.skills.has(id));
    skill.setAttribute('aria-label', state.skills.has(id) ? `${crew.find((h) => h.id === id).skill} usado` : `Usar ${crew.find((h) => h.id === id).skill}`);
    skill.disabled = state.skills.has(id) || state.busy || state.ended;
  });
}
function formatNumber(number) { return Math.floor(number).toLocaleString('pt-BR'); }
function setHint(text) { $('#battleHint').innerHTML = `<span class="hint-spark">✦</span> ${text}`; }
let toastTimer;
function toast(text, extra = '') {
  const el = $('#battleToast');
  el.textContent = text;
  el.className = 'battle-toast show';
  if (extra) el.classList.add(extra);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 950 / state.speed);
}
function setSelected(id) {
  state.selected = id;
  state.selectionAt = performance.now();
  updateHud();
  setHint('Acerte o marcador dourado para um ataque perfeito!');
}
function timingGrade() {
  // The marker makes one sweep in 1.25s; the gold window is centered at 52%.
  const progress = ((performance.now() - state.selectionAt) % 1250) / 1250;
  const difference = Math.abs(progress - 0.52);
  if (difference < 0.065) return { label: 'PERFEITO!', multiplier: 1.8 };
  if (difference < 0.14) return { label: 'ÓTIMO!', multiplier: 1.4 };
  if (difference < 0.25) return { label: 'BOM!', multiplier: 1.12 };
  return { label: 'ATAQUE!', multiplier: 0.82 };
}
function attack(id) {
  if (state.busy || state.ended || state.used.has(id)) return;
  if (state.selected !== id) { setSelected(id); return; }
  const hero = crew.find((item) => item.id === id);
  const grade = timingGrade();
  const chainBoost = 1 + state.chain * 0.13;
  const debuff = state.weaken ? 1.3 : 1;
  const damage = Math.round(hero.power * grade.multiplier * chainBoost * state.boost * debuff);
  state.enemyHp = Math.max(0, state.enemyHp - damage);
  state.boost = 1;
  state.chain += 1;
  state.used.add(id);
  state.selected = null;
  const card = crewCards.querySelector(`[data-hero="${id}"]`);
  card.classList.add('impact');
  setTimeout(() => card.classList.remove('impact'), 300);
  updateHud();
  toast(`${grade.label}  −${formatNumber(damage)}`);
  if (state.enemyHp <= 0) {
    setTimeout(winStage, 700 / state.speed);
    return;
  }
  if (state.used.size === crew.length) setTimeout(enemyTurn, 450 / state.speed);
  else if (state.auto) setTimeout(autoAttack, 500 / state.speed);
  else setHint(`${grade.label.toLowerCase()} ${hero.name}! Escolha o próximo companheiro.`);
}
function autoAttack() {
  if (!state.auto || state.busy || state.ended) return;
  const next = crew.find((hero) => !state.used.has(hero.id));
  if (!next) return;
  state.selected = next.id;
  state.selectionAt = performance.now() - 650;
  updateHud();
  setTimeout(() => attack(next.id), 160 / state.speed);
}
function skill(id) {
  if (state.busy || state.ended || state.skills.has(id)) return;
  state.skills.add(id);
  switch (id) {
    case 'luffy': state.boost = 1.55; toast('GOMU GOMU!  ATQ +55%'); break;
    case 'zoro': state.weaken = true; toast('TRÊS ESPADAS!  DANO +30%'); break;
    case 'nami': state.countdown += 1; toast('CLIMA-TACT!  TURNO EXTRA'); break;
    case 'sanji': state.crewHp = Math.min(state.maxCrewHp, state.crewHp + 1250); toast('DIABLE JAMBE!  EQUIPE CURADA'); break;
    case 'chopper': state.crewHp = Math.min(state.maxCrewHp, state.crewHp + 1900); toast('CURA RUMBLE!  PV RESTAURADOS'); break;
    case 'robin': state.freeze = true; toast('SEIS FLEUR!  CHEFE ATORDOADO'); break;
  }
  updateHud();
}
function enemyTurn() {
  if (state.ended || state.busy) return;
  state.busy = true;
  state.chain = 0;
  state.weaken = false;
  updateHud();
  if (state.freeze) {
    state.freeze = false;
    toast('CHEFE ATORDOADO!');
    setHint('A tripulação escapou do contra-ataque!');
    setTimeout(finishTurn, 900 / state.speed);
    return;
  }
  const damage = stages[state.stage].attack;
  $('#enemyStatus').innerHTML = '<span>⚡</span> Capitão prepara um golpe!';
  setHint('Cuidado! O inimigo está atacando…');
  setTimeout(() => {
    state.crewHp = Math.max(0, state.crewHp - damage);
    $('.battlefield').classList.add('shake');
    setTimeout(() => $('.battlefield').classList.remove('shake'), 320);
    toast(`−${formatNumber(damage)} PV`);
    if (state.crewHp <= 0) {
      state.ended = true;
      updateHud();
      showModal('DERROTA', 'A tripulação foi vencida…', 'Reagrupe seus companheiros e tente novamente. Cada turno completo traz um contra-ataque — use as habilidades para virar a maré.', '↻', true);
      return;
    }
    state.countdown -= 1;
    if (state.countdown <= 0) state.countdown = 2;
  else state.countdown -= 1;
    setTimeout(finishTurn, 550 / state.speed);
  }, 720 / state.speed);
}
function finishTurn() {
  state.turn += 1;
  state.used.clear();
  state.selected = null;
  state.busy = false;
  updateHud();
  setHint('Sua vez! Monte uma corrente de ataques perfeita.');
  if (state.auto) setTimeout(autoAttack, 450 / state.speed);
}
function winStage() {
  if (state.ended) return;
  state.busy = true;
  toast('VITÓRIA!');
  state.berries += 650 + state.stage * 450;
  if (state.stage < stages.length - 1) {
    setHint('Vitória! A tripulação navega para a próxima etapa…');
    updateHud();
    setTimeout(() => {
      state.stage += 1;
      state.enemyHp = stages[state.stage].hp;
      state.crewHp = Math.min(state.maxCrewHp, state.crewHp + 450);
      state.used.clear(); state.skills.clear(); state.countdown = 2;
      state.turn = 1; state.chain = 0; state.boost = 1; state.weaken = false; state.freeze = false; state.busy = false;
      updateHud();
      toast('PRÓXIMA ETAPA!');
      if (state.auto) setTimeout(autoAttack, 750 / state.speed);
    }, 1400 / state.speed);
  } else {
    state.ended = true;
    state.gems += 3;
    updateHud();
    setTimeout(() => showModal('LENDAS DO MAR!', 'A Grand Line é sua!', 'Você derrotou todos os capitães! Recompensas: 2.000 berries e 3 gemas. Uma nova aventura espera por você.', '🏆', true), 900 / state.speed);
  }
}
function showModal(kicker, title, text, icon = '✦', final = false) {
  $('#modalKicker').textContent = kicker;
  $('#modalTitle').textContent = title;
  $('#modalText').textContent = text;
  $('#modalIcon').textContent = icon;
  $('#modalAction').textContent = final ? 'CONTINUAR' : 'ENTENDI, CAPITÃO';
  $('#restartGame').hidden = !final;
  $('#modalBackdrop').hidden = false;
}
function restart() {
  Object.assign(state, { stage: 0, enemyHp: stages[0].hp, crewHp: 8200, maxCrewHp: 8200, turn: 1, selected: null, used: new Set(), skills: new Set(), chain: 0, countdown: 2, boost: 1, weaken: false, freeze: false, busy: false, ended: false });
  $('#modalBackdrop').hidden = true;
  updateHud();
  setHint('Toque nos personagens no ritmo para atacar!');
  if (state.auto) setTimeout(autoAttack, 400);
}
crewCards.addEventListener('click', (event) => {
  const skillButton = event.target.closest('.skill-chip');
  if (skillButton) { event.stopPropagation(); skill(skillButton.dataset.skill); return; }
  const card = event.target.closest('.crew-card');
  if (card && card.getAttribute('aria-disabled') !== 'true') attack(card.dataset.hero);
});
crewCards.addEventListener('keydown', (event) => {
  const card = event.target.closest('.crew-card');
  if (card && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    if (card.getAttribute('aria-disabled') !== 'true') attack(card.dataset.hero);
  }
});
$('#resetTurn').addEventListener('click', () => {
  if (state.busy || state.ended || state.used.size === 0) { if (!state.busy && !state.ended) toast('SELECIONE SEUS HERÓIS'); return; }
  state.enemyHp = Math.min(stages[state.stage].hp, state.enemyHp + 420 * state.used.size);
  state.used.clear(); state.selected = null; state.chain = 0; state.boost = 1;
  updateHud(); setHint('Turno reiniciado — escolha uma nova sequência.'); toast('TURNO RECOMEÇADO');
});
$('#autoButton').addEventListener('click', () => {
  state.auto = !state.auto;
  $('#autoButton').classList.toggle('on', state.auto);
  $('#autoButton').innerHTML = `<span>▶</span> AUTO <i></i>`;
  if (state.auto && !state.busy && !state.ended) autoAttack();
});
$('#speedButton').addEventListener('click', () => {
  state.speed = state.speed === 1 ? 2 : 1;
  $('#speedButton').textContent = `${state.speed}×`;
});
$('#helpButton').addEventListener('click', () => showModal('GUIA DO NAVEGANTE', 'Como jogar', 'Toque uma vez em um personagem para selecioná-lo. O marcador dourado corre pela carta: toque de novo na faixa dourada para um ataque PERFEITO e mais dano. Encadeie os 6 ataques! Use ✦ habilidades uma vez por etapa para curar, fortalecer ou atordoar o chefe.', '☠'));
$('#modalClose').addEventListener('click', () => { $('#modalBackdrop').hidden = true; });
$('#modalAction').addEventListener('click', () => { $('#modalBackdrop').hidden = true; });
$('#restartGame').addEventListener('click', restart);
$('#modalBackdrop').addEventListener('click', (event) => { if (event.target === $('#modalBackdrop')) $('#modalBackdrop').hidden = true; });
$('#soundToggle').addEventListener('click', (event) => {
  event.currentTarget.classList.toggle('muted');
  event.currentTarget.textContent = event.currentTarget.classList.contains('muted') ? '♪̸' : '♫';
});
updateHud();
