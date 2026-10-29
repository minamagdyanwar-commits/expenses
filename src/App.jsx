import { useState } from 'react';
import { Provider, useApp } from './store.jsx';
import { Icon } from './ui.jsx';
import Home from './Home.jsx';
import Setup from './Setup.jsx';
import Accounts from './Accounts.jsx';
import Payments from './Payments.jsx';
import Analytics from './Analytics.jsx';
import Settings from './Settings.jsx';
import AddSheet from './AddSheet.jsx';

const TABS = [
  ['home', 'nav.home', 'home', Home],
  ['accounts', 'nav.accounts', 'wallet', Accounts],
  ['pay', 'nav.pay', 'pay', Payments],
  ['stats', 'nav.stats', 'chart', Analytics],
  ['settings', 'nav.settings', 'gear', Settings],
];

function Shell() {
  const { ready, t, toastMsg, state } = useApp();
  const [tab, setTab] = useState('home');
  const [adding, setAdding] = useState(false);

  if (!ready) {
    return (
      <div className="app">
        <div className="screen" aria-busy="true" aria-label={t('app.loading')}>
          <div className="skeleton" style={{ height: 28 }} />
          <div className="skeleton" style={{ height: 170, borderRadius: 20 }} />
          <div className="skeleton" style={{ height: 120, borderRadius: 20 }} />
          <div className="skeleton" style={{ height: 120, borderRadius: 20 }} />
        </div>
      </div>
    );
  }

  if (!state.settings.onboarded) return <Setup />;

  const Screen = TABS.find((x) => x[0] === tab)[3];
  return (
    <div className="app">
      <Screen key={tab} go={setTab} />
      <button className="fab" aria-label={t('add.title')} onClick={() => setAdding(true)}><Icon name="plus" size={28} sw={2.4} /></button>
      <nav className="tabbar" aria-label={t('nav.main')}>
        {TABS.map(([id, label, icon]) => (
          <button key={id} className={'tab' + (tab === id ? ' on' : '')} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            <Icon name={icon} />
            {t(label)}
          </button>
        ))}
      </nav>
      {adding && <AddSheet onClose={() => setAdding(false)} />}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  );
}

export default function App() {
  return (
    <Provider>
      <Shell />
    </Provider>
  );
}
