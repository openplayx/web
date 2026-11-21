/* OpenPlayX UI kit — theme + small behaviours for Basecoat pages.
   Load synchronously in <head> (after the CSS) so the theme applies before first paint.
   Theme preference: ?theme=light|dark → localStorage "opx-theme" → OS setting. */
(function(){
  'use strict';
  var root=document.documentElement,mq=window.matchMedia('(prefers-color-scheme: dark)');
  function pref(){
    try{var q=new URLSearchParams(location.search).get('theme');if(q==='light'||q==='dark')return q;}catch(e){}
    try{var s=localStorage.getItem('opx-theme');if(s==='light'||s==='dark')return s;}catch(e){}
    return 'system';
  }
  function apply(){var p=pref();root.classList.toggle('dark',p==='dark'||(p==='system'&&mq.matches));root.setAttribute('data-theme-preference',p);}
  apply();
  if(mq.addEventListener)mq.addEventListener('change',apply);
  window.opxTheme={get:pref,set:function(v){try{if(v==='light'||v==='dark')localStorage.setItem('opx-theme',v);else localStorage.removeItem('opx-theme');}catch(e){}apply();}};

  /* Basecoat .sidebar: open on desktop, off-canvas below 768px.
     Any [data-sidebar-toggle] button toggles it; links/buttons inside close it on mobile. */
  function initSidebars(){
    var narrow=window.matchMedia('(max-width: 767px)');
    document.querySelectorAll('.sidebar').forEach(function(bar){
      if(bar.hasAttribute('data-sidebar-initialized'))return;
      function set(open){bar.setAttribute('aria-hidden',String(!open));if(open)bar.removeAttribute('inert');else bar.setAttribute('inert','');}
      set(!narrow.matches);
      bar.addEventListener('click',function(event){
        if(!narrow.matches)return;
        var nav=bar.querySelector(':scope > nav');
        if(event.target.closest('a,button')||(nav&&!nav.contains(event.target)))set(false);
      });
      if(narrow.addEventListener)narrow.addEventListener('change',function(){set(!narrow.matches);});
      bar.opxToggle=function(){set(bar.getAttribute('aria-hidden')==='true');};
      bar.setAttribute('data-sidebar-initialized','true');
    });
    document.querySelectorAll('[data-sidebar-toggle]').forEach(function(button){
      if(button.hasAttribute('data-opx-bound'))return;
      button.setAttribute('data-opx-bound','');
      button.addEventListener('click',function(){var bar=document.querySelector('.sidebar');if(bar&&bar.opxToggle)bar.opxToggle();});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSidebars);else initSidebars();
})();
