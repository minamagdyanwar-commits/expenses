import { useState } from 'react';
import { PALETTE, useApp } from './store.jsx';
import { firstActiveAccount, fmt, isoDate, monthOf } from './logic.js';
import { Field, Sheet, numericOnly, parseAmount } from './ui.jsx';

// `tx` edits an existing entry; `preset` pre-fills a new one (quick add / repeat last).
export default function AddSheet({ tx, preset, defaultType = 'expense', onClose }) {
  const { state, dispatch, t, toast, catName, accName } = useApp();
  const editing = !!tx;
  const src = tx ?? preset;
  const [type, setType] = useState(src?.type ?? defaultType);
  const [amount, setAmount] = useState(src?.amount ? String(src.amount) : '');
  const [categoryId, setCategoryId] = useState(src?.categoryId ?? null);
  const [date, setDate] = useState(tx?.date ?? isoDate());
  const [note, setNote] = useState(src?.note ?? '');
  const [accountId, setAccountId] = useState(
    src?.accountId ?? (state.accounts.some((a) => a.id === state.settings.lastAccountId && !a.archived) ? state.settings.lastAccountId : firstActiveAccount(state.accounts))
  );
  const [recId, setRecId] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const cats = state.categories.filter((c) => c.type === type && (!c.archived || c.id === tx?.categoryId));
  const value = parseAmount(amount);
  const valid = value > 0 && categoryId && state.categories.some((c) => c.id === categoryId && c.type === type) && date;

  const switchType = (next) => {
    setType(next);
    setCategoryId(null);
    setRecId('');
  };

  const addCategory = () => {
    const name = newName.trim();
    if (!name) return;
    const count = state.categories.filter((c) => c.type === type).length;
    const id = 'n-' + Math.random().toString(36).slice(2, 8);
    dispatch({ type: 'cat/save', cat: { id, name, type, color: PALETTE[count % PALETTE.length], archived: false } });
    setCategoryId(id);
    setNewName('');
    setAdding(false);
  };

  const save = () => {
    if (!valid) return;
    const rec = recId ? state.recurring.find((r) => r.id === recId) : null;
    dispatch(
      rec && !editing
        ? { type: 'pay/mark', rec, month: monthOf(date), amount: value, date, accountId }
        : { type: 'tx/save', tx: { ...(tx || {}), type, amount: value, categoryId, date, note: note.trim(), accountId } }
    );
    toast(t(type === 'income' ? 'add.savedIncome' : 'add.savedExpense', { amt: fmt(value), cur: state.settings.currency }));
    onClose();
  };

  const remove = () => {
    if (!window.confirm(t('add.confirmDelete'))) return;
    dispatch({ type: 'tx/delete', id: tx.id });
    toast(t('add.deleted'));
    onClose();
  };

  return (
    <Sheet title={editing ? t('add.edit') : t('add.title')} onClose={onClose}>
      <div className="seg" role="group" aria-label={t('add.type')}>
        <button className={type === 'expense' ? 'on' : ''} onClick={() => switchType('expense')}>{t('common.expense')}</button>
        <button className={type === 'income' ? 'on' : ''} onClick={() => switchType('income')}>{t('common.incomeOne')}</button>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="muted small">{t('add.amount', { cur: state.settings.currency })}</div>
        <input className="amount-input" inputMode="decimal" placeholder="0" aria-label={t('add.amount', { cur: '' })} autoFocus={!editing} value={amount} onChange={(e) => setAmount(numericOnly(e.target.value))} />
      </div>
      <div>
        <div className="muted small bold" style={{ marginBottom: 8 }}>{t('add.category')}</div>
        <div className="chips">
          {cats.map((c) => (
            <button key={c.id} className={'chip' + (categoryId === c.id ? ' on' : '')} onClick={() => setCategoryId(c.id)}>{catName(c.id)}</button>
          ))}
          <button className="chip dash" onClick={() => setAdding(true)}>{t('add.new')}</button>
        </div>
        {adding && (
          <div className="row" style={{ marginTop: 10 }}>
            <input className="field text-input" placeholder={t('add.catName')} value={newName} autoFocus onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} />
            <button className="btn small" onClick={addCategory}>{t('common.add')}</button>
          </div>
        )}
      </div>
      <Field label={t('add.date')}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label={t('add.note')}>
        <input type="text" placeholder={t('add.optional')} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {state.accounts.filter((a) => !a.archived || a.id === accountId).length > 1 && (
        <Field label={t('acc.field')}>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {state.accounts.filter((a) => !a.archived || a.id === accountId).map((a) => <option key={a.id} value={a.id}>{accName(a.id)}</option>)}
          </select>
        </Field>
      )}
      {!editing && type === 'expense' && state.recurring.length > 0 && (
        <Field label={t('add.recurring')}>
          <select
            value={recId}
            onChange={(e) => {
              setRecId(e.target.value);
              const rec = state.recurring.find((r) => r.id === e.target.value);
              if (rec) {
                setCategoryId(rec.categoryId);
                if (rec.accountId) setAccountId(rec.accountId);
                if (!amount) setAmount(String(rec.amount));
              }
            }}
          >
            <option value="">{t('add.no')}</option>
            {state.recurring.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </Field>
      )}
      <button className="btn block" disabled={!valid} onClick={save}>{t(type === 'income' ? 'add.saveIncome' : 'add.saveExpense')}</button>
      {editing && <button className="btn danger" onClick={remove}>{t('add.delete')}</button>}
    </Sheet>
  );
}
