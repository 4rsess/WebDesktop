const branchSelector = document.querySelector('.branch-selector');
const selectedBranch = document.getElementById('selected-branch');
const branchOptions = document.getElementById('branch-options');
const grid = document.getElementById('computer-grid');
const pcDetails = document.getElementById('pc-details');
let currentBranchId = null;
let selectedPcId = null;
let computers = [];
let authToken = localStorage.getItem('authToken');

if (!authToken) {
  window.location.href = '../login/Login.html';
  alert("Токен авторизации отсутствует");
}

async function loadBranches() {
  try {
    const response = await fetch('http://5.129.207.193:8080/branches', {
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) throw new Error('Ошибка загрузки филиалов');
    
    const branches = await response.json();
    if (!branches.length) throw new Error('Нет доступных филиалов');
    
    branchOptions.innerHTML = '';
    
    branches.forEach(branch => {
      const option = document.createElement('div');
      option.className = 'branch-option';
      option.textContent = branch.name;
      option.onclick = () => {
        selectedBranch.querySelector('span').textContent = branch.name;
        branchSelector.classList.remove('active');
        currentBranchId = branch.id;
        loadBranchComputers(branch.id, branch.width, branch.height);
      };
      branchOptions.appendChild(option);
    });
    
    selectedBranch.querySelector('span').textContent = branches[0].name;
    currentBranchId = branches[0].id;
    loadBranchComputers(branches[0].id, branches[0].width, branches[0].height);
    
  } catch (error) {
    console.error('Ошибка:', error);
    selectedBranch.querySelector('span').textContent = 'Ошибка загрузки';
    branchOptions.innerHTML = '<div class="branch-option">Нет доступных филиалов</div>';
  }
}

selectedBranch.onclick = () => {
  branchSelector.classList.toggle('active');
};

document.addEventListener('click', (e) => {
  if (!branchSelector.contains(e.target)) {
    branchSelector.classList.remove('active');
  }
});

async function loadBranchComputers(branchId, width, height) {
  try {
    const response = await fetch(`http://5.129.207.193:8080/branches/${branchId}/pcs`, {
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) throw new Error('Ошибка загрузки компьютеров');
    
    computers = await response.json();
    renderGrid(branchId, width, height);
    
  } catch (error) {
    console.error('Ошибка:', error);
    computers = [];
    renderGrid(branchId, width, height);
  }
}

function renderGrid(branchId, width, height) {
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${width}, 60px)`;

  const pcMap = {};
  computers.forEach(pc => {
    pcMap[`${pc.x},${pc.y}`] = pc;
  });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const div = document.createElement('div');
      const pc = pcMap[`${x},${y}`];
      
      if (pc) {
        div.className = 'computer-cell';
        
        let statusClass = '';
        switch(pc.status) {
          case 'AVAILABLE':
            statusClass = 'lDefault';
            if (pc.priceLevel) {
              div.classList.add(`l${pc.priceLevel}`);
            }
            break;
          case 'OCCUPIED':
            statusClass = 'lBusy';
            break;
          case 'OUT_OF_SERVICE':
            statusClass = 'lEmpty';
            break;
          default:
            statusClass = 'lDefault';
        }
        
        div.classList.add(statusClass);
        
        const endTime = pc.endTime ? new Date(pc.endTime).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }) : '';
        
        div.innerHTML = `
          <div class="cell-number">ПК ${pc.id}</div>
          <div class="cell-time">${pc.status === 'OCCUPIED' ? endTime : ''}</div>
          ${pc.status === 'AVAILABLE' ? `<div class="cell-price">${getPriceByLevel(pc.priceLevel)} ₽/час</div>` : ''}
        `;
        
        div.onclick = () => handlePcClick(pc.id);
      } else {
        div.className = 'computer-cell lEmpty';
        div.textContent = '-';
      }
      
      grid.appendChild(div);
    }
  }
}

function getPriceByLevel(priceLevel) {
  switch (priceLevel) {
    case 'VIP': return 500;
    case 'EXTRA': return 300;
    case 'STANDARD': return 200;
    default: return 150;
  }
}

function handlePcClick(pcId) {
  if (selectedPcId === pcId) {
    pcDetails.classList.remove('active');
    selectedPcId = null;
    return;
  }
  
  selectedPcId = pcId;
  loadPcDetails(pcId);
}

async function loadPcDetails(pcId) {
  try {
    const response = await fetch(`http://5.129.207.193:8080/branches/${currentBranchId}/pcs/${pcId}`, {
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) throw new Error('Ошибка загрузки данных ПК');
    
    const details = await response.json();
    renderPcDetails(details);
    
  } catch (error) {
    console.error('Ошибка:', error);
    pcDetails.innerHTML = '<p>Ошибка загрузки данных компьютера</p>';
    pcDetails.classList.add('active');
  }
}

function renderPcDetails(details) {
  const endTime = details.endTime ? new Date(details.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
  const isAvailable = details.status === 'AVAILABLE';
  const price = getPriceByLevel(details.priceLevel);

  let html = `
    <h3>ПК ${details.id} - Характеристики</h3>
    <div class="pc-specs">
      <div class="pc-spec-item">
        <span class="pc-spec-label">Процессор</span>
        <span class="pc-spec-value">${details.processor}</span>
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Видеокарта</span>
        <span class="pc-spec-value">${details.gpu}</span>
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Материнская плата</span>
        <span class="pc-spec-value">${details.motherboard}</span>
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Оперативная память</span>
        <span class="pc-spec-value">${details.ram}</span>
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Накопитель</span>
        <span class="pc-spec-value">${details.disk}</span>
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Доступные игры</span>
        <span class="pc-spec-value">${details.gamesInstalled}</span>
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Монитор</span>
        <span class="pc-spec-value">${details.monitorHz}Hz</span>
      </div>
    </div>
  `;

  if (isAvailable) {
    html += `<button class="book-button active">Забронировать (${price} ₽/час)</button>`;
  } else if (details.status === 'OCCUPIED' && endTime) {
    html += `<button class="book-button inactive" disabled>
              Занят до ${endTime}
            </button>`;
  } else {
    html += `<button class="book-button inactive" disabled>
              Недоступен для бронирования
            </button>`;
  }

  pcDetails.innerHTML = html;
  pcDetails.classList.add('active');

  const bookButton = pcDetails.querySelector('.book-button.active');
  if (bookButton) {
    bookButton.onclick = () => {
      window.location.href = `http://127.0.0.1:3000/bookingDetails/BookingDetails.html?pcId=${details.id}&price=${price}`;
    };
  }
}

loadBranches();