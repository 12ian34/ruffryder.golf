import React from 'react';
import { createRoot } from 'react-dom/client';
import posthog from 'posthog-js';
import App from './App';
import './index.css';

// Initialize PostHog with environment variables
const posthogKey = import.meta.env.VITE_POSTHOG_API_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';
const posthogDebug = import.meta.env.VITE_POSTHOG_DEBUG === 'true';

// Initialize PostHog if the key is available
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: 'identified_only',
    persistence: 'localStorage+cookie',
    persistence_name: 'ph_ruffryder',
    cookie_name: 'ph_' + posthogKey,
    disable_cookie: false,
    disable_session_recording: false,
    enable_recording_console_log: true,
    mask_all_text: false,
    mask_all_element_attributes: false,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
      }
    },
    property_denylist: ['$current_url', '$pathname'],
    debug: posthogDebug,
    loaded: function(posthogInstance) {
      // Register default properties that will be sent with all events
      posthogInstance.register({
        app_version: '1.0.0',
        platform: 'web',
        initial_referrer: document.referrer,
        is_test_user: false
      });
    }
  });
} else {
  console.warn('PostHog API key not found in environment variables');
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);