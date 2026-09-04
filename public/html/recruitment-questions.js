// 招新题组页：tab 切换（与管理员页 chart-tab 同一交互模式：点击 + 左右方向键 + URL hash 深链）
(function () {
  var names = ['python', 'c'];

  function switchQuestions(name, updateHash) {
    if (names.indexOf(name) === -1) name = 'python';
    document.querySelectorAll('.questions-tab').forEach(function (tab) {
      var isActive = tab.dataset.questions === name;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.tabIndex = isActive ? 0 : -1;
    });
    document.querySelectorAll('.questions-view').forEach(function (view) {
      view.classList.toggle('is-active', view.id === 'questions-' + name);
    });
    if (updateHash !== false && history.replaceState) {
      history.replaceState(null, '', '#' + name);
    }
  }

  document.querySelectorAll('.questions-tab').forEach(function (tab) {
    tab.addEventListener('click', function () { switchQuestions(tab.dataset.questions); });
    tab.addEventListener('keydown', function (event) {
      var index = names.indexOf(tab.dataset.questions);
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        var next = names[(index + (event.key === 'ArrowRight' ? 1 : names.length - 1)) % names.length];
        switchQuestions(next);
        document.getElementById('questions-tab-' + next).focus();
      }
    });
  });

  if (location.hash) switchQuestions(location.hash.slice(1), false);
  window.addEventListener('hashchange', function () {
    switchQuestions(location.hash.slice(1), false);
  });
})();
