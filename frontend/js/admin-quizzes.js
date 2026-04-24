(function () {
  'use strict';
  if (document.body.dataset.appShell !== 'admin') return;

  const { request, showAppAlert } = window.StudyAdmin;
  const root = document.getElementById('content');
  if (!root) return;

  root.querySelector('#adQuiz').addEventListener('submit', async (e) => {
    e.preventDefault();
    showAppAlert('');
    const fd = new FormData(e.target);
    try {
      await request(`lessons/${fd.get('lessonId')}/quizzes`, {
        method: 'POST',
        body: { title: fd.get('title') },
      });
      showAppAlert('Đã tạo quiz.', 'ok');
      e.target.reset();
    } catch (err) {
      showAppAlert(err.message, 'error');
    }
  });

  root.querySelector('#adResult').addEventListener('submit', async (e) => {
    e.preventDefault();
    showAppAlert('');
    const fd = new FormData(e.target);
    try {
      await request('quiz-results', {
        method: 'POST',
        body: {
          userId: Number(fd.get('userId')),
          quizId: Number(fd.get('quizId')),
          score: Number(fd.get('score')),
        },
      });
      showAppAlert('Đã lưu kết quả.', 'ok');
    } catch (err) {
      showAppAlert(err.message, 'error');
    }
  });
})();
