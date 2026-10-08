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
})();
