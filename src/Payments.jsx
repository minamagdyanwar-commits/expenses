import { useState } from 'react';
import { useApp } from './store.jsx';
import { currentMonth, fmt, pad2, recurringStatus, yearPlan } from './logic.js';
import { MONTHS_SHORT, MONTH_INITIALS } from './i18n.js';
import { Field, Icon, Sheet, numericOnly, parseAmount } from './ui.jsx';
import PaySheet from './PaySheet.jsx';

function RecurringForm({ rec, onClose }) {
  const { state, dispatch, t, toast, catName, accName } = useApp();
  const cats = state.categories.filter((c) => c.type === 'expense' && (!c.archived || c.id === rec?.categoryId));
  const [name, setName] = useState(rec?.name ?? '');
  const [categoryId, setCategoryId] = useState(rec?.categoryId ?? cats[0]?.id ?? '');
  const [amount, setAmount] = useState(rec ? String(rec.amount) : '');
  const [dueDay, setDueDay] = useState(String(rec?.dueDay ?? 1));
  const [startMonth, setStartMonth] = useState(rec?.startMonth ?? currentMonth());
  const [endMonth, setEndMonth] = useState(rec?.endMonth ?? '');
  const [accountId, setAccountId] = useState(rec?.accountId ?? '');
  const value = parseAmount(amount);
  const day = Math.min(28, Math.max(1, parseInt(dueDay, 10) || 1));
  const valid = name.trim() && value > 0 && categoryId && startMonth && (!endMonth || endMonth >= startMonth);

  const save = () => {
    dispatch({ type: 'rec/save', rec: { ...(rec || {}), name: name.trim(), categoryId, amount: value, dueDay: day, startMonth, endMonth: endMonth || undefined, accountId: accountId || undefined } });
    toast(t('rec.saved'));
    onClose();
  };
  const remove = () => {
    if (!window.confirm(t('rec.confirmDelete'))) return;
    dispatch({ type: 'rec/delete', id: rec.id });
    onClose();
  };

  return (
    <Sheet title={rec ? t('rec.editTitle') : t('rec.newTitle')} onClose={onClose}>
      <Field label={t('rec.name')}><input type="text" placeholder={t('rec.namePh')} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label={t('add.category')}>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {cats.map((c) => <option key={c.id} value={c.id}>{catName(c.id)}</option>)}
        </select>
      </Field>
      {state.accounts.filter((a) => !a.archived).length > 1 && (
        <Field label={t('acc.field')}>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">—</option>
            {state.accounts.filter((a) => !a.archived || a.id === accountId).map((a) => <option key={a.id} value={a.id}>{accName(a.id)}</option>)}
          </select>
        </Field>
      )}
      <Field label={t('pay.amount', { cur: state.settings.currency })}><input inputMode="decimal" value={amount} onChange={(e) => setAmount(numericOnly(e.target.value))} /></Field>
      <Field label={t('rec.dueDay')}><input inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value.replace(/\D/g, '').slice(0, 2))} /></Field>
      <Field label={t('rec.starts')}><input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} /></Field>
      <Field label={t('rec.ends')}><input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} /></Field>
      <button className="btn block" disabled={!valid} onClick={save}>{t('common.save')}</button>
      {rec && <button className="btn danger" onClick={remove}>{t('rec.delete')}</button>}
    </Sheet>
  );
}

export function RecurringList({ onClose }) {
  const { state, t, catName } = useApp();
  const [editing, setEditing] = useState(undefined); // undefined = list, null = new, object = edit
  if (editing !== undefined) return <RecurringForm rec={editing} onClose={() => setEditing(undefined)} />;
  return (
    <Sheet title={t('rec.title')} onClose={onClose}>
      {state.recurring.length === 0 && <div className="empty">{t('rec.hint')}</div>}
      <div className="card" style={{ padding: '4px 16px' }}>
        <div className="list">
          {state.recurring.map((r) => (
            <button key={r.id} className="item" onClick={() => setEditing(r)}>
              <span className="grow">
                <div>{r.name}</div>
                <div className="muted small">{t('rec.day', { cat: catName(r.categoryId), day: r.dueDay })}</div>
              </span>
              <b>{fmt(r.amount)}</b>
            </button>
          ))}
        </div>
      </div>
      <button className="btn" onClick={() => setEditing(null)}>{t('rec.add')}</button>
    </Sheet>
  );
}

