import { useState } from 'react';
import { PALETTE, useApp } from './store.jsx';
import { accountActivity, accountInUse, accountSummary, fmt, firstActiveAccount, isoDate } from './logic.js';
import AddSheet from './AddSheet.jsx';
import { Field, Icon, Sheet, numericOnly, parseAmount } from './ui.jsx';

export const ACCOUNT_TYPES = ['bank', 'cash', 'credit', 'savings'];

// Balance text: credit cards show what is owed, everything else the signed balance.
export function BalanceText({ acc, balance, cur }) {
  const { t } = useApp();
  if (acc.type === 'credit' && balance < 0) return <span className="bad-text">{t('acc.owedNow', { amt: fmt(-balance) })} {cur}</span>;
  return <span className={balance < 0 ? 'bad-text' : ''} dir="ltr">{balance < 0 ? '−' : ''}{fmt(Math.abs(balance))} {cur}</span>;
}

function AccountForm({ acc, onClose }) {
  const { state, dispatch, t, toast } = useApp();
  const editing = !!acc;
  const [name, setName] = useState(acc?.name ?? '');
  const [type, setType] = useState(acc?.type ?? 'bank');
  const [color, setColor] = useState(acc?.color ?? PALETTE[state.accounts.length % PALETTE.length]);
  const initial = acc ? (acc.type === 'credit' ? Math.max(-(acc.openingBalance || 0), 0) : acc.openingBalance || 0) : 0;
  const [opening, setOpening] = useState(initial ? String(initial) : '');
  const credit = type === 'credit';
  const used = editing && accountInUse(acc.id, state.transactions, state.transfers, state.recurring);
  const cur = state.settings.currency;

  const save = () => {
    const amount = parseAmount(opening) || 0;
    dispatch({ type: 'acc/save', acc: { ...(acc || {}), name: name.trim(), type, color, openingBalance: credit ? -amount : amount } });
    toast(t('acc.saved'));
    onClose();
  };
  const remove = () => {
    if (!window.confirm(t('acc.confirmDelete'))) return;
    dispatch({ type: 'acc/delete', id: acc.id });
    onClose();
  };

  return (
    <Sheet title={editing ? t('acc.editTitle') : t('acc.newTitle')} onClose={onClose}>
      <Field label={t('acc.name')}><input type="text" placeholder={t('acc.namePh')} value={name} autoFocus={!editing} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="muted small bold">{t('acc.type')}</div>
      <div className="chips">
        {ACCOUNT_TYPES.map((k) => <button key={k} className={'chip' + (type === k ? ' on' : '')} onClick={() => setType(k)}>{t('acc.type.' + k)}</button>)}
      </div>
      <Field label={t(credit ? 'acc.openingOwed' : editing ? 'acc.openingEdit' : 'acc.opening', { cur })}>
        <input inputMode="decimal" placeholder="0" value={opening} onChange={(e) => setOpening(numericOnly(e.target.value))} />
      </Field>
      <div className="muted small">{t(credit ? 'acc.openingHintCredit' : 'acc.openingHint')}</div>
      <div className="muted small bold">{t('cat.colour')}</div>
      <div className="chips">
        {PALETTE.map((c) => (
          <button key={c} aria-label={`${t('cat.colour')} ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} style={{ width: 44, height: 44, borderRadius: 12, background: c, border: color === c ? '3px solid var(--ink)' : '3px solid transparent' }} />
        ))}
      </div>
      <button className="btn block" disabled={!name.trim()} onClick={save}>{t('common.save')}</button>
      {editing && (
        <button className="btn secondary" onClick={() => { dispatch({ type: 'acc/archive', id: acc.id, archived: !acc.archived }); onClose(); }}>
          {acc.archived ? t('acc.restore') : t('acc.archive')}
        </button>
      )}
      {editing && !used && state.accounts.length > 1 && <button className="btn danger" onClick={remove}>{t('acc.delete')}</button>}
      {used && <div className="muted small">{t('acc.inUse')}</div>}
    </Sheet>
  );
}

export function TransferSheet({ transfer, fromId, toId, onClose }) {
  const { state, dispatch, t, toast, accName } = useApp();
  const editing = !!transfer;
  const accounts = state.accounts.filter((a) => !a.archived || a.id === transfer?.fromId || a.id === transfer?.toId);
  const firstId = fromId ?? transfer?.fromId ?? state.settings.lastAccountId ?? firstActiveAccount(state.accounts);
  const [from, setFrom] = useState(firstId);
  const [to, setTo] = useState(toId ?? transfer?.toId ?? accounts.find((a) => a.id !== firstId)?.id ?? '');
  const [amount, setAmount] = useState(transfer ? String(transfer.amount) : '');
  const [date, setDate] = useState(transfer?.date ?? isoDate());
  const [note, setNote] = useState(transfer?.note ?? '');
  const value = parseAmount(amount);
  const same = from === to;
  const valid = value > 0 && from && to && !same && date;
  const cur = state.settings.currency;

  const save = () => {
    dispatch({ type: 'transfer/save', transfer: { ...(transfer || {}), fromId: from, toId: to, amount: value, date, note: note.trim() } });
    toast(t('acc.transferDone', { amt: fmt(value), cur }));
    onClose();
  };
  const remove = () => {
    if (!window.confirm(t('tr.confirmDelete'))) return;
    dispatch({ type: 'transfer/delete', id: transfer.id });
    toast(t('acc.transferDeleted'));
    onClose();
  };
  const options = accounts.map((a) => <option key={a.id} value={a.id}>{accName(a.id)}</option>);

  return (
    <Sheet title={editing ? t('tr.edit') : t('tr.title')} onClose={onClose}>
      <Field label={t('tr.from')}><select value={from} onChange={(e) => setFrom(e.target.value)}>{options}</select></Field>
      <Field label={t('tr.to')}><select value={to} onChange={(e) => setTo(e.target.value)}>{options}</select></Field>
      {same && <div className="small bad-text">{t('tr.sameAcc')}</div>}
      <div style={{ textAlign: 'center' }}>
        <div className="muted small">{t('add.amount', { cur })}</div>
        <input className="amount-input" inputMode="decimal" placeholder="0" aria-label={t('add.amount', { cur: '' })} autoFocus={!editing} value={amount} onChange={(e) => setAmount(numericOnly(e.target.value))} />
      </div>
      <Field label={t('add.date')}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label={t('add.note')}><input type="text" placeholder={t('add.optional')} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="muted small">{t('tr.hint')}</div>
      <button className="btn block" disabled={!valid} onClick={save}>{t('tr.save')}</button>
      {editing && <button className="btn danger" onClick={remove}>{t('tr.delete')}</button>}
    </Sheet>
  );
}

function AccountDetail({ acc, asOf, onClose, onEdit, onTransfer, onEditTransfer, onEditTx }) {
  const { state, t, catName, accName } = useApp();
  const cur = state.settings.currency;
  const { rows } = accountSummary([acc], state.transactions, state.transfers, asOf);
  const items = accountActivity(acc.id, state.transactions, state.transfers).slice(0, 40);
  return (
    <Sheet title={accName(acc.id)} onClose={onClose}>
      <div className="card">
        <div className="muted small">{t('acc.balance')} · {t('acc.type.' + acc.type)} · {asOf}</div>
        <div className="big-num"><BalanceText acc={acc} balance={rows[0].balance} cur={cur} /></div>
      </div>
      <div className="pair" style={{ gap: 10 }}>
        <button className="btn" onClick={onTransfer}>{t('acc.transfer')}</button>
        <button className="btn secondary" onClick={onEdit}>{t('common.edit')}</button>
      </div>
      <div className="card">
        <h3>{t('acc.activity')}</h3>
        {items.length === 0 ? <div className="empty">{t('acc.noActivity')}</div> : (
          <div className="list">
            {items.map((it) => (
              <button key={it.kind + it.id + it.delta} className="item" onClick={() => (it.kind === 'tx' ? onEditTx(it.tx) : onEditTransfer(it.transfer))}>
                <span className="grow">
                  <div>{it.kind === 'tx' ? catName(it.tx.categoryId) : t(it.delta > 0 ? 'tr.in' : 'tr.out', { name: accName(it.otherId) })}</div>
                  <div className="muted small">{it.date}{(it.kind === 'tx' ? it.tx.note : it.transfer.note) ? ` · ${it.kind === 'tx' ? it.tx.note : it.transfer.note}` : ''}</div>
                </span>
                <span className={it.delta > 0 ? 'amount-in' : 'amount-out'} dir="ltr">{it.delta > 0 ? '+' : '−'}{fmt(Math.abs(it.delta))}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

export default function Accounts() {
  const { state, t, accName } = useApp();
  const [asOf, setAsOf] = useState(isoDate());
  const [detail, setDetail] = useState(null); // account id
  const [form, setForm] = useState(undefined); // undefined closed, null new, object edit
  const [transfer, setTransfer] = useState(undefined); // undefined closed, {} new, {transfer} edit, {fromId,toId}
  const [editTx, setEditTx] = useState(null);
  const cur = state.settings.currency;
  const summary = accountSummary(state.accounts, state.transactions, state.transfers, asOf);
  const active = summary.rows.filter((r) => !r.acc.archived);
  const archived = summary.rows.filter((r) => r.acc.archived);
  const recent = [...state.transfers].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const detailAcc = detail && state.accounts.find((a) => a.id === detail);

  const Row = ({ r }) => (
    <button className="card account" style={{ opacity: r.acc.archived ? 0.55 : 1 }} onClick={() => setDetail(r.acc.id)}>
      <span className="dot" style={{ background: r.acc.color }} />
      <span className="grow">
        <div className="bold">{accName(r.acc.id)} {r.acc.archived && <span className="muted small">{t('acc.archivedTag')}</span>}</div>
        <div className="muted small">{t('acc.type.' + r.acc.type)}</div>
      </span>
      <b><BalanceText acc={r.acc} balance={r.balance} cur={cur} /></b>
    </button>
  );

  return (
    <div className="screen">
      <div className="h1">{t('acc.title')}</div>
      <div className="hero">
        <div className="label">{t('acc.total')}</div>
        <div className="big"><span dir="ltr">{summary.total < 0 ? '− ' : ''}{fmt(Math.abs(summary.total))}</span> <small>{cur}</small></div>
        <div className="pair">
          <div><span className="label">{t('acc.assets')}</span><b style={{ color: 'var(--income)' }}>{fmt(summary.assets)}</b></div>
          <div><span className="label">{t('acc.owed')}</span><b style={{ color: 'var(--expense)' }}>{fmt(summary.owed)}</b></div>
        </div>
      </div>
      <Field label={t('acc.asOf')}><input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value || isoDate())} /></Field>

      <div className="pair" style={{ gap: 10 }}>
        <button className="btn" disabled={active.length < 2} onClick={() => setTransfer({})}><Icon name="swap" size={18} /> {t('acc.transfer').replace('⇄ ', '')}</button>
        <button className="btn secondary" onClick={() => setForm(null)}>{t('acc.add')}</button>
      </div>

      {active.length <= 1 && <div className="card"><div className="empty">{t('acc.empty')}</div></div>}
      {active.map((r) => <Row key={r.acc.id} r={r} />)}
      {archived.map((r) => <Row key={r.acc.id} r={r} />)}

      {recent.length > 0 && (
        <div className="card">
          <h3>{t('acc.recentTransfers')}</h3>
          <div className="list">
            {recent.map((tr) => (
              <button key={tr.id} className="item" onClick={() => setTransfer({ transfer: tr })}>
                <span className="grow">
                  <div>{t('tr.label', { from: accName(tr.fromId), to: accName(tr.toId) })}</div>
                  <div className="muted small">{tr.date}{tr.note ? ` · ${tr.note}` : ''}</div>
                </span>
                <b dir="ltr">{fmt(tr.amount)}</b>
              </button>
            ))}
          </div>
        </div>
      )}

      {detailAcc && !form && transfer === undefined && !editTx && (
        <AccountDetail
          acc={detailAcc}
          asOf={asOf}
          onClose={() => setDetail(null)}
          onEdit={() => setForm(detailAcc)}
          onTransfer={() => setTransfer({ fromId: detailAcc.id })}
          onEditTransfer={(tr) => setTransfer({ transfer: tr })}
          onEditTx={setEditTx}
        />
      )}
      {form !== undefined && <AccountForm acc={form} onClose={() => setForm(undefined)} />}
      {transfer !== undefined && <TransferSheet {...transfer} onClose={() => setTransfer(undefined)} />}
      {editTx && <EditTx tx={editTx} onClose={() => setEditTx(null)} />}
    </div>
  );
}

const EditTx = ({ tx, onClose }) => <AddSheet tx={tx} onClose={onClose} />;
