import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const suppressHmrWebSocketPlugin = () => ({
  name: 'suppress-hmr-ws-plugin',
  transformIndexHtml: {
    order: 'pre' as const,
    handler() {
      return [
        {
          tag: 'script',
          attrs: { type: 'text/javascript' },
          children: `
            (function() {
              var OrigWebSocket = window.WebSocket;
              if (OrigWebSocket) {
                window.WebSocket = function(url, protocols) {
                  var urlStr = String(url || '');
                  var isViteHmr =
                    (typeof protocols === 'string' && protocols.indexOf('vite-hmr') !== -1) ||
                    (Array.isArray(protocols) && protocols.indexOf('vite-hmr') !== -1) ||
                    urlStr.indexOf('vite-hmr') !== -1 ||
                    urlStr.indexOf('token=') !== -1;

                  if (isViteHmr) {
                    var listeners = {};
                    var dummyWs = {
                      url: urlStr,
                      readyState: 1,
                      CONNECTING: 0,
                      OPEN: 1,
                      CLOSING: 2,
                      CLOSED: 3,
                      binaryType: 'blob',
                      bufferedAmount: 0,
                      extensions: '',
                      protocol: 'vite-hmr',
                      onopen: null,
                      onclose: null,
                      onerror: null,
                      onmessage: null,
                      addEventListener: function(event, cb) {
                        if (!listeners[event]) listeners[event] = [];
                        listeners[event].push(cb);
                        if (event === 'open') {
                          setTimeout(function() {
                            try { cb({ type: 'open', target: dummyWs }); } catch (_) {}
                            if (dummyWs.onopen) try { dummyWs.onopen({ type: 'open', target: dummyWs }); } catch (_) {}
                          }, 0);
                        }
                      },
                      removeEventListener: function(event, cb) {
                        if (listeners[event]) {
                          listeners[event] = listeners[event].filter(function(fn) { return fn !== cb; });
                        }
                      },
                      dispatchEvent: function() { return true; },
                      send: function() {},
                      close: function() {
                        dummyWs.readyState = 3;
                      }
                    };
                    return dummyWs;
                  }

                  try {
                    var ws = new OrigWebSocket(url, protocols);
                    ws.addEventListener('error', function(e) {
                      if (e && e.stopImmediatePropagation) e.stopImmediatePropagation();
                    });
                    return ws;
                  } catch (err) {
                    return {
                      readyState: 3,
                      addEventListener: function() {},
                      removeEventListener: function() {},
                      send: function() {},
                      close: function() {}
                    };
                  }
                };

                window.WebSocket.prototype = OrigWebSocket.prototype;
                window.WebSocket.CONNECTING = 0;
                window.WebSocket.OPEN = 1;
                window.WebSocket.CLOSING = 2;
                window.WebSocket.CLOSED = 3;
              }

              window.addEventListener('unhandledrejection', function(event) {
                var reason = event.reason;
                var msg = (reason && (reason.message || reason.stack || String(reason))) || '';
                if (
                  msg.indexOf('WebSocket closed without opened') !== -1 ||
                  msg.indexOf('createWebSocketModuleRunnerTransport') !== -1 ||
                  msg.indexOf('@vite/client') !== -1 ||
                  msg.indexOf('vite:ws') !== -1
                ) {
                  event.preventDefault();
                  if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                }
              });

              window.addEventListener('error', function(event) {
                var msg = event.message || '';
                var filename = event.filename || '';
                if (
                  msg.indexOf('WebSocket') !== -1 ||
                  filename.indexOf('@vite/client') !== -1 ||
                  msg.indexOf('createWebSocketModuleRunnerTransport') !== -1
                ) {
                  event.preventDefault();
                  if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                }
              });

              var origConsoleError = console.error;
              console.error = function() {
                var first = arguments[0] ? String(arguments[0]) : '';
                if (
                  first.indexOf('[vite] failed to connect to websocket') !== -1 ||
                  first.indexOf('WebSocket closed without opened') !== -1 ||
                  first.indexOf('createWebSocketModuleRunnerTransport') !== -1
                ) {
                  return;
                }
                origConsoleError.apply(console, arguments);
              };
            })();
          `,
          injectTo: 'head-prepend' as const,
        },
      ];
    },
  },
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [suppressHmrWebSocketPlugin(), react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio dev environment to prevent WebSocket transport errors in iframe
      hmr: false,
      ws: false,
    },
  };
});
