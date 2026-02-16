// ============================================
// UTILITY FUNCTIONS
// ============================================
const Utils = {
    formatDate(dateString) {
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    },

    formatPrice(price) {
        return `$${price.toFixed(2)}`;
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
};

// ============================================
// DATA MANAGEMENT MODULE
// ============================================
const DataManager = {
    init() {
        try {
            // Initialize storage if not exists
            if (!localStorage.getItem('rides')) {
                localStorage.setItem('rides', JSON.stringify([]));
            }
            if (!localStorage.getItem('users')) {
                localStorage.setItem('users', JSON.stringify([]));
            }
            if (!localStorage.getItem('currentUser')) {
                localStorage.setItem('currentUser', JSON.stringify(null));
            }
            return true;
        } catch (error) {
            console.error('Error initializing storage:', error);
            UIManager.showToast('Storage initialization failed', 'error');
            return false;
        }
    },

    getRides() {
        try {
            return JSON.parse(localStorage.getItem('rides') || '[]');
        } catch (error) {
            console.error('Error getting rides:', error);
            return [];
        }
    },

    setRides(rides) {
        try {
            localStorage.setItem('rides', JSON.stringify(rides));
            return true;
        } catch (error) {
            console.error('Error setting rides:', error);
            UIManager.showToast('Failed to save rides', 'error');
            return false;
        }
    },

    getUsers() {
        try {
            return JSON.parse(localStorage.getItem('users') || '[]');
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    },

    setUsers(users) {
        try {
            localStorage.setItem('users', JSON.stringify(users));
            return true;
        } catch (error) {
            console.error('Error setting users:', error);
            return false;
        }
    },

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('currentUser'));
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    },

    setCurrentUser(user) {
        try {
            localStorage.setItem('currentUser', JSON.stringify(user));
            return true;
        } catch (error) {
            console.error('Error setting current user:', error);
            return false;
        }
    }
};

// ============================================
// AUTHENTICATION MODULE
// ============================================
const AuthManager = {
    init() {
        this.updateUI();
        this.attachEventListeners();
    },

    attachEventListeners() {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        if (loginBtn) loginBtn.addEventListener('click', () => this.showAuthModal('login'));
        if (signupBtn) signupBtn.addEventListener('click', () => this.showAuthModal('signup'));
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
        if (loginForm) loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        if (signupForm) signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.signup();
        });

        // Auth tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                this.switchAuthTab(targetTab);
            });
        });
    },

    showAuthModal(tab = 'login') {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.add('active');
            this.switchAuthTab(tab);
        }
    },

    switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

        const tabBtn = document.querySelector(`[data-tab="${tab}"]`);
        const form = document.getElementById(`${tab}Form`);
        
        if (tabBtn) tabBtn.classList.add('active');
        if (form) form.classList.add('active');
    },

    login() {
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;

        if (!email || !password) {
            UIManager.showToast('Please fill in all fields', 'error');
            return;
        }

        if (!Utils.validateEmail(email)) {
            UIManager.showToast('Please enter a valid email', 'error');
            return;
        }

        const users = DataManager.getUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            DataManager.setCurrentUser(user);
            this.updateUI();
            closeModal('authModal');
            UIManager.showToast(`Welcome back, ${user.name}!`, 'success');
            RidesManager.loadRides();
            AnalyticsManager.updateAnalytics();
        } else {
            UIManager.showToast('Invalid email or password', 'error');
        }
    },

    signup() {
        const name = document.getElementById('signupName')?.value;
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;

        if (!name || !email || !password) {
            UIManager.showToast('Please fill in all fields', 'error');
            return;
        }

        if (name.length < 2) {
            UIManager.showToast('Name must be at least 2 characters', 'error');
            return;
        }

        if (!Utils.validateEmail(email)) {
            UIManager.showToast('Please enter a valid email', 'error');
            return;
        }

        if (password.length < 6) {
            UIManager.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        const users = DataManager.getUsers();
        
        if (users.find(u => u.email === email)) {
            UIManager.showToast('Email already registered', 'error');
            return;
        }

        const newUser = {
            id: Date.now().toString(),
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        DataManager.setUsers(users);
        DataManager.setCurrentUser(newUser);
        
        this.updateUI();
        closeModal('authModal');
        UIManager.showToast(`Account created! Welcome, ${newUser.name}!`, 'success');
        
        // Reset forms
        document.getElementById('signupForm')?.reset();
    },

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            DataManager.setCurrentUser(null);
            this.updateUI();
            UIManager.showToast('Logged out successfully', 'success');
            RidesManager.loadRides();
            AnalyticsManager.updateAnalytics();
            showView('booking');
        }
    },

    updateUI() {
        const user = DataManager.getCurrentUser();
        const authButtons = document.getElementById('authButtons');
        const userProfile = document.getElementById('userProfile');
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');

        if (user && authButtons && userProfile) {
            authButtons.style.display = 'none';
            userProfile.style.display = 'flex';
            if (userName) userName.textContent = user.name;
            if (userAvatar) userAvatar.textContent = user.name.charAt(0).toUpperCase();
        } else if (authButtons && userProfile) {
            authButtons.style.display = 'flex';
            userProfile.style.display = 'none';
        }
    },

    requireAuth() {
        const user = DataManager.getCurrentUser();
        if (!user) {
            UIManager.showToast('Please login to continue', 'error');
            this.showAuthModal('login');
            return false;
        }
        return true;
    }
};

