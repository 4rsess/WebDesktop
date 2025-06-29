let currentSlide = 0;
let promotions = [];
let editingPromoId = null;

document.getElementById('logout-link').addEventListener('click', function (event) {
    event.preventDefault();
    localStorage.clear();
    window.location.href = '../login/Login.html'; 
  });

function checkAuth() {
  const authToken = localStorage.getItem('authToken');
  const profileLink = document.getElementById('profile-link');
  const loginBtn = document.getElementById('login-btn');
  const exitBtn = document.getElementById('logout-link');
  const bookingbtn = document.getElementById('booking-btn');

  if (authToken) {
    profileLink.style.display = 'block';
    loginBtn.style.display = 'none';
    exitBtn.style.display = 'block';
    bookingbtn.style.display = 'block';
  } else {
    profileLink.style.display = 'none';
    loginBtn.style.display = 'block';
    exitBtn.style.display = 'none';
    bookingbtn.style.display = 'none';
  }
}

function initSlider() {
  fetch('http://5.129.207.193:8080/promotions')
    .then(response => {
      if (!response.ok) throw new Error('Ошибка загрузки акций');
      return response.json();
    })
    .then(data => {
      promotions = data;
      renderSlides();
      updateSlider();

      promotions.items.forEach((promo, index) => {
        if (promo.imageId) {
          loadPromoImage(promo.imageId, `promo-img-${index}`);
        }
      });
    })
    .catch(error => {
      console.error('Ошибка:', error);
      document.querySelector('.slider').style.display = 'none';
    });
}

function loadPromoImage(imageId, elementId) {
  fetch(`http://5.129.207.193:8080/files/${imageId}`, {
    headers: {
      'accept': 'image/*'
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Ошибка загрузки изображения');
    return response.blob();
  })
  .then(blob => {
    const url = URL.createObjectURL(blob);
    document.getElementById(elementId).src = url;
  })
  .catch(error => {
    console.error('Ошибка загрузки изображения:', error);
    document.getElementById(elementId).src = '/pictures/default-promo.svg';
  });
}

function renderSlides() {
  const slideContainer = document.querySelector('.slide-container');
  const dotsContainer = document.querySelector('.dots');
  
  slideContainer.innerHTML = '';
  dotsContainer.innerHTML = '';

  if (promotions.length === 0) {
    document.querySelector('.slider').style.display = 'none';
    return;
  }

  promotions.items.forEach((promo, index) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    
    const startDate = formatDate(promo.startDate);
    const endDate = formatDate(promo.endDate);
    
    slide.innerHTML = `
      <div class="slide-text">
      <h2>${getPromoTitle(promo)}</h2>
      <p>${promo.description}</p>
      <div class="promo-details">
        <div class="promo-detail">
          <span class="detail-label">Платформы:</span>
          <span class="detail-value">${promo.platformFor || 'Все'}</span>
        </div>
        <div class="promo-detail">
          <span class="detail-label">Действует:</span>
          <span class="detail-value">${startDate} - ${endDate}</span>
        </div>
      </div>
    </div>
    <img id="promo-img-${index}" src="/pictures/default-promo.svg" alt="Promo ${promo.id}">
    <div class="slide-actions">
        <p class="icon edit-icon" data-id="${promo.id}" data-index="${index}">🖊️</p>
        <p class="icon delete-icon" data-id="${promo.id}">🗑️</p>
    </div>
    
    `;
    slideContainer.appendChild(slide);

    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.addEventListener('click', () => {
      currentSlide = index;
      updateSlider();
    });
    dotsContainer.appendChild(dot);

    if (promo.imageId) {
      loadPromoImage(promo.imageId, `promo-img-${index}`);
    }

    slide.querySelector('.delete-icon').addEventListener('click', (event) => {
      const promoId = event.target.getAttribute('data-id');
      if (confirm('Вы уверены, что хотите удалить эту акцию?')) {
        deletePromotion(promoId);
      }
    });

    slide.querySelector('.edit-icon').addEventListener('click', () => {
      editPromotion(promo);
    });

  });
}

function formatDate(dateString) {
  if (!dateString) return 'не указано';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getPromoTitle(promo) {
  switch(promo.type) {
    case 'PERCENT':
      return `Скидка ${promo.promotionValue}%`;
    case 'FIXED_AMOUNT':
      return `Бонус ${promo.promotionValue}₽`;
    default:
      return 'Акция';
  }
}

function updateSlider() {
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');
  
  slides.forEach((slide, index) => {
    slide.classList.toggle('active', index === currentSlide);
  });
  
  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentSlide);
  });
}

