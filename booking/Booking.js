const branchSelector = document.querySelector('.branch-selector');
const selectedBranch = document.getElementById('selected-branch');
const branchOptions = document.getElementById('branch-options');
const grid = document.getElementById('computer-grid');
const bookingsContainer = document.getElementById('bookings-table');
const pcDetails = document.getElementById('pc-details');
let currentBranchId = null;
let selectedPcId = null;
let computers = [];
let selectedX = null;
let selectedY = null;
let authToken = localStorage.getItem('authToken');

document.getElementById('logout-link').addEventListener('click', function (event) {
    event.preventDefault();
    localStorage.clear();
    window.location.href = '../login/Login.html'; 
  });

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
    loadBookings();
    
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
            statusClass = 'lBooked';
            break;
          case 'OUT_OF_SERVICE':
            statusClass = 'lBusy';
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
        div.innerHTML = '<div class="cell-add">+</div>';
        div.onclick = () => handleEmptyCellClick(x, y);
      }
      
      grid.appendChild(div);
    }
  }
}

function getPriceByLevel(priceLevel) {
  switch (priceLevel) {
    case 'VIP': return 500;
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

function handleEmptyCellClick(x, y) {
  selectedX = x;
  selectedY = y;
  renderAddPcForm();
}

function renderAddPcForm() {
  pcDetails.innerHTML = `
    <h3>Добавить новый ПК</h3>
    <div class="pc-specs">
      <div class="pc-spec-item">
        <span class="pc-spec-label">ID ПК</span>
        <input type="number" id="pc-id" class="pc-spec-input" placeholder="Введите ID">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Процессор</span>
        <input type="text" id="pc-processor" class="pc-spec-input" placeholder="Введите процессор">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Видеокарта</span>
        <input type="text" id="pc-gpu" class="pc-spec-input" placeholder="Введите видеокарту">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Материнская плата</span>
        <input type="text" id="pc-motherboard" class="pc-spec-input" placeholder="Введите материнскую плату">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Оперативная память</span>
        <input type="text" id="pc-ram" class="pc-spec-input" placeholder="Введите оперативную память">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Накопитель</span>
        <input type="text" id="pc-disk" class="pc-spec-input" placeholder="Введите накопитель">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Доступные игры</span>
        <input type="text" id="pc-games" class="pc-spec-input" placeholder="Введите доступные игры">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Монитор (Hz)</span>
        <input type="number" id="pc-monitor" class="pc-spec-input" placeholder="Введите частоту монитора">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Статус</span>
        <select id="pc-status" class="pc-spec-select">
          <option value="AVAILABLE">Доступен</option>
          <option value="OCCUPIED">Занят</option>
          <option value="OUT_OF_SERVICE">Не обслуживается</option>
        </select>
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Уровень цены</span>
        <select id="pc-price-level" class="pc-spec-select">
          <option value="DEFAULT">Обычный (150 ₽/час)</option>
          <option value="VIP">VIP (500 ₽/час)</option>
        </select>
      </div>
    </div>
    <button id="add-pc-button" class="book-button inactive" disabled>Добавить ПК</button>
  `;

  const inputs = pcDetails.querySelectorAll('.pc-spec-input');
  inputs.forEach(input => {
    input.addEventListener('input', checkFormCompletion);
  });

  pcDetails.classList.add('active');
}

function checkFormCompletion() {
  const id = document.getElementById('pc-id').value;
  const processor = document.getElementById('pc-processor').value;
  const gpu = document.getElementById('pc-gpu').value;
  const motherboard = document.getElementById('pc-motherboard').value;
  const ram = document.getElementById('pc-ram').value;
  const disk = document.getElementById('pc-disk').value;
  const games = document.getElementById('pc-games').value;
  const monitor = document.getElementById('pc-monitor').value;

  const addButton = document.getElementById('add-pc-button');
  
  if (id && processor && gpu && motherboard && ram && disk && games && monitor) {
    addButton.classList.remove('inactive');
    addButton.classList.add('active');
    addButton.disabled = false;
    addButton.onclick = addNewPc;
  } else {
    addButton.classList.add('inactive');
    addButton.classList.remove('active');
    addButton.disabled = true;
  }
}

async function addNewPc() {
  const id = document.getElementById('pc-id').value;
  const processor = document.getElementById('pc-processor').value;
  const gpu = document.getElementById('pc-gpu').value;
  const motherboard = document.getElementById('pc-motherboard').value;
  const ram = document.getElementById('pc-ram').value;
  const disk = document.getElementById('pc-disk').value;
  const games = document.getElementById('pc-games').value;
  const monitor = document.getElementById('pc-monitor').value;
  const status = document.getElementById('pc-status').value;
  const priceLevel = document.getElementById('pc-price-level').value;

  if (!confirm('Вы уверены, что хотите добавить этот ПК?')) return;

  const pcData = {
    id: parseInt(id),
    processor,
    gpu,
    motherboard,
    ram,
    disk,
    gamesInstalled: games,
    monitorHz: parseInt(monitor),
    status,
    branchId: currentBranchId,
    x: selectedX,
    y: selectedY,
    priceLevel,
    endTime: null
  };

  try {
    const response = await fetch('http://5.129.207.193:8080/admin/pcs', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(pcData)
    });

    if (!response.ok) throw new Error('Ошибка при добавлении ПК');

    alert('ПК успешно добавлен');
    loadBranchComputers(currentBranchId, grid.style.gridTemplateColumns.split(' ').length, grid.children.length / grid.style.gridTemplateColumns.split(' ').length);
    pcDetails.classList.remove('active');
    location.reload();
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка при добавлении ПК');
  }
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
    renderPcDetailsAdmin(details);
    
  } catch (error) {
    console.error('Ошибка:', error);
    pcDetails.innerHTML = '<p>Ошибка загрузки данных компьютера</p>';
    pcDetails.classList.add('active');
  }
}

