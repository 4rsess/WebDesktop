document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.querySelector('.login-box form');
  
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = this.querySelector('input[type="text"]').value;
    const password = this.querySelector('input[type="password"]').value;
    const rememberMe = this.querySelector('#remember').checked;
    
    const loginData = {
      username: username,
      password: password
    };
    
    fetch('http://5.129.207.193:8080/auth/login', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Ошибка входа');
      }
      return response.json();
    })
    .then(data => {
      localStorage.setItem('authToken', data.token);
      
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username);
      } else {
        localStorage.removeItem('rememberedUsername');
      }
      
      window.location.href = '../main/Main.html';
    })
    .catch(error => {
      console.error('Ошибка:', error);
      alert('Неверный логин или пароль');
    });
  });
  
  const rememberedUsername = localStorage.getItem('rememberedUsername');
  if (rememberedUsername) {
    const usernameInput = document.querySelector('input[type="text"]');
    usernameInput.value = rememberedUsername;
    document.querySelector('#remember').checked = true;
  }
});