import { useMemo, useState } from 'react';
import { useApp } from './store.jsx';
import { addMonths, currentMonth, describe, fmt, monthRange, monthlySeries, repeatability } from './logic.js';
import { BarChart, Field, LineChart } from './ui.jsx';

const PERIODS = ['3', '6', 'ytd', 'custom'];

export default function Analytics() {
  const { state, t, catName, monthShort, monthLabel } = useApp();
  const nowMonth = currentMonth();
  const [period, setPeriod] = useState('6');
  const [from, setFrom] = useState(addMonths(nowMonth, -11));
  const [to, setTo] = useState(nowMonth);
  const [type, setType] = useState('expense');
  const [cat, setCat] = useState('all');
  const cur = state.settings.currency;

  const months = useMemo(() => {
    if (period === '3') return monthRange(addMonths(nowMonth, -2), nowMonth);
    if (period === '6') return monthRange(addMonths(nowMonth, -5), nowMonth);
    if (period === 'ytd') return monthRange(`${nowMonth.slice(0, 4)}-01`, nowMonth);
    return from <= to ? monthRange(from, to) : [];
  }, [period, from, to, nowMonth]);

  const cats = state.categories.filter((c) => c.type === type);
  const catId = cat === 'all' || cats.some((c) => c.id === cat) ? cat : 'all';
  const what = catId === 'all' ? t(type === 'expense' ? 'stats.allExpenses' : 'stats.allIncome') : catName(catId);
  const values = monthlySeries(state.transactions, months, type, catId);
  const stats = describe(values);
  const rep = repeatability(values);
  const incomeSeries = monthlySeries(state.transactions, months, 'income');
  const expenseSeries = monthlySeries(state.transactions, months, 'expense');
  const hasData = values.some((v) => v > 0);
  const tagClass = rep.label === 'Regular' ? 'ok' : rep.label === 'Irregular' ? 'mid' : 'warn';
  const variation = rep.cv ? Math.round(rep.cv * 100) : 0;

  return (
    <div className="screen">
      <div className="h1">{t('stats.title')}</div>
      <div className="chips">
        {PERIODS.map((p) => (
          <button key={p} className={'chip dark' + (period === p ? ' on' : '')} onClick={() => setPeriod(p)}>{t('stats.' + p)}</button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="pair" style={{ gap: 8 }}>
          <Field label={t('stats.from')}><input type="month" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label={t('stats.to')}><input type="month" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      )}
      <div className="pair" style={{ gap: 8 }}>
        <Field label="">
          <select aria-label={t('stats.type')} value={type} onChange={(e) => { setType(e.target.value); setCat('all'); }}>
            <option value="expense">{t('common.expense')}</option>
            <option value="income">{t('common.incomeOne')}</option>
          </select>
        </Field>
        <Field label="">
          <select aria-label={t('stats.category')} value={catId} onChange={(e) => setCat(e.target.value)}>
            <option value="all">{t('common.all')}</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{catName(c.id)}</option>)}
          </select>
        </Field>
      </div>

      {months.length === 0 ? (
        <div className="card"><div className="empty">{t('stats.invalid')}</div></div>
      ) : (
        <>
          <div className="card">
            <div className="row between">
              <h3>{t('stats.variation', { what })}</h3>
              <span className="muted small">{monthShort(months[0])}–{monthShort(months[months.length - 1])}</span>
            </div>
            {hasData ? <LineChart months={months} values={values} /> : (
              <div className="empty">{t('stats.noEntries', { from: monthLabel(months[0]), to: monthLabel(months[months.length - 1]) })}</div>
            )}
          </div>
          <div className="stats">
            <div className="stat"><div>{t('stats.avg')}</div><div>{fmt(stats.avg)}</div></div>
            <div className="stat"><div>{t('stats.min')}</div><div>{fmt(stats.min)}</div></div>
            <div className="stat"><div>{t('stats.max')}</div><div>{fmt(stats.max)}</div></div>
          </div>
          <div className="card">
            <div className="row between">
              <h3>{t('stats.repeat')}</h3>
              <span className={'tag ' + tagClass}>{t('stats.' + rep.label)}</span>
            </div>
            <div style={{ display: 'flex', gap: 5 }} aria-hidden="true" dir="ltr">
              {values.map((v, i) => <span key={i} style={{ flex: 1, height: 14, borderRadius: 4, background: v > 0 ? 'var(--accent)' : 'var(--seg)' }} />)}
            </div>
            <div className="muted small" style={{ fontSize: 13 }}>
              {rep.present > 0
                ? t('stats.appears', { n: rep.present, total: rep.total }) + (rep.present > 1 ? t('stats.varies', { pct: variation }) : '')
                : t('stats.notRecorded')}
            </div>
          </div>
          <div className="card">
            <h3>{t('stats.ive', { cur })}</h3>
            <BarChart months={months} income={incomeSeries} expense={expenseSeries} />
            <div className="legend">
              <span><i style={{ background: 'var(--chart-income)' }} />{t('common.income')}</span>
              <span><i style={{ background: 'var(--chart-expense)' }} />{t('common.expenses')}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
