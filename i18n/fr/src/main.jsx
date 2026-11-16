import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { setRecordEnd } from './metrics.js';
import { NOANIM } from './util.jsx';
if (NOANIM) document.documentElement.classList.add('fb-noanim');
// The record's end, from the data embedded at build (last complete month; December 2025 without 2026 tiles).
try { setRecordEnd(JSON.parse(document.getElementById('fb-record').textContent).end); } catch (e) { /* default: 2025-12 */ }
window.React = React; // Atelier Terrain components read React here, at render time
createRoot(document.getElementById('root')).render(React.createElement(App));
