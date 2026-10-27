/*
 * SetteGames — il comportamento comune a tutte le pagine (testata POP RIOT).
 * Menu del telefono e sottomenu dei giochi: si aprono col tasto, si chiudono
 * con Esc, toccando fuori o scegliendo una voce. Senza JavaScript la testata
 * resta leggibile: su computer le voci sono visibili, sul telefono il menu
 * si apre comunque perché `hidden` lo mette lo script.
 */
(function () {
  var tasto = document.querySelector('.apri-menu');
  var menu = document.getElementById('menu');
  var stretto = window.matchMedia('(max-width: 860px)');
  if (tasto && menu) {
    var chiudi = function () { tasto.setAttribute('aria-expanded', 'false'); if (stretto.matches) menu.hidden = true; };
    var sistema = function () { menu.hidden = stretto.matches ? tasto.getAttribute('aria-expanded') !== 'true' : false; };
    tasto.addEventListener('click', function () {
      var aperto = tasto.getAttribute('aria-expanded') === 'true';
      tasto.setAttribute('aria-expanded', String(!aperto));
      menu.hidden = aperto;
      if (!aperto) { var primo = menu.querySelector('a, button'); if (primo) primo.focus(); }
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) chiudi(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && tasto.getAttribute('aria-expanded') === 'true') { chiudi(); tasto.focus(); } });
    if (stretto.addEventListener) stretto.addEventListener('change', sistema);
    sistema();
  }

  var tg = document.querySelector('.apri-giochi');
  var sm = document.getElementById('sottomenu-giochi');
  if (tg && sm) {
    var chiudiGiochi = function () { tg.setAttribute('aria-expanded', 'false'); sm.hidden = true; };
    tg.addEventListener('click', function (e) {
      e.stopPropagation();
      var aperto = tg.getAttribute('aria-expanded') === 'true';
      tg.setAttribute('aria-expanded', String(!aperto)); sm.hidden = aperto;
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.voce-giochi')) chiudiGiochi(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sm.hidden) { chiudiGiochi(); tg.focus(); } });
    sm.addEventListener('click', function (e) { if (e.target.closest('a')) chiudiGiochi(); });
  }

  /*
   * L'INTERRUTTORE DELL'APP STORE (27 ott 2026)
   * Ogni gioco si accende il giorno in cui Apple lo pubblica: `true` qui sotto, poi si
   * pubblica il sito. Prima, https://apps.apple.com/app/id<numero> deve rispondere 200.
   * Nelle pagine [data-ios="gioco"] nasce `hidden` (badge, «iPhone» nei testi) e compare
   * col gioco acceso; [data-ios-presto="gioco"] è il «presto» che sparisce. Il menu dei
   * giochi aggiunge «· iPhone». Senza JavaScript resta il «presto»: mai un link rotto.
   */
  var SU_APP_STORE = { settebello: false, briscola: false, lastsheep: false, snake: false };
  var acceso = function (el, attributo) { return SU_APP_STORE[el.getAttribute(attributo)] === true; };
  [].forEach.call(document.querySelectorAll('[data-ios]'), function (el) { el.hidden = !acceso(el, 'data-ios'); });
  [].forEach.call(document.querySelectorAll('[data-ios-presto]'), function (el) { el.hidden = acceso(el, 'data-ios-presto'); });
  [].forEach.call(document.querySelectorAll('.sottomenu a'), function (a) {
    var g = (a.pathname.match(/^\/(settebello|briscola|lastsheep|snake)\/$/) || [])[1];
    var riga = a.querySelector('small');
    if (g && riga && SU_APP_STORE[g] === true) riga.textContent += ' · iPhone';
  });
})();
