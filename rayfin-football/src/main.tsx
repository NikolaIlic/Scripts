import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/App';
import { bootstrap, tryResumeSession, type AppEnv } from '@/services/auth';
import { initPowerBiAuth } from '@/services/powerBiDirect';

import './main.css';

function Root({ env }: { env: AppEnv }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void tryResumeSession(env)
      .then((ok) => {
        if (!cancelled) setAuthenticated(ok);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [env]);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-[13px] opacity-60">Connecting to Fabric...</div>;
  }
  return <App env={env} authenticated={authenticated} onAuthenticated={() => setAuthenticated(true)} />;
}

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found.');

document.documentElement.classList.add('dark');

// Must run first and unconditionally: when this page is the Power BI sign-in popup, this call
// publishes the result back to the opener. See powerBiDirect.ts.
initPowerBiAuth();

try {
  const env = bootstrap();
  createRoot(container).render(
    <StrictMode>
      <Root env={env} />
    </StrictMode>,
  );
} catch (error) {
  container.innerHTML = `<pre style="padding:24px;font:13px ui-monospace;color:#f87171">${
    error instanceof Error ? error.message : String(error)
  }</pre>`;
}
