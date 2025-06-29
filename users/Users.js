let authToken = localStorage.getItem('authToken');

if (!authToken) {
  window.location.href = '../login/Login.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('users-container');

  try {
    const response = await fetch('http://5.129.207.193:8080/admin/users', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Не удалось получить список пользователей');
    }

    const users = await response.json();

    users.forEach(user => {
      const card = document.createElement('div');
      card.className = 'user-card';

      card.innerHTML = `
        <h3>${user.username}</h3>
        <p><strong>ID:</strong> ${user.id}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Телефон:</strong> ${user.phone}</p>
        <p><strong>Администратор:</strong> ${user.admin ? 'Да' : 'Нет'}</p>
      `;

      card.addEventListener('click', async () => {
        if (user.admin) {
          const confirmDelete = confirm('Вы уверены, что хотите удалить администратора?');
          if (confirmDelete) {
            try {
              const res = await fetch(`http://5.129.207.193:8080/admin/admins/${user.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${authToken}`
                }
              });
              if (!res.ok) throw new Error('Не удалось удалить администратора');
              alert('Администратор удалён');
              location.reload(); // Обновим список
            } catch (err) {
              alert('Ошибка: ' + err.message);
            }
          }
        } else {
          const confirmPromote = confirm('Вы уверены, что хотите назначить пользователя админом?');
          if (confirmPromote) {
            try {
              const res = await fetch(`http://5.129.207.193:8080/admin/admins?userId=${user.id}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`
                }
              });
              if (!res.ok) throw new Error('Не удалось назначить администратора');
              alert('Пользователь назначен админом');
              location.reload(); // Обновим список
            } catch (err) {
              alert('Ошибка: ' + err.message);
            }
          }
        }
      });

      container.appendChild(card);
    });

  } catch (error) {
    container.innerHTML = `<p style="color: red;">Ошибка: ${error.message}</p>`;
    console.error(error);
  }
});