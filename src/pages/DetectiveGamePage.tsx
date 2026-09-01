import { useEffect, useState } from 'react';

const suspects = ['林晓', '陈宇', '周宁', '赵言'] as const;
const locations = ['图书馆', '食堂', '社团活动室', '操场'] as const;
const arrivalTimes = ['18:00', '18:20', '18:40', '19:00'] as const;

type Suspect = (typeof suspects)[number];
type Location = (typeof locations)[number];
type ArrivalTime = (typeof arrivalTimes)[number];
type Assignment = {
  location: Location | '';
  time: ArrivalTime | '';
};
type GameResult = 'idle' | 'incomplete' | 'wrong' | 'success';

const solution: Record<Suspect, { location: Location; time: ArrivalTime }> = {
  林晓: { location: '图书馆', time: '18:00' },
  陈宇: { location: '食堂', time: '18:20' },
  周宁: { location: '操场', time: '18:40' },
  赵言: { location: '社团活动室', time: '19:00' },
};

const clues = [
  '林晓是四人中最早到达的人。',
  '去社团活动室的人最后到达。',
  '赵言去的是社团活动室。',
  '陈宇比去操场的人早到，而且陈宇不在操场。',
  '周宁没有去食堂，也没有去社团活动室。',
  '去图书馆的人比去食堂的人早到。',
];

function createEmptyAssignments(): Record<Suspect, Assignment> {
  return suspects.reduce(
    (result, suspect) => ({
      ...result,
      [suspect]: { location: '', time: '' },
    }),
    {} as Record<Suspect, Assignment>,
  );
}

function formatElapsedTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return minutes > 0
    ? `${minutes} 分 ${remainingSeconds.toString().padStart(2, '0')} 秒`
    : `${remainingSeconds} 秒`;
}