export default function Payments() {
  const { state, t, lang } = useApp();
  const nowMonth = currentMonth();
  const [year, setYear] = useState(Number(nowMonth.slice(0, 4)));
  const [pay, setPay] = useState(null);
  const [manage, setManage] = useState(false);
  const cur = state.settings.currency;
  const plan = yearPlan(state.recurring, state.payments, state.transactions, year, nowMonth);
  const pct = plan.planned ? Math.min(100, (plan.paid / plan.planned) * 100) : 0;
  const dueNow = state.recurring.filter((r) => recurringStatus(r, nowMonth, state.payments, nowMonth) === 'unpaid');
  const shortNames = MONTHS_SHORT[lang];

  return (
    <div className="screen">
      <div className="row between">
        <div className="h1">{t('payments.title')}</div>
        <div className="row" style={{ gap: 0, fontWeight: 700 }}>
          <button className="iconbtn" aria-label={t('payments.prevYear')} onClick={() => setYear(year - 1)}><Icon name="left" size={20} className="flip" /></button>
          {year}
          <button className="iconbtn" aria-label={t('payments.nextYear')} onClick={() => setYear(year + 1)}><Icon name="right" size={20} className="flip" /></button>
        </div>
      </div>

      <div className="hero">
        <div className="row between">
          <span className="label">{t('payments.paidIn', { year })}</span>
          <span className="label">{t('payments.ofPlanned', { amt: fmt(plan.planned) })}</span>
        </div>
        <div className="big">{fmt(plan.paid)} <small>{cur}</small></div>
        <div className="bar"><i style={{ width: pct + '%' }} /></div>
      </div>

      {state.recurring.length === 0 ? (
        <div className="card">
          <div className="empty">{t('payments.none')}</div>
          <button className="btn" onClick={() => setManage(true)}>{t('payments.addFirst')}</button>
        </div>
      ) : (
        <div className="card" style={{ padding: '14px 12px' }}>
          <div className="grid-head">
            <div style={{ width: 92, flex: 'none' }} />
            <div className="cells" dir="ltr">{MONTH_INITIALS[lang].map((m, i) => <span className="m" key={i}>{m}</span>)}</div>
          </div>
          {state.recurring.map((r) => (
            <div className="grid-row" key={r.id}>
              <button className="grid-name" onClick={() => setManage(true)} aria-label={t('payments.edit', { name: r.name })}>{r.name}</button>
              <div className="cells" dir="ltr">
                {shortNames.map((mn, i) => {
                  const month = `${year}-${pad2(i + 1)}`;
                  const status = recurringStatus(r, month, state.payments, nowMonth);
                  return (
                    <button key={month} className={'cell ' + status} disabled={status === 'none'} aria-label={t('payments.cell', { name: r.name, month: mn, year, status })} onClick={() => setPay({ rec: r, month })} />
                  );
                })}
              </div>
            </div>
          ))}
          <div className="legend">
            <span><i style={{ background: 'var(--accent)' }} />{t('payments.paidL')}</span>
            <span><i style={{ background: 'var(--card)', border: '2px solid var(--danger)' }} />{t('payments.unpaidL')}</span>
            <span><i style={{ background: 'var(--seg)' }} />{t('payments.upcomingL')}</span>
          </div>
        </div>
      )}

      {dueNow.length > 0 && (
        <div className="card">
          <h3>{t('payments.thisMonth')}</h3>
          {dueNow.map((r) => (
            <div className="row" key={r.id}>
              <span className="grow">{r.name} · {fmt(r.amount)}</span>
              <button className="btn small" onClick={() => setPay({ rec: r, month: nowMonth })}>{t('payments.markPaid')}</button>
            </div>
          ))}
        </div>
      )}

      {state.recurring.length > 0 && <button className="btn secondary" onClick={() => setManage(true)}>{t('payments.manage')}</button>}
      {pay && <PaySheet rec={pay.rec} month={pay.month} onClose={() => setPay(null)} />}
      {manage && <RecurringList onClose={() => setManage(false)} />}
    </div>
  );
}