function renderPcDetailsAdmin(details) {
  pcDetails.innerHTML = `
    <h3>ПК ${details.id} - Редактирование</h3>
    <div class="pc-specs">
      <div class="pc-spec-item">
        <span class="pc-spec-label">ID ПК</span>
        <input type="text" id="pc-id" class="pc-spec-input" value="${details.id}" readonly>
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">ID филиала</span>
        <input type="text" id="pc-branch-id" class="pc-spec-input" value="${details.branchId}" readonly>
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Позиция X</span>
        <input type="text" id="pc-x" class="pc-spec-input" value="${details.x}" readonly>
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Позиция Y</span>
        <input type="text" id="pc-y" class="pc-spec-input" value="${details.y}" readonly>
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Процессор</span>
        <input type="text" id="pc-processor" class="pc-spec-input" value="${details.processor}">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Видеокарта</span>
        <input type="text" id="pc-gpu" class="pc-spec-input" value="${details.gpu}">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Материнская плата</span>
        <input type="text" id="pc-motherboard" class="pc-spec-input" value="${details.motherboard}">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Оперативная память</span>
        <input type="text" id="pc-ram" class="pc-spec-input" value="${details.ram}">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Накопитель</span>
        <input type="text" id="pc-disk" class="pc-spec-input" value="${details.disk}">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Доступные игры</span>
        <input type="text" id="pc-games" class="pc-spec-input" value="${details.gamesInstalled}">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Монитор (Hz)</span>
        <input type="number" id="pc-monitor" class="pc-spec-input" value="${details.monitorHz}">
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Статус</span>
        <select id="pc-status" class="pc-spec-select">
          <option value="AVAILABLE" ${details.status === 'AVAILABLE' ? 'selected' : ''}>Доступен</option>
          <option value="OCCUPIED" ${details.status === 'OCCUPIED' ? 'selected' : ''}>Занят</option>
          <option value="OUT_OF_SERVICE" ${details.status === 'OUT_OF_SERVICE' ? 'selected' : ''}>Не обслуживается</option>
        </select>
      </div>
      <div class="pc-spec-item">
        <span class="pc-spec-label">Уровень цены</span>
        <select id="pc-price-level" class="pc-spec-select">
          <option value="DEFAULT" ${details.priceLevel === 'DEFAULT' ? 'selected' : ''}>Обычный (150 ₽/час)</option>
          <option value="VIP" ${details.priceLevel === 'VIP' ? 'selected' : ''}>VIP (500 ₽/час)</option>
        </select>
      </div>
    </div>
    <div class="admin-buttons">
      <button id="edit-pc-button" class="edit-button">Редактировать ПК</button>
      <button id="delete-pc-button" class="delete-button">Удалить ПК</button>
    </div>
  `;

  pcDetails.classList.add('active');

  document.getElementById('edit-pc-button').onclick = () => updatePc(details.id);
  document.getElementById('delete-pc-button').onclick = () => deletePc(details.id);
}

