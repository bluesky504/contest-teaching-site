const lessonQuizzes = { 'rules-api': [
  { id: 'water-mana', answer: 'single', hint: '单池查询要传元素：hero.getTotalMana("water")。无参历史样本是三池之和。' },
  { id: 'shield-lifetime', answer: 'inspect', hint: '先核对命中、耐久与消失帧；被打碎不等于到期，未知寿命不能强行填值。' },
  { id: 'strategy-claim', answer: 'hypothesis', hint: '这是策略假设。控制对手、采集与攻防方案，再比较收入与生成阻塞。' },
], 'gather-attack': [
  { id: 'gather-choice', answer: 'match', hint: '采集元素、查询池与攻击法术元素要相匹配。只改成采水，不能据此保证火箭供给。' },
  { id: 'cast-check', answer: 'both', hint: '示例同时检查单池费用门槛和 canCast；法力不足时，后一个检查被短路。' },
  { id: 'call-effect', answer: 'observe', hint: 'cast 的调用和返回值不是命中证据。效果仍需对应的原始帧与错误检查。' },
] , 'expansion-blocking': [
  { id: 'spawn-order', answer: 'before', hint: '先安装采集回调；本例仅在主循环外尝试一次生成，返回后才执行后续英雄调用。' },
  { id: 'income-proof', answer: 'tradeoff', hint: '正收入是假设量，不证明值得扩张。还要考虑剩余时间、首趟延迟、死亡和应对来袭的窗口。' },
  { id: 'collector-work', answer: 'separate', hint: '英雄后续调用被阻塞，不等于原有果农停止采集；它们的采集活动需单独观测。' },
] , 'offense-defense-budget': [
  { id: 'unknown-attack', answer: 'wait', hint: '未知状态不能映射成安全的攻击或防御动作；等待保留了证据边界。' },
  { id: 'shield-budget', answer: 'budget', hint: 'shieldUsed 是教学示例中的一次防御预算，不是平台证明的施法次数上限。' },
  { id: 'empty-missiles', answer: 'not-proof', hint: '空列表只说明当前观测时刻没有可见飞弹，不证明对手永远不会攻击。' },
] , 'review-knowledge': [
  { id: 'review-document', answer: 'document', hint: '它来自简介页面，先标文档说明，并保留版本与实测差异。' },
  { id: 'review-hypothesis', answer: 'hypothesis', hint: '“可能”是策略假设；需要控制变量和下一次对照。' },
  { id: 'review-unknown', answer: 'unknown', hint: '同帧消失不能区分命中与自然到期，未知应保留。' },
  { id: 'review-next', answer: 'one', hint: '一次只改变一个主要因素，才能把结果和改动联系起来。' },
] };

const attackLessonCases = [
  { mana: 2, available: true, explanation: '火法力不足 3：本轮不调用 canCast，也不施法。' },
  { mana: 3, available: false, explanation: '费用门槛满足，但 canCast 为 false：不施法，不能凭此认定唯一原因。' },
  { mana: 3, available: true, explanation: '两道条件满足，调用一次 fire-arrow；不据此宣称命中或扣血。' },
];

function gradeQuiz(answers, lessonId = 'rules-api') {
  const quizQuestions = lessonQuizzes[lessonId];
  if (!quizQuestions) throw new RangeError('Unknown lesson quiz');
  const submitted = answers && typeof answers === 'object' ? answers : {};
  const results = quizQuestions.map(question => {
    const answer = submitted[question.id];
    const answered = typeof answer === 'string' && answer.length > 0;
    return { id: question.id, answered, correct: answered && answer === question.answer, hint: question.hint };
  });
  return { complete: results.every(result => result.answered), correct: results.filter(result => result.correct).length,
    total: results.length, results };
}

function matchesApiCategory(rowCategory, category) {
  if (!['observe', 'gather', 'cast'].includes(rowCategory)) return false;
  return category === 'all' || category === rowCategory;
}

function getAttackLessonCase(index) {
  if (!Number.isInteger(index) || index < 0 || index >= attackLessonCases.length) throw new RangeError('Unknown demonstration case');
  const sample = attackLessonCases[index];
  return { ...sample, number: index + 1, total: attackLessonCases.length, cost: 3,
    canCastChecked: sample.mana >= 3, castCalled: sample.mana >= 3 && sample.available };
}

