import { initBotId } from 'botid/client/core';

// Invisible bot checks on every form that writes data or sends email.
initBotId({
  protect: [
    { path: '/api/subscribe', method: 'POST' },
    { path: '/api/lamplighters/apply', method: 'POST' },
    { path: '/api/auth/request', method: 'POST' },
    { path: '/api/premium/checkout', method: 'POST' },
    { path: '/api/founders/checkout', method: 'POST' },
  ],
});
