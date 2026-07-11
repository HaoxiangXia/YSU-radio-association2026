// 假设服务器运行在本地的 5000 端口
const apiUrl = 'http://localhost:5000/api/trainings';

axios.get(apiUrl)
  .then(response => {
    const trainings = response.data;
    if (trainings.length === 0) {
      console.log('近期培训计划为空');
      document.getElementById('upcoming-trainings').innerHTML = '<p style="color: #d32f2f; font-size: 1.05rem;">近期暂无培训计划。</p>';
    } else {
      console.log('近期有培训计划');
      console.log(trainings);
      let html = '';
      trainings.forEach(training => {
        html += `
          <div class="training-card">
            <h2>${training.name}</h2>
            <div class="training-meta">
              <span>日期: ${training.date}</span>
              <span>时间: ${training.time}</span>
              <span>地点: ${training.location}</span>
            </div>
            <p>${training.description}</p>
            <a href="registration.html?training=${encodeURIComponent(training.name)}" class="btn-register">报名</a>
          </div>
        `;
      });
      document.getElementById('upcoming-trainings').innerHTML = html;
    }
  })
  .catch(error => {
    console.error('获取培训数据时出错:', error.message);
    document.getElementById('upcoming-trainings').innerHTML = '<p style="color: #d32f2f; font-size: 1.05rem;">无法加载培训计划，请稍后再试。</p>';
  });