async function updatePc(pcId) {
  const processor = document.getElementById('pc-processor').value;
  const gpu = document.getElementById('pc-gpu').value;
  const motherboard = document.getElementById('pc-motherboard').value;
  const ram = document.getElementById('pc-ram').value;
  const disk = document.getElementById('pc-disk').value;
  const games = document.getElementById('pc-games').value;
  const monitor = document.getElementById('pc-monitor').value;
  const status = document.getElementById('pc-status').value;
  const priceLevel = document.getElementById('pc-price-level').value;

  if (!confirm('Вы уверены, что хотите обновить данные этого ПК?')) return;

  const pcData = {
    processor,
    gpu,
    motherboard,
    ram,
    disk,
    gamesInstalled: games,
    monitorHz: parseInt(monitor),
    status,
    priceLevel
  };

  try {
    const response = await fetch(`http://5.129.207.193:8080/admin/pcs/${pcId}`, {
      method: 'PUT',
      headers: {
        'accept': '*/*',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(pcData)
    });

    if (!response.ok) throw new Error('Ошибка при обновлении ПК');

    alert('ПК успешно обновлен');
    loadBranchComputers(currentBranchId, grid.style.gridTemplateColumns.split(' ').length, grid.children.length / grid.style.gridTemplateColumns.split(' ').length);
    pcDetails.classList.remove('active');
    location.reload();
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка при обновлении ПК');
  }
}

async function deletePc(pcId) {
  if (!confirm('Вы уверены, что хотите удалить этот ПК?')) return;

  try {
    const response = await fetch(`http://5.129.207.193:8080/admin/pcs/${pcId}`, {
      method: 'DELETE',
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) throw new Error('Ошибка при удалении ПК');

    alert('ПК успешно удален');
    loadBranchComputers(currentBranchId, grid.style.gridTemplateColumns.split(' ').length, grid.children.length / grid.style.gridTemplateColumns.split(' ').length);
    pcDetails.classList.remove('active');
    location.reload();
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка при удалении ПК');
  }
}


async function loadBookings() {
  try {
    const response = await fetch('http://5.129.207.193:8080/bookings/all', {
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) throw new Error('Ошибка загрузки бронирований');
    
    const bookings = await response.json();
    renderBookingsTable(bookings);
    
  } catch (error) {
    console.error('Ошибка:', error);
    bookingsContainer.innerHTML = '<p>Ошибка загрузки данных бронирований</p>';
  }
}

function renderBookingsTable(bookings) {
  bookingsContainer.innerHTML = `
    <div class="bookings-container">
      <h3>Активные бронирования</h3>
      <div class="bookings-scroll">
        ${bookings.map(booking => `
          <div class="booking-card">
            <div class="booking-field">
              <span class="booking-label">ID брони:</span>
              <span class="booking-value">${booking.id}</span>
            </div>
            <div class="booking-field">
              <span class="booking-label">Имя:</span>
              <span class="booking-value">${booking.firstName}</span>
            </div>
            <div class="booking-field">
              <span class="booking-label">Фамилия:</span>
              <span class="booking-value">${booking.lastName}</span>
            </div>
            <div class="booking-field">
              <span class="booking-label">Телефон:</span>
              <span class="booking-value">${booking.phone}</span>
            </div>
            <div class="booking-field">
              <span class="booking-label">Email:</span>
              <span class="booking-value">${booking.email}</span>
            </div>
            <div class="booking-field">
              <span class="booking-label">ID ПК:</span>
              <span class="booking-value">${booking.pcId}</span>
            </div>
            <div class="booking-field">
              <span class="booking-label">Начало:</span>
              <span class="booking-value">${new Date(booking.startTime).toLocaleString()}</span>
            </div>
            <div class="booking-field">
              <span class="booking-label">Конец:</span>
              <span class="booking-value">${new Date(booking.endTime).toLocaleString()}</span>
            </div>
            <div class="booking-field">
              <span class="booking-label">Метод оплаты:</span>
              <span class="booking-value">${booking.paymentMethod === 'QR_ONLINE' ? 'QR онлайн' : booking.paymentMethod}</span>
            </div>
            <div class="booking-field">
              <span class="booking-label">Итоговая цена:</span>
              <span class="booking-value">${booking.finalPrice} ₽</span>
            </div>
            <div class="booking-field">
              <span class="booking-label">ID подтверждения QR:</span>
              <span class="booking-value">${booking.qrConfirmationId}</span>
            </div>
            <div class="booking-field">
              <span class="booking-label">ID платежа QR:</span>
              <span class="booking-value">${booking.qrPaymentId}</span>
            </div>
            <button class="cancel-booking-btn" data-booking-id="${booking.id}">Отменить бронь</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.querySelectorAll('.cancel-booking-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
      const bookingId = e.target.getAttribute('data-booking-id');
      const confirmCancel = confirm('Вы уверены, что хотите отменить бронирование?');
      
      if (confirmCancel) {
        try {
          const authToken = localStorage.getItem('authToken');
          const response = await fetch(`http://5.129.207.193:8080/bookings/${bookingId}/cancel`, {
            method: 'DELETE',
            headers: {
              'accept': '*/*',
              'Authorization': `Bearer ${authToken}`
            }
          });
          
          if (response.ok) {
            alert('Бронирование успешно отменено');
            loadBranches();
          } else {
            alert('Ошибка при отмене бронирования');
          }
        } catch (error) {
          console.error('Ошибка:', error);
          alert('Произошла ошибка при отмене бронирования');
        }
      }
    });
  });
}


loadBranches();