// ============================================
// RIDES CRUD MODULE
// ============================================
const RidesManager = {
    currentFilters: {
        search: '',
        status: 'all',
        type: 'all',
        sortBy: 'dateDesc'
    },

    init() {
        this.attachEventListeners();
        this.loadRides();
        this.setDefaultDateTime();
    },

    attachEventListeners() {
        // Booking form
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createRide();
            });
        }

        // Ride type selection
        document.querySelectorAll('.ride-type-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.ride-type-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            });
        });

        // Search with debounce
        const searchInput = document.getElementById('searchRides');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.currentFilters.search = e.target.value;
                this.filterAndSortRides();
            }, 300));
        }

        // Filters
        const statusFilter = document.getElementById('statusFilter');
        const typeFilter = document.getElementById('typeFilter');
        const sortBy = document.getElementById('sortBy');

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.filterAndSortRides();
            });
        }

        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilters.type = e.target.value;
                this.filterAndSortRides();
            });
        }

        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.currentFilters.sortBy = e.target.value;
                this.filterAndSortRides();
            });
        }

        // Edit form
        const editForm = document.getElementById('editForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateRide();
            });
        }
    },

    createRide() {
        if (!AuthManager.requireAuth()) return;

        const pickup = document.getElementById('pickupLocation')?.value;
        const dropoff = document.getElementById('dropoffLocation')?.value;
        const dateTime = document.getElementById('rideDateTime')?.value;
        const passengers = document.getElementById('passengers')?.value;
        const selectedCard = document.querySelector('.ride-type-card.active');
        const selectedType = selectedCard?.dataset.type || 'comfort';
        const user = DataManager.getCurrentUser();

        if (!pickup || !dropoff || !dateTime || !passengers) {
            UIManager.showToast('Please fill in all fields', 'error');
            return;
        }

        // Validate date is not in the past
        const rideDate = new Date(dateTime);
        const now = new Date();
        if (rideDate < now) {
            UIManager.showToast('Ride date must be in the future', 'error');
            return;
        }

        UIManager.showLoading();

        setTimeout(() => {
            const ride = {
                id: Date.now().toString(),
                userId: user.id,
                pickup: pickup.trim(),
                dropoff: dropoff.trim(),
                dateTime,
                passengers: parseInt(passengers),
                type: selectedType,
                status: 'upcoming',
                price: this.calculatePrice(selectedType),
                driver: this.generateDriverInfo(),
                createdAt: new Date().toISOString(),
                vehicle: this.generateVehicleInfo(selectedType)
            };

            const rides = DataManager.getRides();
            rides.push(ride);
            DataManager.setRides(rides);

            UIManager.hideLoading();
            UIManager.showToast('Ride booked successfully! 🎉', 'success');
            
            document.getElementById('bookingForm')?.reset();
            this.setDefaultDateTime();
            
            // Switch to rides view
            showView('rides');
            
            // Simulate real-time update
            setTimeout(() => {
                UIManager.showToast('Your driver is being assigned...', 'info');
            }, 2000);
        }, 800); // Simulate API call
    },

    setDefaultDateTime() {
        const input = document.getElementById('rideDateTime');
        if (input) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset() + 30); // 30 minutes from now
            input.value = now.toISOString().slice(0, 16);
            input.min = new Date().toISOString().slice(0, 16);
        }
    },

    calculatePrice(type) {
        const basePrices = {
            economy: { min: 12, max: 15 },
            comfort: { min: 18, max: 22 },
            premium: { min: 30, max: 38 },
            xl: { min: 25, max: 32 }
        };
        const range = basePrices[type] || basePrices.comfort;
        return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    },

    generateDriverInfo() {
        const names = [
            'John Smith', 'Sarah Johnson', 'Michael Brown', 
            'Emily Davis', 'David Wilson', 'Jennifer Lee',
            'James Miller', 'Linda Martinez', 'Robert Anderson'
        ];
        const name = names[Math.floor(Math.random() * names.length)];
        const rating = (4.5 + Math.random() * 0.5).toFixed(1);
        return { name, rating };
    },

    generateVehicleInfo(type) {
        const vehicles = {
            economy: ['Toyota Corolla', 'Honda Civic', 'Hyundai Elantra', 'Nissan Sentra'],
            comfort: ['Toyota Camry', 'Honda Accord', 'Mazda 6', 'Subaru Legacy'],
            premium: ['Mercedes E-Class', 'BMW 5 Series', 'Audi A6', 'Lexus ES'],
            xl: ['Toyota Sienna', 'Honda Odyssey', 'Chrysler Pacifica', 'Ford Transit']
        };
        const models = vehicles[type] || vehicles.comfort;
        const model = models[Math.floor(Math.random() * models.length)];
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const plate = `${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
        return { model, plate };
    },

    loadRides() {
        const user = DataManager.getCurrentUser();
        const emptyState = document.getElementById('emptyState');
        const ridesList = document.getElementById('ridesList');
        
        if (!user) {
            if (ridesList) ridesList.innerHTML = '';
            if (emptyState) {
                emptyState.style.display = 'block';
                emptyState.querySelector('p').textContent = 'Please login to view your rides';
            }
            return;
        }

        this.filterAndSortRides();
    },

    filterAndSortRides() {
        const user = DataManager.getCurrentUser();
        if (!user) return;

        let rides = DataManager.getRides().filter(r => r.userId === user.id);

        // Apply filters
        if (this.currentFilters.search) {
            const search = this.currentFilters.search.toLowerCase();
            rides = rides.filter(r => 
                r.pickup.toLowerCase().includes(search) ||
                r.dropoff.toLowerCase().includes(search) ||
                r.driver.name.toLowerCase().includes(search) ||
                r.status.toLowerCase().includes(search) ||
                r.type.toLowerCase().includes(search)
            );
        }

        if (this.currentFilters.status !== 'all') {
            rides = rides.filter(r => r.status === this.currentFilters.status);
        }

        if (this.currentFilters.type !== 'all') {
            rides = rides.filter(r => r.type === this.currentFilters.type);
        }

        // Apply sorting
        rides.sort((a, b) => {
            switch (this.currentFilters.sortBy) {
                case 'dateDesc':
                    return new Date(b.dateTime) - new Date(a.dateTime);
                case 'dateAsc':
                    return new Date(a.dateTime) - new Date(b.dateTime);
                case 'priceDesc':
                    return b.price - a.price;
                case 'priceAsc':
                    return a.price - b.price;
                default:
                    return 0;
            }
        });

        this.renderRides(rides);
    },

    renderRides(rides) {
        const container = document.getElementById('ridesList');
        const emptyState = document.getElementById('emptyState');

        if (!container || !emptyState) return;

        if (rides.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            emptyState.querySelector('p').textContent = 'No rides found. Book your first ride to get started!';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = rides.map(ride => `
            <div class="ride-card" data-ride-id="${ride.id}">
                <div class="ride-header">
                    <div class="ride-info">
                        <h3>${ride.type.charAt(0).toUpperCase() + ride.type.slice(1)} Ride</h3>
                        <div class="ride-route">
                            <span>${ride.pickup}</span>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M7 14L13 8M13 8H7M13 8V14" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            <span>${ride.dropoff}</span>
                        </div>
                    </div>
                    <span class="status-badge status-${ride.status}">${ride.status}</span>
                </div>
                
                <div class="ride-meta">
                    <div class="meta-item">
                        <span class="meta-label">Date & Time</span>
                        <span class="meta-value">${Utils.formatDate(ride.dateTime)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Driver</span>
                        <span class="meta-value">${ride.driver.name} (⭐ ${ride.driver.rating})</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Vehicle</span>
                        <span class="meta-value">${ride.vehicle.model} - ${ride.vehicle.plate}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Passengers</span>
                        <span class="meta-value">${ride.passengers}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Price</span>
                        <span class="meta-value">${Utils.formatPrice(ride.price)}</span>
                    </div>
                </div>
                
                <div class="ride-actions">
                    ${ride.status === 'upcoming' ? `
                        <button class="btn btn-ghost btn-sm" onclick="RidesManager.editRide('${ride.id}')">
                            Edit
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="RidesManager.completeRide('${ride.id}')">
                            Complete
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="RidesManager.cancelRide('${ride.id}')">
                            Cancel
                        </button>
                    ` : ''}
                    <button class="btn btn-ghost btn-sm" onclick="RidesManager.deleteRide('${ride.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    },

    editRide(id) {
        const rides = DataManager.getRides();
        const ride = rides.find(r => r.id === id);
        
        if (!ride) {
            UIManager.showToast('Ride not found', 'error');
            return;
        }

        const editRideId = document.getElementById('editRideId');
        const editPickup = document.getElementById('editPickup');
        const editDropoff = document.getElementById('editDropoff');
        const editDateTime = document.getElementById('editDateTime');
        const editPassengers = document.getElementById('editPassengers');
        const editRideType = document.getElementById('editRideType');

        if (editRideId) editRideId.value = ride.id;
        if (editPickup) editPickup.value = ride.pickup;
        if (editDropoff) editDropoff.value = ride.dropoff;
        if (editDateTime) editDateTime.value = ride.dateTime;
        if (editPassengers) editPassengers.value = ride.passengers;
        if (editRideType) editRideType.value = ride.type;

        openModal('editModal');
    },

    updateRide() {
        const id = document.getElementById('editRideId')?.value;
        const rides = DataManager.getRides();
        const rideIndex = rides.findIndex(r => r.id === id);

        if (rideIndex === -1) {
            UIManager.showToast('Ride not found', 'error');
            return;
        }

        const pickup = document.getElementById('editPickup')?.value;
        const dropoff = document.getElementById('editDropoff')?.value;
        const dateTime = document.getElementById('editDateTime')?.value;
        const passengers = document.getElementById('editPassengers')?.value;
        const type = document.getElementById('editRideType')?.value;

        if (!pickup || !dropoff || !dateTime || !passengers || !type) {
            UIManager.showToast('Please fill in all fields', 'error');
            return;
        }

        rides[rideIndex] = {
            ...rides[rideIndex],
            pickup: pickup.trim(),
            dropoff: dropoff.trim(),
            dateTime,
            passengers: parseInt(passengers),
            type,
            price: this.calculatePrice(type)
        };

        DataManager.setRides(rides);
        closeModal('editModal');
        this.loadRides();
        UIManager.showToast('Ride updated successfully!', 'success');
    },

    completeRide(id) {
        if (confirm('Mark this ride as completed?')) {
            const rides = DataManager.getRides();
            const ride = rides.find(r => r.id === id);
            
            if (ride) {
                ride.status = 'completed';
                DataManager.setRides(rides);
                this.loadRides();
                AnalyticsManager.updateAnalytics();
                UIManager.showToast('Ride completed! 🎉', 'success');
            }
        }
    },

    cancelRide(id) {
        if (confirm('Are you sure you want to cancel this ride?')) {
            const rides = DataManager.getRides();
            const ride = rides.find(r => r.id === id);
            
            if (ride) {
                ride.status = 'cancelled';
                DataManager.setRides(rides);
                this.loadRides();
                AnalyticsManager.updateAnalytics();
                UIManager.showToast('Ride cancelled', 'error');
            }
        }
    },

    deleteRide(id) {
        if (confirm('Are you sure you want to delete this ride? This action cannot be undone.')) {
            let rides = DataManager.getRides();
            rides = rides.filter(r => r.id !== id);
            DataManager.setRides(rides);
            this.loadRides();
            AnalyticsManager.updateAnalytics();
            UIManager.showToast('Ride deleted', 'success');
        }
    }
};

// ============================================
// ANALYTICS MODULE
// ============================================
const AnalyticsManager = {
    charts: {},

    init() {
        this.attachEventListeners();
        this.updateAnalytics();
    },

    attachEventListeners() {
        const dateRange = document.getElementById('dateRange');
        if (dateRange) {
            dateRange.addEventListener('change', () => {
                this.updateAnalytics();
            });
        }
    },

    updateAnalytics() {
        const user = DataManager.getCurrentUser();
        if (!user) {
            this.clearAnalytics();
            return;
        }

        const dateRange = parseInt(document.getElementById('dateRange')?.value || 30);
        const rides = this.getFilteredRides(dateRange);

        this.updateStats(rides);
        this.updateCharts(rides);
        this.generateInsights(rides);
    },

    getFilteredRides(days) {
        const user = DataManager.getCurrentUser();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return DataManager.getRides().filter(r => 
            r.userId === user.id && 
            new Date(r.createdAt) >= cutoffDate
        );
    },

    updateStats(rides) {
        const totalRides = rides.length;
        const completedRides = rides.filter(r => r.status === 'completed');
        const totalSpent = completedRides.reduce((sum, r) => sum + r.price, 0);
        const avgCost = completedRides.length > 0 ? totalSpent / completedRides.length : 0;
        const completionRate = totalRides > 0 ? (completedRides.length / totalRides) * 100 : 0;

        // Update DOM
        const totalRidesEl = document.getElementById('totalRides');
        const totalSpentEl = document.getElementById('totalSpent');
        const avgCostEl = document.getElementById('avgCost');
        const completionRateEl = document.getElementById('completionRate');

        if (totalRidesEl) totalRidesEl.textContent = totalRides;
        if (totalSpentEl) totalSpentEl.textContent = Utils.formatPrice(totalSpent);
        if (avgCostEl) avgCostEl.textContent = Utils.formatPrice(avgCost);
        if (completionRateEl) completionRateEl.textContent = `${completionRate.toFixed(0)}%`;

        // Calculate trends (simulate)
        const ridesTrend = totalRides > 0 ? '+12%' : '-';
        const spentTrend = totalSpent > 0 ? '+8%' : '-';
        const completionTrend = completionRate > 0 ? '+5%' : '-';

        const ridesTrendEl = document.getElementById('ridesTrend');
        const spentTrendEl = document.getElementById('spentTrend');
        const completionTrendEl = document.getElementById('completionTrend');

        if (ridesTrendEl) ridesTrendEl.textContent = ridesTrend;
        if (spentTrendEl) spentTrendEl.textContent = spentTrend;
        if (completionTrendEl) completionTrendEl.textContent = completionTrend;
    },

    updateCharts(rides) {
        this.createRideTypeChart(rides);
        this.createSpendingChart(rides);
    },

    createRideTypeChart(rides) {
        const ctx = document.getElementById('rideTypeChart');
        if (!ctx) return;

        const typeCounts = rides.reduce((acc, ride) => {
            acc[ride.type] = (acc[ride.type] || 0) + 1;
            return acc;
        }, {});

        if (this.charts.rideType) {
            this.charts.rideType.destroy();
        }

        if (Object.keys(typeCounts).length === 0) {
            ctx.style.display = 'none';
            return;
        }

        ctx.style.display = 'block';

        this.charts.rideType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(typeCounts).map(t => t.charAt(0).toUpperCase() + t.slice(1)),
                datasets: [{
                    data: Object.values(typeCounts),
                    backgroundColor: ['#00E5B8', '#FF6B9D', '#FFD93D', '#6C9FFF'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#A8B3CF',
                            padding: 15,
                            font: { size: 12, family: 'Outfit' }
                        }
                    }
                }
            }
        });
    },

    createSpendingChart(rides) {
        const ctx = document.getElementById('spendingChart');
        if (!ctx) return;

        const completedRides = rides.filter(r => r.status === 'completed');
        
        if (completedRides.length === 0) {
            if (this.charts.spending) {
                this.charts.spending.destroy();
            }
            ctx.style.display = 'none';
            return;
        }

        ctx.style.display = 'block';

        const monthlySpending = this.groupByMonth(completedRides);

        if (this.charts.spending) {
            this.charts.spending.destroy();
        }

        this.charts.spending = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(monthlySpending),
                datasets: [{
                    label: 'Spending',
                    data: Object.values(monthlySpending),
                    borderColor: '#00E5B8',
                    backgroundColor: 'rgba(0, 229, 184, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#00E5B8'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#A8B3CF',
                            callback: value => '$' + value,
                            font: { family: 'Outfit' }
                        },
                        grid: {
                            color: 'rgba(168, 179, 207, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#A8B3CF',
                            font: { family: 'Outfit' }
                        },
                        grid: {
                            color: 'rgba(168, 179, 207, 0.1)'
                        }
                    }
                }
            }
        });
    },

    groupByMonth(rides) {
        const months = {};
        rides.forEach(ride => {
            const date = new Date(ride.dateTime);
            const month = date.toLocaleString('default', { month: 'short' });
            months[month] = (months[month] || 0) + ride.price;
        });
        return months;
    },

    generateInsights(rides) {
        const container = document.getElementById('insightsList');
        if (!container) return;

        const insights = [];

        const completedRides = rides.filter(r => r.status === 'completed');
        const avgCost = completedRides.length > 0 
            ? completedRides.reduce((sum, r) => sum + r.price, 0) / completedRides.length 
            : 0;

        if (rides.length > 0) {
            const mostUsedType = this.getMostUsedType(rides);
            insights.push({
                title: '🚗 Most Popular Ride Type',
                description: `You prefer ${mostUsedType.type} rides, accounting for ${mostUsedType.percentage}% of your bookings.`
            });
        }

        if (avgCost > 25) {
            insights.push({
                title: '💎 Premium Preference',
                description: 'Your average ride cost is above standard. Consider Economy rides for shorter trips to save money.'
            });
        } else if (avgCost > 0) {
            insights.push({
                title: '💰 Budget Conscious',
                description: `Your average ride cost is ${Utils.formatPrice(avgCost)}. You're making cost-effective choices!`
            });
        }

        if (completedRides.length >= 10) {
            insights.push({
                title: '⭐ Frequent Rider',
                description: `You've completed ${completedRides.length} rides! You're a valued customer. Keep it up!`
            });
        }

        if (rides.length === 0) {
            insights.push({
                title: '🎯 Get Started',
                description: 'Book your first ride to start tracking your analytics and personalized insights.'
            });
        }

        if (insights.length === 0) {
            insights.push({
                title: '📊 Building Your Profile',
                description: 'Complete more rides to unlock personalized insights and recommendations.'
            });
        }

        container.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <h4>${insight.title}</h4>
                <p>${insight.description}</p>
            </div>
        `).join('');
    },

    getMostUsedType(rides) {
        const typeCounts = rides.reduce((acc, ride) => {
            acc[ride.type] = (acc[ride.type] || 0) + 1;
            return acc;
        }, {});

        const entries = Object.entries(typeCounts);
        if (entries.length === 0) {
            return { type: 'None', percentage: 0 };
        }

        const mostUsed = entries.sort((a, b) => b[1] - a[1])[0];
        const total = rides.length;
        
        return {
            type: mostUsed[0].charAt(0).toUpperCase() + mostUsed[0].slice(1),
            percentage: Math.round((mostUsed[1] / total) * 100)
        };
    },

    clearAnalytics() {
        document.getElementById('totalRides').textContent = '0';
        document.getElementById('totalSpent').textContent = '$0';
        document.getElementById('avgCost').textContent = '$0';
        document.getElementById('completionRate').textContent = '0%';
        
        const insightsList = document.getElementById('insightsList');
        if (insightsList) {
            insightsList.innerHTML = '<div class="insight-item"><h4>🔒 Login Required</h4><p>Please login to view your personalized analytics and insights.</p></div>';
        }

        // Clear charts
        if (this.charts.rideType) {
            this.charts.rideType.destroy();
            this.charts.rideType = null;
        }
        if (this.charts.spending) {
            this.charts.spending.destroy();
            this.charts.spending = null;
        }
    }
};

// ============================================
// UI MODULE
// ============================================
const UIManager = {
    init() {
        this.attachEventListeners();
    },

    attachEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                this.showView(view);
            });
        });

        // Modal close
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) modal.classList.remove('active');
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
        });
    },

    showView(viewName) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        const view = document.getElementById(`${viewName}View`);
        const navItem = document.querySelector(`[data-view="${viewName}"]`);

        if (view) view.classList.add('active');
        if (navItem) navItem.classList.add('active');

        if (viewName === 'rides') {
            RidesManager.loadRides();
        } else if (viewName === 'analytics') {
            AnalyticsManager.updateAnalytics();
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },

    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('active');
    },

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('active');
    }
};

// ============================================
// GLOBAL FUNCTIONS
// ============================================
function showView(viewName) {
    UIManager.showView(viewName);
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚗 RideFlow initializing...');
    
    try {
        // Initialize modules in order
        if (DataManager.init()) {
            AuthManager.init();
            RidesManager.init();
            AnalyticsManager.init();
            UIManager.init();
            console.log('✅ RideFlow ready!');
        }
    } catch (error) {
        console.error('❌ Initialization error:', error);
        UIManager.showToast('Failed to initialize app', 'error');
    }
});

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
