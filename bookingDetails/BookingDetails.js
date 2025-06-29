document.addEventListener('DOMContentLoaded', function() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        window.location.href = '/login/Login.html';
        alert("Пожалуйста, авторизуйтесь для бронирования");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const pcId = urlParams.get('pcId');
    const pcPrice = parseInt(urlParams.get('price')) || 100;
    
    if (!pcId) {
        alert("Не указан компьютер для бронирования");
        window.location.href = '/index.html';
        return;
    }

    const stepDate = document.getElementById('step-date');
    const stepTime = document.getElementById('step-time');
    const stepPromo = document.getElementById('step-promo');
    const stepPayment = document.getElementById('step-payment');
    const stepConfirm = document.getElementById('step-confirm');
    
    const dateInput = document.getElementById('booking-date');
    const checkDateBtn = document.getElementById('check-date-btn');
    const availableSlots = document.getElementById('available-slots');
    const startTimeSelect = document.getElementById('start-time');
    const endTimeSelect = document.getElementById('end-time');
    const timeSlider = document.getElementById('time-slider');
    const confirmTimeBtn = document.getElementById('confirm-time-btn');
    const promotionsList = document.getElementById('promotions-list');
    const confirmPromoBtn = document.getElementById('confirm-promo-btn');
    const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
    const finalConfirmBtn = document.getElementById('final-confirm-btn');
    
    const basePriceEl = document.getElementById('base-price');
    const discountValueEl = document.getElementById('discount-value');
    const finalPriceEl = document.getElementById('final-price');
    
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    dateInput.min = `${yyyy}-${mm}-${dd}`;
    
    let selectedDate = null;
    let selectedStartTime = null;
    let selectedEndTime = null;
    let selectedPromotion = null;
    let paymentMethod = "QR_ONLINE";
    let bookings = [];
    let promotions = [];
    
    initTimeSlider();
    
    checkDateBtn.addEventListener('click', checkDateAvailability);
    confirmTimeBtn.addEventListener('click', confirmTimeSelection);
    confirmPromoBtn.addEventListener('click', confirmPromoSelection);
    confirmPaymentBtn.addEventListener('click', confirmPaymentSelection);
    finalConfirmBtn.addEventListener('click', finalConfirmBooking);
    
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', function() {
            paymentMethod = this.dataset.method;
            document.querySelectorAll('.payment-method').forEach(m => {
                m.querySelector('label').classList.remove('selected');
            });
            this.querySelector('label').classList.add('selected');
        });
    });
    
    
    function checkDateAvailability() {
        const date = dateInput.value;
        if (!date) {
            alert('Пожалуйста, выберите дату');
            return;
        }
        
        selectedDate = date;
        
        availableSlots.innerHTML = '<div class="loading-slot">Загрузка доступных слотов...</div>';
        
        fetch(`http://5.129.207.193:8080/bookings/${pcId}/bookings-by-day?date=${date}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })
        .then(response => response.json())
        .then(data => {
            bookings = data;
            renderAvailableSlots();
            stepDate.classList.remove('active');
            stepTime.classList.add('active');
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Ошибка при загрузке данных о бронированиях');
        });
    }

    function renderAvailableSlots() {
        availableSlots.innerHTML = '';
        startTimeSelect.innerHTML = '<option value="">Выберите время начала</option>';
        endTimeSelect.innerHTML = '<option value="">Выберите время окончания</option>';
        
        const allSlots = [];
        for (let hour = 0; hour <= 24; hour++) {
            const time = `${hour.toString().padStart(2, '0')}:00`;
            allSlots.push({
                time: time,
                hour: hour,
                booked: isTimeBooked(hour)
            });
        }
        
        allSlots.forEach(slot => {
            const slotElement = document.createElement('div');
            slotElement.className = `time-slot ${slot.booked ? 'booked' : ''}`;
            slotElement.textContent = slot.time;
            slotElement.dataset.hour = slot.hour;
            
            if (!slot.booked) {
                slotElement.addEventListener('click', () => selectStartTime(slot.hour));
            }
            
            availableSlots.appendChild(slotElement);
            
            if (!slot.booked) {
                const option = document.createElement('option');
                option.value = slot.hour;
                option.textContent = slot.time;
                startTimeSelect.appendChild(option);
            }
        });
        
        startTimeSelect.addEventListener('change', updateEndTimeOptions);
    }

    function isTimeBooked(hour) {
        if (hour === 24) hour = 23;
        
        const slotStart = new Date(`${selectedDate}T${hour.toString().padStart(2, '0')}:00:00`);
        const slotEnd = new Date(`${selectedDate}T${(hour + 1).toString().padStart(2, '0')}:00:00`);
        
        return bookings.some(booking => {
            const bookingStart = new Date(booking.start_date);
            const bookingEnd = new Date(booking.end_date);
            
            return (slotStart >= bookingStart && slotStart < bookingEnd) || 
                   (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
                   (slotStart <= bookingStart && slotEnd >= bookingEnd);
        });
    }
    
    function selectStartTime(hour) {
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
        
        const selectedSlot = document.querySelector(`.time-slot[data-hour="${hour}"]`);
        if (selectedSlot) selectedSlot.classList.add('selected');
        
        startTimeSelect.value = hour;
        updateEndTimeOptions();
    }
    
   function updateSliderVisuals(startHour, maxHours) {
        const percentage = (timeSlider.value / timeSlider.max) * 100;
        timeSlider.style.setProperty('--background-size', `${percentage}%`);
    }

    function initTimeSlider() {
        timeSlider.min = 0;
        timeSlider.max = 24;
        timeSlider.value = 0;
        timeSlider.disabled = true;
        
        timeSlider.addEventListener('input', updateEndTimeBySlider);
    }

    function updateEndTimeOptions() {
        const startHour = parseInt(startTimeSelect.value);
        if (isNaN(startHour)) {
            timeSlider.disabled = true;
            confirmTimeBtn.disabled = true;
            return;
        }
        
        endTimeSelect.innerHTML = '<option value="">Выберите время окончания</option>';
        
        const maxEndHour = 24;
        let maxAvailableHours = 0;
        
        for (let hour = startHour + 1; hour <= maxEndHour; hour++) {
            if (isTimeBooked(hour)) break;
            
            const time = `${hour.toString().padStart(2, '0')}:00`;
            const option = document.createElement('option');
            option.value = hour;
            option.textContent = time;
            endTimeSelect.appendChild(option);
            
            maxAvailableHours = hour - startHour;
        }
        
        timeSlider.min = 1;
        timeSlider.max = maxAvailableHours;
        timeSlider.value = 1;
        timeSlider.disabled = maxAvailableHours === 0;
        
        updateEndTimeBySlider();
        confirmTimeBtn.disabled = maxAvailableHours === 0;
    }
    
    function updateEndTimeBySlider() {
        const startHour = parseInt(startTimeSelect.value);
        if (isNaN(startHour)) return;
        
        const hoursToAdd = parseInt(timeSlider.value);
        const endHour = startHour + hoursToAdd;
        
        if (endHour > 24 || isTimeBooked(endHour)) {
            return;
        }
        
        endTimeSelect.value = endHour;
        updateSliderVisuals(startHour, timeSlider.max);
    }
    
    function confirmTimeSelection() {
        selectedStartTime = parseInt(startTimeSelect.value);
        selectedEndTime = parseInt(endTimeSelect.value);
        
        if (isNaN(selectedStartTime) || isNaN(selectedEndTime)) {
            alert('Пожалуйста, выберите время');
            return;
        }
        
        if (selectedEndTime <= selectedStartTime) {
            alert('Время окончания должно быть позже времени начала');
            return;
        }
        
        loadPromotions();
    }
    
    function loadPromotions() {
        fetch('http://5.129.207.193:8080/promotions', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })
        .then(response => response.json())
        .then(data => {
            promotions = data.items;
            renderPromotions();
            stepTime.classList.remove('active');
            stepPromo.classList.add('active');
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Ошибка при загрузке акций');
        });
    }

    function renderPromotions() {
        promotionsList.innerHTML = '';
        
        if (!promotions || promotions.length === 0) {
            promotionsList.innerHTML = '<p>Нет доступных акций</p>';
            confirmPromoBtn.textContent = 'Продолжить без скидки';
            updatePriceDisplay(null);
            return;
        }
        
        const bookingDate = new Date(selectedDate);
        bookingDate.setHours(0, 0, 0, 0);
        
        const applicablePromotions = promotions.filter(promo => {
            const promoStart = new Date(promo.startDate);
            const promoEnd = new Date(promo.endDate);
            
            promoStart.setHours(0, 0, 0, 0);
            promoEnd.setHours(23, 59, 59, 999);
            
            return bookingDate >= promoStart && bookingDate <= promoEnd;
        });
        
        if (applicablePromotions.length === 0) {
            promotionsList.innerHTML = '<p>Нет доступных акций для выбранной даты</p>';
            confirmPromoBtn.textContent = 'Продолжить без скидки';
        } else {
            applicablePromotions.forEach(promo => {
                const promoEl = document.createElement('div');
                promoEl.className = 'promotion-item';
                promoEl.dataset.id = promo.id;
                
                promoEl.innerHTML = `
                    <h3>${promo.type === 'PERCENT' ? `Скидка ${promo.promotionValue}%` : `Скидка ${promo.promotionValue} руб.`}</h3>
                    <p>${promo.description}</p>
                    <small>Акция действует с ${formatDate(promo.startDate)} по ${formatDate(promo.endDate)}</small>
                `;
                
                promoEl.addEventListener('click', () => selectPromotion(promo));
                promotionsList.appendChild(promoEl);
            });
            
            confirmPromoBtn.textContent = 'Продолжить без скидки';
        }
        
        updatePriceDisplay(null);
    }
    
    function selectPromotion(promo) {
        selectedPromotion = promo;
        
        document.querySelectorAll('.promotion-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        document.querySelector(`.promotion-item[data-id="${promo.id}"]`).classList.add('selected');
        
        updatePriceDisplay(promo);
    }
    
    function updatePriceDisplay(promo) {
        const hours = selectedEndTime - selectedStartTime;
        const basePrice = hours * pcPrice;
        
        let discount = 0;
        let finalPrice = basePrice;
        
        if (promo) {
            if (promo.type === 'PERCENT') {
                discount = basePrice * promo.promotionValue / 100;
            } else if (promo.type === 'FIXED_AMOUNT') {
                discount = promo.promotionValue;
            }
            finalPrice = basePrice - discount;
        }
        
        basePriceEl.textContent = `${basePrice} руб.`;
        
        if (discount > 0) {
            discountValueEl.textContent = promo.type === 'PERCENT' 
                ? `${promo.promotionValue}% (${discount} руб.)` 
                : `${discount} руб.`;
            finalPriceEl.innerHTML = `<span class="old-price">${basePrice} руб.</span> ${finalPrice} руб.`;
        } else {
            discountValueEl.textContent = '0 руб.';
            finalPriceEl.textContent = `${finalPrice} руб.`;
        }
    }
    
    function confirmPromoSelection() {
        stepPromo.classList.remove('active');
        stepPayment.classList.add('active');
    }
    
    function confirmPaymentSelection() {
        stepPayment.classList.remove('active');
        stepConfirm.classList.add('active');
        
        document.getElementById('summary-pc').textContent = `ПК ${pcId.replace('pc', '')}`;
        document.getElementById('summary-date').textContent = formatDate(selectedDate);
        document.getElementById('summary-time').textContent = 
            `${selectedStartTime.toString().padStart(2, '0')}:00 - ${selectedEndTime.toString().padStart(2, '0')}:00`;
        
        const hours = selectedEndTime - selectedStartTime;
        const basePrice = hours * pcPrice;
        let finalPrice = basePrice;
        
        if (selectedPromotion) {
            if (selectedPromotion.type === 'PERCENT') {
                finalPrice = basePrice - (basePrice * selectedPromotion.promotionValue / 100);
            } else if (selectedPromotion.type === 'FIXED_AMOUNT') {
                finalPrice = basePrice - selectedPromotion.promotionValue;
            }
        }
        
        document.getElementById('summary-price').textContent = `${finalPrice} руб.`;
        document.getElementById('summary-payment').textContent = 
            paymentMethod === 'QR_ONLINE' ? 'Онлайн' : 'Офлайн';
    }
    
    function finalConfirmBooking() {
        fetch('http://5.129.207.193:8080/auth/profile', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })
        .then(response => response.json())
        .then(profile => {
            createBooking(profile);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Ошибка при загрузке профиля');
        });
    }
    
    function createBooking(profile) {
        const hours = selectedEndTime - selectedStartTime;
        const basePrice = hours * pcPrice;
        let finalPrice = basePrice;
        
        if (selectedPromotion) {
            if (selectedPromotion.type === 'PERCENT') {
                finalPrice = basePrice - (basePrice * selectedPromotion.promotionValue / 100);
            } else if (selectedPromotion.type === 'FIXED_AMOUNT') {
                finalPrice = basePrice - selectedPromotion.promotionValue;
            }
        }
        
        const bookingData = {
            id: "booking-" + Math.random().toString(36).substr(2, 9),
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone,
            email: profile.email,
            pcId: pcId,
            startTime: `${selectedDate}T${selectedStartTime.toString().padStart(2, '0')}:00:00.000Z`,
            endTime: `${selectedDate}T${selectedEndTime.toString().padStart(2, '0')}:00:00.000Z`,
            paymentMethod: paymentMethod,
            finalPrice: finalPrice.toString()
        };
        
        fetch('http://5.129.207.193:8080/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(bookingData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка сервера');
            }
            return response.json();
        })
        .then(data => {
            alert('Бронирование успешно создано!');
            window.location.href = '../profile/Profile.html';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Ошибка при создании бронирования: ' + error.message);
        });
    }
    
    function formatDate(dateString) {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }
});