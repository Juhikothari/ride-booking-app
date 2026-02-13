// ============================================
// DATA MANAGEMENT MODULE
// ============================================
const DataManager = {
    init() {
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
    },

    getRides() {
        return JSON.parse(localStorage.getItem('rides') || '[]');
    },

    setRides(rides) {
        localStorage.setItem('rides', JSON.stringify(rides));
    },

    getUsers() {
        return JSON.parse(localStorage.getItem('users') || '[]');
    },

    setUsers(users) {
        localStorage.setItem('users', JSON.stringify(users));
    },

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('currentUser'));
    },

    setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
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
        document.getElementById('loginBtn').addEventListener('click', () => {
            this.showAuthModal('login');
        });

        document.getElementById('signupBtn').addEventListener('click', () => {
            this.showAuthModal('signup');
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('signupForm').addEventListener('submit', (e) => {
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
        modal.classList.add('active');
        this.switchAuthTab(tab);
    },

    switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}Form`).classList.add('active');
    },

    login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const users = DataManager.getUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            DataManager.setCurrentUser(user);
            this.updateUI();
            closeModal('authModal');
            UIManager.showToast('Welcome back!', 'success');
            RidesManager.loadRides();
            AnalyticsManager.updateAnalytics();
        } else {
            UIManager.showToast('Invalid credentials', 'error');
        }
    },

    signup() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        const users = DataManager.getUsers();
        
        if (users.find(u => u.email === email)) {
            UIManager.showToast('Email already exists', 'error');
            return;
        }

        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            password,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        DataManager.setUsers(users);
        DataManager.setCurrentUser(newUser);
        
        this.updateUI();
        closeModal('authModal');
        UIManager.showToast('Account created successfully!', 'success');
    },

    logout() {
        DataManager.setCurrentUser(null);
        this.updateUI();
        UIManager.showToast('Logged out successfully', 'success');
        RidesManager.loadRides();
        AnalyticsManager.updateAnalytics();
    },

    updateUI() {
        const user = DataManager.getCurrentUser();
        const authButtons = document.getElementById('authButtons');
        const userProfile = document.getElementById('userProfile');

        if (user) {
            authButtons.style.display = 'none';
            userProfile.style.display = 'flex';
            document.getElementById('userName').textContent = user.name;
            document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
        } else {
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
    },

    attachEventListeners() {
        // Booking form
        document.getElementById('bookingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRide();
        });

        // Ride type selection
        document.querySelectorAll('.ride-type-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.ride-type-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            });
        });

        // Search and filters
        document.getElementById('searchRides').addEventListener('input', (e) => {
            this.currentFilters.search = e.target.value;
            this.filterAndSortRides();
        });

        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.currentFilters.status = e.target.value;
            this.filterAndSortRides();
        });

        document.getElementById('typeFilter').addEventListener('change', (e) => {
            this.currentFilters.type = e.target.value;
            this.filterAndSortRides();
        });

        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentFilters.sortBy = e.target.value;
            this.filterAndSortRides();
        });

        // Edit form
        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateRide();
        });
    },

    createRide() {
        if (!AuthManager.requireAuth()) return;

        const pickup = document.getElementById('pickupLocation').value;
        const dropoff = document.getElementById('dropoffLocation').value;
        const dateTime = document.getElementById('rideDateTime').value;
        const passengers = document.getElementById('passengers').value;
        const selectedType = document.querySelector('.ride-type-card.active').dataset.type;
        const user = DataManager.getCurrentUser();

        const ride = {
            id: Date.now().toString(),
            userId: user.id,
            pickup,
            dropoff,
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

        UIManager.showToast('Ride booked successfully!', 'success');
        document.getElementById('bookingForm').reset();
        
        // Reset datetime to current
        this.setDefaultDateTime();
        
        // Simulate real-time update
        setTimeout(() => {
            this.updateRideStatus(ride.id, 'Driver is on the way');
        }, 2000);
    },

    setDefaultDateTime() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('rideDateTime').value = now.toISOString().slice(0, 16);
    },

    calculatePrice(type) {
        const basePrices = {
            economy: { min: 12, max: 15 },
            comfort: { min: 18, max: 22 },
            premium: { min: 30, max: 38 },
            xl: { min: 25, max: 32 }
        };
        const range = basePrices[type];
        return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    },

    generateDriverInfo() {
        const names = ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'David Wilson'];
        const name = names[Math.floor(Math.random() * names.length)];
        const rating = (4.5 + Math.random() * 0.5).toFixed(1);
        return { name, rating };
    },

    generateVehicleInfo(type) {
        const vehicles = {
            economy: ['Toyota Corolla', 'Honda Civic', 'Hyundai Elantra'],
            comfort: ['Toyota Camry', 'Honda Accord', 'Mazda 6'],
            premium: ['Mercedes E-Class', 'BMW 5 Series', 'Audi A6'],
            xl: ['Toyota Sienna', 'Honda Odyssey', 'Chrysler Pacifica']
        };
        const models = vehicles[type];
        const model = models[Math.floor(Math.random() * models.length)];
        const plate = `${String.fromCharCode(65 + Math.random() * 26)}${String.fromCharCode(65 + Math.random() * 26)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
        return { model, plate };
    },

    updateRideStatus(rideId, message) {
        UIManager.showToast(message, 'success');
    },

    loadRides() {
        const user = DataManager.getCurrentUser();
        if (!user) {
            document.getElementById('ridesList').innerHTML = '';
            document.getElementById('emptyState').style.display = 'block';
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
                r.status.toLowerCase().includes(search)
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

        if (rides.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        container.innerHTML = rides.map(ride => `
            <div class="ride-card">
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
                        <span class="meta-value">${new Date(ride.dateTime).toLocaleString()}</span>
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
                        <span class="meta-value">$${ride.price}</span>
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
        
        if (!ride) return;

        document.getElementById('editRideId').value = ride.id;
        document.getElementById('editPickup').value = ride.pickup;
        document.getElementById('editDropoff').value = ride.dropoff;
        document.getElementById('editDateTime').value = ride.dateTime;
        document.getElementById('editPassengers').value = ride.passengers;
        document.getElementById('editRideType').value = ride.type;

        openModal('editModal');
    },

    updateRide() {
        const id = document.getElementById('editRideId').value;
        const rides = DataManager.getRides();
        const rideIndex = rides.findIndex(r => r.id === id);

        if (rideIndex === -1) return;

        rides[rideIndex] = {
            ...rides[rideIndex],
            pickup: document.getElementById('editPickup').value,
            dropoff: document.getElementById('editDropoff').value,
            dateTime: document.getElementById('editDateTime').value,
            passengers: parseInt(document.getElementById('editPassengers').value),
            type: document.getElementById('editRideType').value,
            price: this.calculatePrice(document.getElementById('editRideType').value)
        };

        DataManager.setRides(rides);
        closeModal('editModal');
        this.loadRides();
        UIManager.showToast('Ride updated successfully!', 'success');
    },

    completeRide(id) {
        const rides = DataManager.getRides();
        const ride = rides.find(r => r.id === id);
        
        if (ride) {
            ride.status = 'completed';
            DataManager.setRides(rides);
            this.loadRides();
            AnalyticsManager.updateAnalytics();
            UIManager.showToast('Ride completed!', 'success');
        }
    },

    cancelRide(id) {
        const rides = DataManager.getRides();
        const ride = rides.find(r => r.id === id);
        
        if (ride) {
            ride.status = 'cancelled';
            DataManager.setRides(rides);
            this.loadRides();
            AnalyticsManager.updateAnalytics();
            UIManager.showToast('Ride cancelled', 'error');
        }
    },

    deleteRide(id) {
        if (confirm('Are you sure you want to delete this ride?')) {
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
        document.getElementById('dateRange').addEventListener('change', () => {
            this.updateAnalytics();
        });
    },

    updateAnalytics() {
        const user = DataManager.getCurrentUser();
        if (!user) {
            this.clearAnalytics();
            return;
        }

        const dateRange = parseInt(document.getElementById('dateRange').value);
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

        document.getElementById('totalRides').textContent = totalRides;
        document.getElementById('totalSpent').textContent = `$${totalSpent.toFixed(0)}`;
        document.getElementById('avgCost').textContent = `$${avgCost.toFixed(0)}`;
        document.getElementById('completionRate').textContent = `${completionRate.toFixed(0)}%`;

        // Simulate trends
        document.getElementById('ridesTrend').textContent = '+12%';
        document.getElementById('spentTrend').textContent = '+8%';
        document.getElementById('completionTrend').textContent = '+5%';
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
                            font: { size: 12 }
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
                    borderWidth: 2
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
                            callback: value => '$' + value
                        },
                        grid: {
                            color: 'rgba(168, 179, 207, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#A8B3CF'
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
        const insights = [];

        const completedRides = rides.filter(r => r.status === 'completed');
        const mostUsedType = this.getMostUsedType(rides);
        const avgCost = completedRides.length > 0 
            ? completedRides.reduce((sum, r) => sum + r.price, 0) / completedRides.length 
            : 0;

        if (rides.length > 0) {
            insights.push({
                title: 'Most Popular Ride Type',
                description: `You prefer ${mostUsedType.type} rides, accounting for ${mostUsedType.percentage}% of your bookings.`
            });
        }

        if (avgCost > 25) {
            insights.push({
                title: 'Premium Preference',
                description: 'Your average ride cost is above standard. Consider Economy rides for shorter trips to save money.'
            });
        }

        if (completedRides.length >= 5) {
            insights.push({
                title: 'Frequent Rider',
                description: `You've completed ${completedRides.length} rides. Great job! Keep it up for loyalty rewards.`
            });
        }

        if (rides.length === 0) {
            insights.push({
                title: 'Get Started',
                description: 'Book your first ride to start tracking your analytics and insights.'
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

        const mostUsed = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
        const total = rides.length;
        
        return mostUsed ? {
            type: mostUsed[0].charAt(0).toUpperCase() + mostUsed[0].slice(1),
            percentage: Math.round((mostUsed[1] / total) * 100)
        } : { type: 'None', percentage: 0 };
    },

    clearAnalytics() {
        document.getElementById('totalRides').textContent = '0';
        document.getElementById('totalSpent').textContent = '$0';
        document.getElementById('avgCost').textContent = '$0';
        document.getElementById('completionRate').textContent = '0%';
        document.getElementById('insightsList').innerHTML = '<div class="insight-item"><h4>Login Required</h4><p>Please login to view your analytics.</p></div>';
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
                btn.closest('.modal').classList.remove('active');
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
    },

    showView(viewName) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        document.getElementById(`${viewName}View`).classList.add('active');
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        if (viewName === 'rides') {
            RidesManager.loadRides();
        } else if (viewName === 'analytics') {
            AnalyticsManager.updateAnalytics();
        }
    },

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
};

// ============================================
// GLOBAL FUNCTIONS
// ============================================
function showView(viewName) {
    UIManager.showView(viewName);
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    DataManager.init();
    AuthManager.init();
    RidesManager.init();
    AnalyticsManager.init();
    UIManager.init();
    
    // Set default datetime
    RidesManager.setDefaultDateTime();
    
    // Add some demo data for new users
    if (DataManager.getRides().length === 0) {
        console.log('Welcome to RideFlow! Start by creating an account or logging in.');
    }
});
