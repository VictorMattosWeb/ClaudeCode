!function(){
  function init(){
    if (window.UnicornStudio && typeof window.UnicornStudio.init === 'function' && !window.UnicornStudio.isInitialized) {
      try { window.UnicornStudio.init(); window.UnicornStudio.isInitialized = true; }
      catch (e) { console.warn('[unicorn-studio] init failed:', e); }
    }
  }
  if (window.UnicornStudio) { init(); return; }
  window.UnicornStudio = { isInitialized: false };
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.2/dist/unicornStudio.umd.js';
  s.onload = init;
  (document.head || document.body).appendChild(s);
}();