function estimateExpansionWindow({ blockingSeconds, horizonSeconds, extraManaPerSecond, dangerSeconds = null }) {
  for (const value of [blockingSeconds, horizonSeconds, extraManaPerSecond]) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new RangeError('Expansion inputs must be finite nonnegative numbers');
  }
  if (dangerSeconds !== null && (typeof dangerSeconds !== 'number' || !Number.isFinite(dangerSeconds) || dangerSeconds < 0)) {
    throw new RangeError('Threat time must be unknown or a finite nonnegative number');
  }
  const productionSeconds = Math.max(0, horizonSeconds - blockingSeconds);
  const estimatedExtraMana = productionSeconds * extraManaPerSecond;
  if (!Number.isFinite(estimatedExtraMana)) throw new RangeError('Hypothetical income exceeds the numeric range');
  return { productionSeconds, estimatedExtraMana,
    dangerMarginSeconds: dangerSeconds === null ? null : dangerSeconds - blockingSeconds };
}

function chooseBudgetAction({ attackMana, shieldMana, incomingMana, shieldUsed, attackAvailable = true, shieldAvailable = true }) {
  for (const value of [attackMana, shieldMana]) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new RangeError('Budget mana must be finite nonnegative numbers');
  }
  if (incomingMana !== null && typeof incomingMana !== 'string') throw new RangeError('Incoming mana must be null or a string');
  for (const value of [shieldUsed, attackAvailable, shieldAvailable]) if (typeof value !== 'boolean') throw new RangeError('Budget flags must be boolean');
  if (incomingMana === 'fire' && !shieldUsed && shieldMana >= 3 && shieldAvailable) {
    return { action: 'shield', label: '尝试水盾', reason: '已知火来袭，先用水盾预算。' };
  }
  if (incomingMana === null && attackMana >= 15 && attackAvailable) {
    return { action: 'attack', label: '尝试火球', reason: '没有可见来袭，火池达到火球费用。' };
  }
  if (incomingMana !== null && incomingMana !== 'fire') {
    return { action: 'wait', label: '等待', reason: '来袭元素未知，不猜测防御映射。' };
  }
  if (incomingMana === 'fire') {
    return { action: 'wait', label: '等待', reason: shieldUsed ? '防御预算已用，不在可见威胁下抢攻。' : '水盾预算不足或当前不可用，先不冒险攻击。' };
  }
  return { action: 'wait', label: '等待', reason: attackAvailable ? '火池还未达到火球费用。' : '火球当前不可用，保留法力并等待。' };
}

function reviewRecordStatus(record) {
  const required = ['title', 'question', 'hypothesis', 'change', 'controls', 'evidence', 'conclusion', 'unknown', 'nextTest'];
  const objectRecord = record !== null && typeof record === 'object' && !Array.isArray(record);
  const missing = [];
  const stringKeys = ['title', 'question', 'hypothesis', 'change', 'conclusion', 'nextTest'];
  const arrayKeys = ['controls', 'unknown'];
  for (const key of required) if (!Object.prototype.hasOwnProperty.call(record ?? {}, key)) missing.push(key);
  for (const key of stringKeys) if (!objectRecord || typeof record[key] !== 'string' || record[key].trim() === '') if (!missing.includes(key)) missing.push(key);
  for (const key of arrayKeys) if (!objectRecord || !Array.isArray(record[key]) || record[key].length === 0
    || record[key].some(item => typeof item !== 'string' || item.trim() === '')) if (!missing.includes(key)) missing.push(key);
  const evidenceKinds = new Set(['document', 'observed', 'hypothesis', 'unknown']);
  const observedSourceValid = source => source && typeof source === 'object' && source.kind === 'bounded-fixture'
    && typeof source.file === 'string' && source.file.trim().length > 0
    && typeof source.case === 'string' && source.case.trim().length > 0
    && typeof source.version === 'string' && source.version.trim().length > 0
    && Array.isArray(source.sequence) && source.sequence.length > 0
    && source.sequence.every(item => typeof item === 'string' && item.trim().length > 0)
    && typeof source.errors === 'string' && source.errors.trim().length > 0;
  const documentSourceValid = source => source && typeof source === 'object' && source.kind === 'document'
    && typeof source.file === 'string' && source.file.trim().length > 0
    && typeof source.section === 'string' && source.section.trim().length > 0
    && typeof source.pageVersion === 'string' && source.pageVersion.trim().length > 0
    && typeof source.checkedAt === 'string' && source.checkedAt.trim().length > 0;
  const evidenceValid = objectRecord && Array.isArray(record.evidence) && record.evidence.length > 0
    && record.evidence.every(item => item && typeof item === 'object' && evidenceKinds.has(item.kind)
      && typeof item.statement === 'string' && item.statement.trim().length > 0
      && (item.kind !== 'observed' || observedSourceValid(item.source))
      && (item.kind !== 'document' || documentSourceValid(item.source)));
  if (!evidenceValid && !missing.includes('evidence')) missing.push('evidence');
  return { valid: missing.length === 0 && evidenceValid, missing, evidenceValid };
}

