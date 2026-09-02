// Aura offline-fix: rewrites image src/srcset to local assets and forces hidden content visible
(function(){
var IMG_MAP = {"https://ai-saas-landing-27.aura.build/logo-aura-gray.svg": "assets/23a9f32ff7d46956_logo-aura-gray.svg", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop": "assets/86f508647d7a7ba6_photo-1464822759023-fed622ff2c.avif", "https://www.google.com/pagead/1p-user-list/17731977471/?random=1777582943586&cv=11&fst=1777582800000&bg=ffffff&guid=ON&async=1&en=gtag.config&gtm=45je64t0h1v9218448198za200zd9218448198xec&gcd=13l3l3l3l1l1&dma=0&tag_exp=0~115938466~115938468~116363097&u_w=1920&u_h=1080&url=https%3A%2F%2Fai-saas-landing-27.aura.build%2F&rcb=0&frm=1&tiba=Sondero%20-%20AI%20Operating%20System&hn=www.googleadservices.com&npa=0&pscdl=noapi&uaa=x86&uab=64&uafvl=HeadlessChrome%3B147.0.7727.15%7CNot.A%252FBrand%3B8.0.0.0%7CChromium%3B147.0.7727.15&uamb=0&uam=&uap=macOS&uapv=10.15.7&uaw=0&data=event%3Dgtag.config&rfmt=3&fmt=3&is_vtc=1&cid=CAQSsAEABaugffvT58mq1okfn3MrNzHEgGJhZWuUPrNcIMELfMRcBtK1Q8bKkZawBx6xqyrEQDkIBIITnEr614aCR6BncJtR3EazmhIzShEXut6RgxT-42gRd02IJt0GYOL1QQhbgqcJZfDYP1_BVFjX47ilcaqXBS_e3B2zXl6TUhH9NzfBdBI2rzOVL-AhQOYBQTXTy31_PqzQFKLQZYEqyyGle5dJrmk7HqEQYdK76wM6JQ&random=3889811548&rmt_tld=0&ipr=y": "assets/ef1955ae757c8b96_file.gif", "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/preview-images/ai-saas-landing-27.png": "assets/d2ec666acf915384_ai-saas-landing-27.png", "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/1cecfee1-4f70-44cb-859d-503cb03a9e42_320w.png": "assets/2a45e0c23f413529_1cecfee1-4f70-44cb-859d-503cb0.png", "https://www.google.com.br/pagead/1p-user-list/17731977471/?random=1777582943586&cv=11&fst=1777582800000&bg=ffffff&guid=ON&async=1&en=gtag.config&gtm=45je64t0h1v9218448198za200zd9218448198xec&gcd=13l3l3l3l1l1&dma=0&tag_exp=0~115938466~115938468~116363097&u_w=1920&u_h=1080&url=https%3A%2F%2Fai-saas-landing-27.aura.build%2F&rcb=0&frm=1&tiba=Sondero%20-%20AI%20Operating%20System&hn=www.googleadservices.com&npa=0&pscdl=noapi&uaa=x86&uab=64&uafvl=HeadlessChrome%3B147.0.7727.15%7CNot.A%252FBrand%3B8.0.0.0%7CChromium%3B147.0.7727.15&uamb=0&uam=&uap=macOS&uapv=10.15.7&uaw=0&data=event%3Dgtag.config&rfmt=3&fmt=3&is_vtc=1&cid=CAQSsAEABaugffvT58mq1okfn3MrNzHEgGJhZWuUPrNcIMELfMRcBtK1Q8bKkZawBx6xqyrEQDkIBIITnEr614aCR6BncJtR3EazmhIzShEXut6RgxT-42gRd02IJt0GYOL1QQhbgqcJZfDYP1_BVFjX47ilcaqXBS_e3B2zXl6TUhH9NzfBdBI2rzOVL-AhQOYBQTXTy31_PqzQFKLQZYEqyyGle5dJrmk7HqEQYdK76wM6JQ&random=3889811548&rmt_tld=1&ipr=y": "assets/ef1955ae757c8b96_file.gif", "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/169cdb38-2656-4555-bec1-d1acc64bb6fa_3840w.png": "assets/d025a624e6055e7a_169cdb38-2656-4555-bec1-d1acc6.png"};
// Pre-populate path+query keys so file:// lookups succeed even when
// the original map is keyed by the captured https://… URL.
var _add = {};
for (var _k in IMG_MAP) {
  try { var _u = new URL(_k); _add[_u.pathname + _u.search] = IMG_MAP[_k]; } catch(e){}
}
for (var _k in _add) if (!IMG_MAP[_k]) IMG_MAP[_k] = _add[_k];
function resolveLocal(u){
  if (!u) return null;
  if (IMG_MAP[u]) return IMG_MAP[u];
  try {
    var url = new URL(u, location.href);
    // Path+query lookup (handles file:// resolution mismatch)
    var pq = url.pathname + url.search;
    if (IMG_MAP[pq]) return IMG_MAP[pq];
    // Next.js image optimization endpoint — peel the inner CDN URL
    if (/_next\/image$/.test(url.pathname)) {
      var t = url.searchParams.get('url');
      if (t) {
        var decoded = decodeURIComponent(t);
        if (IMG_MAP[decoded]) return IMG_MAP[decoded];
        var bare = decoded.split('?')[0];
        for (var k in IMG_MAP) {
          if (k.split('?')[0] === bare) return IMG_MAP[k];
        }
      }
    }
  } catch(e){}
  return null;
}
function rewriteSrcset(s){
  if (!s || s.indexOf('http') === -1 && s.indexOf('/_next') === -1) return s;
  return s.split(',').map(function(it){
    var p = it.trim().split(/\s+/);
    var loc = resolveLocal(p[0]);
    if (loc) p[0] = loc;
    return p.join(' ');
  }).join(', ');
}
function fixImg(el){
  if (!el || el.tagName !== 'IMG') return;
  var src = el.getAttribute('src');
  var loc = resolveLocal(src);
  if (loc && src !== loc) el.setAttribute('src', loc);
  var ss = el.getAttribute('srcset');
  if (ss) {
    var nss = rewriteSrcset(ss);
    if (nss !== ss) el.setAttribute('srcset', nss);
  }
}
function fixAll(){
  document.querySelectorAll('img').forEach(fixImg);
}
function reveal(){
  var n = 0;
  document.querySelectorAll('[style]').forEach(function(el){
    var s = el.style;
    if (s.opacity === '0' && el.offsetParent !== null) {
      s.opacity = '1';
      if (s.transform) s.transform = 'none';
      if (s.translate) s.translate = 'none';
      if (s.rotate)    s.rotate = 'none';
      if (s.scale)     s.scale = 'none';
      n++;
    }
  });
  if (window.console && n) console.log('[offline-fix] revealed', n);
}
// UnicornStudio (and similar libs that load dynamically via an inline
// loader) self-skip when window.UnicornStudio already exists — but we
// captured both the loaded UMD script AND the inline loader, so the
// loader bails and init() never runs. Force it.
function initUnicornStudio(){
  if (window.UnicornStudio && typeof window.UnicornStudio.init === 'function'
      && !window.UnicornStudio.isInitialized) {
    try { window.UnicornStudio.init(); window.UnicornStudio.isInitialized = true; }
    catch(e){ if(window.console) console.warn('[offline-fix] UnicornStudio init failed:', e); }
  }
}
// Initial sweep
fixAll();
// React/Next.js will re-render imgs after hydration — watch for that
var obs = new MutationObserver(function(muts){
  for (var i = 0; i < muts.length; i++) {
    var m = muts[i];
    if (m.type === 'attributes' && m.target.tagName === 'IMG') fixImg(m.target);
    for (var j = 0; j < m.addedNodes.length; j++) {
      var n = m.addedNodes[j];
      if (n && n.nodeType === 1) {
        if (n.tagName === 'IMG') fixImg(n);
        if (n.querySelectorAll) n.querySelectorAll('img').forEach(fixImg);
      }
    }
  }
});
obs.observe(document, {childList:true, subtree:true,
  attributes:true, attributeFilter:['src','srcset']});
// Periodic re-scan (catches src updates we missed)
setTimeout(fixAll, 1000);
setTimeout(fixAll, 3000);
// Wait for animations to play before forcing visibility
var go = function(){
  setTimeout(reveal, 5000);
  initUnicornStudio();
  setTimeout(initUnicornStudio, 500);
  setTimeout(initUnicornStudio, 2000);
};
if (document.readyState === 'complete') go();
else window.addEventListener('load', go);
})();