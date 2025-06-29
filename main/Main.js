let currentSlide = 0;
let promotions = [];

function checkAuth() {
  const authToken = localStorage.getItem('authToken');
  const profileLink = document.getElementById('profile-link');
  const loginBtn = document.getElementById('login-btn');

  if (authToken) {
    profileLink.style.display = 'block';
    loginBtn.style.display = 'none';
  } else {
    profileLink.style.display = 'none';
    loginBtn.style.display = 'block';
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