function initializeTeachingPage(root) {
  const filters = root.getElementById('api-filters');
  const buttons = Array.from(root.querySelectorAll('[data-api-filter]'));
  const rows = Array.from(root.querySelectorAll('[data-api-category]'));
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const category = button.dataset.apiFilter;
      for (const row of rows) row.hidden = !matchesApiCategory(row.dataset.apiCategory, category);
      for (const item of buttons) item.setAttribute('aria-pressed', String(item === button));
      root.getElementById('api-count').textContent = `显示 ${rows.filter(row => !row.hidden).length} 个接口`;
    });
  }
  if (filters) filters.hidden = false;

  const form = root.getElementById('lesson-quiz');
  const status = root.getElementById('quiz-status');
  const lessonId = root.body.dataset.lesson || 'rules-api';
  const quizQuestions = lessonQuizzes[lessonId];
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(form);
    const answers = Object.fromEntries(quizQuestions.map(question => [question.id, data.get(question.id)]));
    const grade = gradeQuiz(answers, lessonId);
    for (const result of grade.results) {
      const feedback = root.getElementById(`feedback-${result.id}`);
      feedback.dataset.state = !result.answered ? 'missing' : result.correct ? 'correct' : 'incorrect';
      feedback.textContent = !result.answered ? '请先选择一个答案。'
        : `${result.correct ? '判断正确。' : '再想一想。'}${result.hint}`;
    }
    status.textContent = grade.complete ? `答对 ${grade.correct} / ${grade.total} 题。${grade.correct === grade.total ? '现在试着解释你的理由。' : '结合解释，再试一次。'}`
      : '还有未作答的问题，请完成后再检查。';
  });
  form.addEventListener('reset', () => {
    for (const question of quizQuestions) {
      const feedback = root.getElementById(`feedback-${question.id}`);
      feedback.textContent = '';
      delete feedback.dataset.state;
    }
    status.textContent = '';
  });
  root.getElementById('quiz-actions').hidden = false;

  const demo = root.getElementById('attack-demo');
  if (demo) {
    let index = 0;
    const next = root.getElementById('demo-next');
    const render = () => {
      const sample = getAttackLessonCase(index);
      root.getElementById('demo-number').textContent = `假设情形 ${sample.number} / ${sample.total}`;
      root.getElementById('demo-mana').textContent = String(sample.mana);
      root.getElementById('demo-check').textContent = sample.canCastChecked ? String(sample.available) : '未检查';
      root.getElementById('demo-action').textContent = sample.castCalled ? '调用一次' : '不调用';
      root.getElementById('demo-status').textContent = sample.explanation;
      demo.dataset.state = sample.castCalled ? 'call' : 'no-call';
      next.disabled = sample.number === sample.total;
    };
    next.addEventListener('click', () => { if (index < attackLessonCases.length - 1) index += 1; render(); });
    root.getElementById('demo-reset').addEventListener('click', () => { index = 0; render(); });
    render();
    root.getElementById('demo-controls').hidden = false;
  }

  const expansion = root.getElementById('expansion-demo');
  if (expansion) {
    const blocking = root.getElementById('expansion-blocking');
    const horizon = root.getElementById('expansion-horizon');
    const danger = root.getElementById('expansion-danger');
    const render = () => {
      const result = estimateExpansionWindow({ blockingSeconds: Number(blocking.value), horizonSeconds: Number(horizon.value),
        extraManaPerSecond: 0.5, dangerSeconds: danger.value === 'unknown' ? null : Number(danger.value) });
      root.getElementById('blocking-value').textContent = `${blocking.value} 秒`;
      root.getElementById('horizon-value').textContent = `${horizon.value} 秒`;
      root.getElementById('production-value').textContent = `${result.productionSeconds} 秒`;
      root.getElementById('income-value').textContent = `${result.estimatedExtraMana} 法力`;
      root.getElementById('expansion-status').textContent = result.dangerMarginSeconds === null
        ? '来袭时间未知，无法评估应对窗口；不能把未知当成安全。'
        : result.dangerMarginSeconds <= 0 ? '示意威胁不晚于生成返回：不能等生成完再处理。正收入不等于值得扩张。'
          : `返回后到示意威胁还有 ${result.dangerMarginSeconds} 秒；尚未计施法耗时与观测延迟，不代表安全。`;
      expansion.dataset.state = result.dangerMarginSeconds === null ? 'unknown' : result.dangerMarginSeconds <= 0 ? 'risk' : 'unproven';
    };
    blocking.addEventListener('input', render);
    horizon.addEventListener('input', render);
    danger.addEventListener('change', render);
    root.getElementById('expansion-reset').addEventListener('click', () => {
      blocking.value = '4'; horizon.value = '20'; danger.value = '3'; render();
    });
    render();
    root.getElementById('expansion-controls').hidden = false;
  }

  const budget = root.getElementById('budget-demo');
  if (budget) {
    const attack = root.getElementById('budget-attack');
    const shield = root.getElementById('budget-shield');
    const incoming = root.getElementById('budget-incoming');
    const used = root.getElementById('budget-used');
    const render = () => {
      const result = chooseBudgetAction({ attackMana: Number(attack.value), shieldMana: Number(shield.value),
        incomingMana: incoming.value === 'none' ? null : incoming.value, shieldUsed: used.checked });
      root.getElementById('budget-attack-value').textContent = attack.value;
      root.getElementById('budget-shield-value').textContent = shield.value;
      root.getElementById('budget-action').textContent = result.label;
      root.getElementById('budget-reason').textContent = result.reason;
      budget.dataset.state = result.action;
    };
    attack.addEventListener('input', render);
    shield.addEventListener('input', render);
    incoming.addEventListener('change', render);
    used.addEventListener('change', render);
    root.getElementById('budget-reset').addEventListener('click', () => {
      attack.value = '15'; shield.value = '3'; incoming.value = 'fire'; used.checked = false; render();
    });
    render();
    root.getElementById('budget-controls').hidden = false;
  }

  const copyButton = root.getElementById('copy-example');
  copyButton.addEventListener('click', async () => {
    const code = root.getElementById('first-example');
    const copyStatus = root.getElementById('copy-status');
    try {
      const clipboard = root.defaultView.navigator.clipboard;
      if (!clipboard || typeof clipboard.writeText !== 'function') throw new Error('clipboard unavailable');
      await clipboard.writeText(code.textContent);
      copyStatus.textContent = '代码已复制。';
    } catch {
      const selection = root.defaultView.getSelection();
      if (selection) {
        const range = root.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
        code.closest('pre').focus();
        copyStatus.textContent = '代码已选中，请按 Ctrl+C / ⌘C 复制。';
      } else {
        copyStatus.textContent = '自动复制不可用，请手动选择上方代码。';
      }
    }
  });
  copyButton.hidden = false;
}

if (typeof module !== 'undefined' && module.exports) module.exports = { gradeQuiz, matchesApiCategory, getAttackLessonCase, estimateExpansionWindow, chooseBudgetAction, reviewRecordStatus };
if (typeof document !== 'undefined') initializeTeachingPage(document);