document.querySelector('.arrow-left').addEventListener('click', () => {
  if (promotions && promotions.items && promotions.items.length > 0) {
    currentSlide = (currentSlide - 1 + promotions.items.length) % promotions.items.length;
    updateSlider();
  }
});

document.querySelector('.arrow-right').addEventListener('click', () => {
  if (promotions && promotions.items && promotions.items.length > 0) {
    currentSlide = (currentSlide + 1) % promotions.items.length;
    updateSlider();
  }
});

let slideInterval;
if (promotions.length > 0) {
  slideInterval = setInterval(() => {
    currentSlide = (currentSlide + 1) % promotions.length;
    updateSlider();
  }, 5000);
}

document.querySelector('.slider').addEventListener('mouseenter', () => {
  clearInterval(slideInterval);
});

document.querySelector('.slider').addEventListener('mouseleave', () => {
  if (promotions.length > 0) {
    slideInterval = setInterval(() => {
      currentSlide = (currentSlide + 1) % promotions.length;
      updateSlider();
    }, 5000);
  }
});

document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  initSlider();
});

document.getElementById('create-promo-btn').addEventListener('click', () => {
  document.getElementById('promo-modal').style.display = 'flex';
});

document.getElementById('cancel-btn').addEventListener('click', () => {
  document.getElementById('promo-modal').style.display = 'none';
  document.getElementById('promo-form').reset();
  editingPromoId = null;
  document.querySelector('#promo-form button[type="submit"]').textContent = 'Создать';
});


document.getElementById('promo-image-input').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  fetch('http://5.129.207.193:8080/files', {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      document.getElementById('image-id-field').value = data.id;
    })
    .catch(err => {
      alert('Ошибка загрузки изображения');
      console.error(err);
    });
});

document.getElementById('promo-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const payload = {
    type: formData.get('type'),
    promotionValue: parseFloat(formData.get('promotionValue')),
    description: formData.get('description'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    platformFor: formData.get('platformFor'),
    imageId: formData.get('imageId')
  };

  const url = editingPromoId 
    ? `http://5.129.207.193:8080/promotions/${editingPromoId}`
    : 'http://5.129.207.193:8080/promotions';

  const method = editingPromoId ? 'PUT' : 'POST';

  fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'accept': '*/*'
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) throw new Error(editingPromoId ? 'Ошибка при обновлении' : 'Ошибка создания акции');
    alert(editingPromoId ? 'Акция успешно обновлена' : 'Акция успешно создана!');
    document.getElementById('promo-modal').style.display = 'none';
    this.reset();
    editingPromoId = null;
    document.querySelector('#promo-form button[type="submit"]').textContent = 'Создать';
    initSlider();
  })
  .catch(err => {
    alert(editingPromoId ? 'Ошибка при обновлении акции' : 'Ошибка при создании акции');
    console.error(err);
  });
});



function deletePromotion(promoId) {
  fetch(`http://5.129.207.193:8080/promotions/${promoId}`, {
    method: 'DELETE',
    headers: {
      'accept': '*/*'
    }
  })
  .then(response => {
    if (!response.ok) throw new Error('Не удалось удалить акцию');
    alert('Акция успешно удалена');
    initSlider();
    location.reload();
  })
  .catch(error => {
    console.error('Ошибка при удалении:', error);
    alert('Ошибка при удалении акции');
  });
}

function editPromotion(promo) {
  editingPromoId = promo.id;
  document.getElementById('promo-modal').style.display = 'flex';

  document.querySelector('select[name="type"]').value = promo.type;
  document.querySelector('input[name="promotionValue"]').value = promo.promotionValue;
  document.querySelector('textarea[name="description"]').value = promo.description;
  document.querySelector('input[name="startDate"]').value = promo.startDate;
  document.querySelector('input[name="endDate"]').value = promo.endDate;
  document.querySelector('select[name="platformFor"]').value = promo.platformFor || '';
  document.getElementById('image-id-field').value = promo.imageId || '';

  const submitButton = document.querySelector('#promo-form button[type="submit"]');
  submitButton.textContent = 'Сохранить изменения';
}