export default function DetectiveGamePage() {
  const [assignments, setAssignments] = useState(createEmptyAssignments);
  const [culprit, setCulprit] = useState<Suspect | ''>('');
  const [gameResult, setGameResult] = useState<GameResult>('idle');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (gameResult === 'success') {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [gameResult, startedAt]);

  function updateLocation(suspect: Suspect, location: Location | '') {
    if (gameResult === 'success') return;

    setAssignments((current) => ({
      ...current,
      [suspect]: { ...current[suspect], location },
    }));
    setGameResult('idle');
  }

  function updateTime(suspect: Suspect, time: ArrivalTime | '') {
    if (gameResult === 'success') return;

    setAssignments((current) => ({
      ...current,
      [suspect]: { ...current[suspect], time },
    }));
    setGameResult('idle');
  }

  function resetGame() {
    setAssignments(createEmptyAssignments());
    setCulprit('');
    setGameResult('idle');
    setWrongAttempts(0);
    setHintUsed(false);
    setStartedAt(Date.now());
    setElapsedSeconds(0);
  }

  function submitAnswer() {
    if (gameResult === 'success') return;

    const isFilled = suspects.every(
      (suspect) => assignments[suspect].location && assignments[suspect].time,
    ) && culprit;

    if (!isFilled) {
      setGameResult('incomplete');
      return;
    }

    const assignmentsCorrect = suspects.every((suspect) => {
      const answer = assignments[suspect];
      return answer.location === solution[suspect].location && answer.time === solution[suspect].time;
    });
    const isCorrect = assignmentsCorrect && culprit === '赵言';

    if (isCorrect) {
      setGameResult('success');
      return;
    }

    setWrongAttempts((current) => current + 1);
    setGameResult('wrong');
  }

  const score = Math.max(
    100 - wrongAttempts * 10 - (hintUsed ? 15 : 0) - Math.floor(elapsedSeconds / 30) * 5,
    20,
  );

  return (
    <main className="app-shell detective-game-page">
      <header className="page-header">
        <div>
          <div className="title-row">
            <h1>校园逻辑破案</h1>
            <span>独立小游戏</span>
          </div>
          <p>不靠运气，只靠线索。整理人物、地点和时间，找出拿走社团经费的人。</p>
        </div>
        <button type="button" className="secondary-action-link" onClick={resetGame}>
          重新开始
        </button>
      </header>

      <section className="game-status-bar" aria-label="游戏状态">
        <div>
          <span>当前用时</span>
          <strong>{formatElapsedTime(elapsedSeconds)}</strong>
        </div>
        <div>
          <span>错误次数</span>
          <strong>{wrongAttempts} 次</strong>
        </div>
        <div>
          <span>当前得分</span>
          <strong>{score} 分</strong>
        </div>
      </section>

      <div className="detective-game-layout">
        <section className="case-panel" aria-labelledby="case-title">
          <div className="section-heading">
            <span className="section-kicker">案件 01</span>
            <h2 id="case-title">消失的社团经费</h2>
          </div>

          <div className="case-story">
            <p><strong>案发时间：</strong>18:00—19:00</p>
            <p><strong>案发地点：</strong>校园内四个公共地点</p>
            <p><strong>案件经过：</strong>19:10，社团活动室的募捐箱少了 800 元。监控确认，拿走信封的人就是最后到达社团活动室的人。</p>
          </div>

          <div className="clue-section">
            <div className="panel-header">
              <div>
                <span className="section-kicker">线索</span>
                <h3>逐条排除可能性</h3>
              </div>
            </div>
            <ol className="clue-list">
              {clues.map((clue) => <li key={clue}>{clue}</li>)}
            </ol>
          </div>

          <div className="hint-box">
            <div>
              <strong>需要一点提示？</strong>
              {hintUsed && <p>先锁定最早和最后到达的人，再利用“比谁早到”排出中间两人的顺序。</p>}
            </div>
            <button type="button" className="minor-action" onClick={() => setHintUsed(true)} disabled={hintUsed || gameResult === 'success'}>
              {hintUsed ? '提示已使用' : '查看提示（扣分）'}
            </button>
          </div>
        </section>

        <section className="logic-panel" aria-labelledby="logic-title">
          <div className="section-heading">
            <span className="section-kicker">推理记录</span>
            <h2 id="logic-title">整理四人的行动路线</h2>
          </div>
          <p className="logic-instruction">每个人对应一个不同地点和不同时间。你可以先填出确定的信息，再逐步排除其他可能。</p>

          <div className="logic-table-wrap">
            <table className="logic-table">
              <thead>
                <tr>
                  <th scope="col">人物</th>
                  <th scope="col">地点</th>
                  <th scope="col">到达时间</th>
                </tr>
              </thead>
              <tbody>
                {suspects.map((suspect) => (
                  <tr key={suspect}>
                    <th scope="row">{suspect}</th>
                    <td>
                      <select
                        aria-label={`${suspect} 的地点`}
                        value={assignments[suspect].location}
                        disabled={gameResult === 'success'}
                        onChange={(event) => updateLocation(suspect, event.target.value as Location | '')}
                      >
                        <option value="">请选择地点</option>
                        {locations.map((location) => <option key={location} value={location}>{location}</option>)}
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={`${suspect} 的到达时间`}
                        value={assignments[suspect].time}
                        disabled={gameResult === 'success'}
                        onChange={(event) => updateTime(suspect, event.target.value as ArrivalTime | '')}
                      >
                        <option value="">请选择时间</option>
                        {arrivalTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="culprit-panel">
            <label htmlFor="culprit-select">
              <span>你认为谁拿走了经费？</span>
              <select id="culprit-select" value={culprit} disabled={gameResult === 'success'} onChange={(event) => { setCulprit(event.target.value as Suspect | ''); setGameResult('idle'); }}>
                <option value="">请选择嫌疑人</option>
                {suspects.map((suspect) => <option key={suspect} value={suspect}>{suspect}</option>)}
              </select>
            </label>
            <button type="button" onClick={submitAnswer} disabled={gameResult === 'success'}>提交推理结果</button>
          </div>

          {gameResult === 'incomplete' && (
            <div className="game-result warning" role="status">
              请先填写完整的行动路线，并选择你认为的嫌疑人。
            </div>
          )}
          {gameResult === 'wrong' && (
            <div className="game-result error" role="status">
              推理还不完整，再检查“最早、最后”和“比谁早到”这几条线索。
            </div>
          )}
          {gameResult === 'success' && (
            <div className="game-result success" role="status">
              <strong>破案成功！</strong>
              <p>赵言 19:00 到达社团活动室，是最后到达的人，因此拿走了经费。</p>
              <span>本次得分：{score} 分</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
