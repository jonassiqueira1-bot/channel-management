import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

Sentry.init({
  dsn: 'https://2541b894bb161398343e880b66b48cb0@o4511649712701440.ingest.us.sentry.io/4511649721876480',
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
  release: process.env.REACT_APP_SENTRY_RELEASE || 'boostly@local',
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Algo deu errado. A equipe foi notificada.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

reportWebVitals();
