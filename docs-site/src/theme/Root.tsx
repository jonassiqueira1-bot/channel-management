import React, { useEffect } from 'react';

export default function Root({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (window as any).$crisp = [];
    (window as any).CRISP_WEBSITE_ID = '5c56d2db-e204-4cb5-a19b-465e8d3cd17c';
    const s = document.createElement('script');
    s.src = 'https://client.crisp.chat/l.js';
    s.async = true;
    document.head.appendChild(s);
  }, []);

  return <>{children}</>;
}
