import { useState } from 'react';
import { useApp } from './store.jsx';
import { firstActiveAccount, fmt, isoDate, currentMonth, pad2, payKey } from './logic.js';
import { Field, Sheet, numericOnly, parseAmount } from './ui.jsx';

// Default payment date: today for the running month, otherwise the due day of that month.
export const defaultPayDate = (rec, month) => (month === currentMonth() ? isoDate() : `${month}-${pad2(Math.min(rec.dueDay || 1, 28))}`);

export default function PaySheet({ rec, month, onClose }) {
  const { state, dispatch, t, toast, monthLabel, accName } = useApp();
  const payment = state.payments[payKey(rec.id, month)];
  const tx = payment && state.transactions.find((x) => x.id === payment.txId);
  const [amount, setAmount] = useState(String(tx?.amount ?? rec.amount));
  const [date, setDate] = useState(tx?.date ?? defaultPayDate(rec, month));
  const [accountId, setAccountId] = useState(tx?.accountId ?? rec.accountId ?? state.settings.lastAccountId ?? firstActiveAccount(state.accounts));
  const value = parseAmount(amount);

  const pay = () => {
    dispatch({ type: 'pay/mark', rec, month, amount: value, date, accountId });
    toast(t('pay.markedPaid', { name: rec.name }));
    onClose();
  };
  const unpay = () => {
    dispatch({ type: 'pay/unmark', recId: rec.id, month });
    toast(t('pay.markedUnpaid', { name: rec.name }));
    onClose();
  };

  return (
    <Sheet title={rec.name} onClose={onClose}>
      <div className="muted">{t('pay.planned', { month: monthLabel(month), amt: fmt(rec.amount), cur: state.settings.currency })}</div>
      {payment && <div className="tag ok" style={{ alignSelf: 'flex-start' }}>{tx ? t('pay.paidOn', { date: tx.date }) : t('pay.paid')}</div>}
      <Field label={t('pay.amount', { cur: state.settings.currency })}>
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(numericOnly(e.target.value))} />
      </Field>
      {state.accounts.filter((a) => !a.archived || a.id === accountId).length > 1 && (
        <Field label={t('acc.field')}>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {state.accounts.filter((a) => !a.archived || a.id === accountId).map((a) => <option key={a.id} value={a.id}>{accName(a.id)}</option>)}
          </select>
        </Field>
      )}
      <Field label={t('pay.on')}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <button className="btn block" disabled={!(value > 0) || !date} onClick={pay}>{payment ? t('pay.update') : t('pay.mark')}</button>
      {payment && <button className="btn danger" onClick={unpay}>{t('pay.unmark')}</button>}
    </Sheet>
  );
}
