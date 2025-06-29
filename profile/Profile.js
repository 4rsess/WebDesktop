let authToken = localStorage.getItem('authToken');
let profileData = {};
let bookingsData = [];
let branchesData = [];

if (!authToken) {
  window.location.href = '/login/Login.html';
}

async function loadProfileData() {
  try {
    const response = await fetch('http://5.129.207.193:8080/auth/profile', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!response.ok) throw new Error('Ошибка загрузки профиля');
    profileData = await response.json();
    renderProfileInfo();
    return profileData;
  } catch (error) {
    console.error('Ошибка:', error);
    window.location.href = '/login/Login.html';
  }
}

async function loadBookingsData() {
  try {
    const response = await fetch(`http://5.129.207.193:8080/bookings/user?email=${profileData.email}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!response.ok) throw new Error('Ошибка загрузки бронирований');
    bookingsData = await response.json();
    await loadBranchesData();
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

async function loadBranchesData() {
  try {
    const response = await fetch('http://5.129.207.193:8080/branches', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!response.ok) throw new Error('Ошибка загрузки филиалов');
    branchesData = await response.json();
    renderBookingsTable();
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

function findBranchByPcId(pcId) {
  return branchesData.find(branch => 
    branch.places?.some(place => place.hasPc && place.pcId === Number(pcId))
  );
}

async function renderBookingsTable() {
  const bookingsTable = document.getElementById('bookings-table');
  let rowsHtml = '';

  bookingsData.forEach((booking, index) => {
    const startDate = new Date(booking.startTime);
    const endDate = new Date(booking.endTime);
    const dateStr = startDate.toLocaleDateString('ru-RU');
    const timeStr = `${startDate.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})} - ${endDate.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}`;
    
    const branchInfo = findBranchByPcId(booking.pcId);
    const branchName = branchInfo?.name || 'Неизвестный филиал';
    
    const status = booking.paymentMethod === 'QR_ONLINE' ? 'Оплачено' : 'Необходимо оплатить';
    const qrId = booking.paymentMethod === 'QR_ONLINE' ? `qr-confirm-${index}` : `qr-pay-${index}`;
    
    rowsHtml += `
      <tr class="booking-row" onclick="toggleBookingDetails(${index})">
        <td>${dateStr}<br>${timeStr}</td>
        <td>${branchName}</td>
        <td>${status}</td>
      </tr>
      <tr class="booking-details" id="booking-details-${index}">
        <td colspan="3">
          <div>
            <p><strong>Имя:</strong> ${booking.firstName} ${booking.lastName}</p>
            <p><strong>Телефон:</strong> ${booking.phone}</p>
            <p><strong>Email:</strong> ${booking.email}</p>
            <p><strong>Сумма:</strong> ${booking.finalPrice}</p>
            ${booking.paymentMethod === 'QR_OFFLINE' ? `
              <div class="qr-container">
                <p>QR-код для оплаты:</p>
                <img id="qr-pay-${index}" class="qr-code" alt="QR-код для оплаты">
              </div>
            ` : `
              <div class="qr-container">
                <p>QR-код подтверждения:</p>
                <img id="qr-confirm-${index}" class="qr-code" alt="QR-код подтверждения">
              </div>
            `}
            <button class="cancel-btn" onclick="cancelBooking('${booking.id}', event)">Отменить бронь</button>
          </div>
        </td>
      </tr>
    `;
  });

  bookingsTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Дата и время</th>
          <th>Адрес</th>
          <th>Статус</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  bookingsData.forEach((booking, index) => {
    if (booking.paymentMethod === 'QR_ONLINE' && booking.qrConfirmationId) {
      loadQRCode(booking.qrConfirmationId, `qr-confirm-${index}`);
    } else if (booking.paymentMethod === 'QR_OFFLINE' && booking.qrPaymentId) {
      loadQRCode(booking.qrPaymentId, `qr-pay-${index}`);
    }
  });
}

function loadQRCode(id, elementId) {
  fetch(`http://5.129.207.193:8080/files/${id}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  })
  .then(response => {
    if (!response.ok) throw new Error('Ошибка загрузки QR-кода');
    return response.blob();
  })
  .then(blob => {
    const url = URL.createObjectURL(blob);
    document.getElementById(elementId).src = url;
  })
  .catch(error => {
    console.error('Ошибка:', error);
    document.getElementById(elementId).src = '../pictures/default-qr.svg';
  });
}

function renderProfileInfo() {
  const profileInfo = document.getElementById('profile-info');
  profileInfo.innerHTML = `
    <p><strong>Имя пользователя:</strong> ${profileData.username}</p>
    <p><strong>Имя:</strong> ${profileData.firstName}</p>
    <p><strong>Фамилия:</strong> ${profileData.lastName}</p>
    <p><strong>Email:</strong> ${profileData.email}</p>
    <p><strong>Birthday:</strong> ${profileData.birthday}</p>
    <p><strong>Телефон:</strong> ${profileData.phone}</p>
  `;
}

function toggleBookingDetails(index) {
  const details = document.getElementById(`booking-details-${index}`);
  details.classList.toggle('active');
}

async function cancelBooking(bookingId, event) {
  event.stopPropagation();
  
  if (!confirm('Вы уверены, что хотите отменить бронирование?')) {
    return;
  }

  try {
    const response = await fetch(`http://5.129.207.193:8080/bookings/${bookingId}/cancel`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!response.ok) throw new Error('Ошибка отмены бронирования');
    await loadBookingsData();
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Не удалось отменить бронирование');
  }
}

document.getElementById('edit-profile-btn').addEventListener('click', () => {
  document.getElementById('profile-info').style.display = 'none';
  document.getElementById('edit-profile-form').style.display = 'block';
  
  document.getElementById('username').value = profileData.username;
  document.getElementById('first-name').value = profileData.firstName;
  document.getElementById('last-name').value = profileData.lastName;
  document.getElementById('email').value = profileData.email;
  document.getElementById('birthday').value = profileData.birthday;
  document.getElementById('phone').value = profileData.phone;
});

document.getElementById('cancel-edit-btn').addEventListener('click', () => {
  document.getElementById('profile-info').style.display = 'block';
  document.getElementById('edit-profile-form').style.display = 'none';
});

document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const updatedData = {
    firstName: document.getElementById('first-name').value,
    lastName: document.getElementById('last-name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    username: document.getElementById('username').value,
    birthday: document.getElementById('birthday').value
  };

  try {
    const response = await fetch('http://5.129.207.193:8080/auth/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
    });
    if (!response.ok) throw new Error('Ошибка обновления профиля');
    location.reload();
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Не удалось обновить профиль');
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  await loadProfileData();
  await loadBookingsData();
});