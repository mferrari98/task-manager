// Task Manager Frontend Application
class TaskManager {
    constructor() {
        this.currentUser = null;
        this.socket = null;
        this.currentView = 'dashboard';
        this.tasks = [];
        this.users = [];
        this.connectedUsers = [];

        this.init();
    }

    async init() {
        try {
            // Initialize Socket.io
            this.initSocket();

            // Check authentication status
            await this.checkAuthStatus();

            // Initialize event listeners
            this.initEventListeners();

            // Load initial data if authenticated
            if (this.currentUser) {
                await this.loadInitialData();
            }
        } catch (error) {
            console.error('Application initialization error:', error);
            this.showError('Error al inicializar la aplicación');
        }
    }

    initSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showWarning('Conexión perdida. Intentando reconectar...');
        });

        // Real-time events
        this.socket.on('task:created', (task) => {
            this.handleTaskCreated(task);
        });

        this.socket.on('task:updated', (task) => {
            this.handleTaskUpdated(task);
        });

        this.socket.on('task:deleted', (data) => {
            this.handleTaskDeleted(data);
        });

        this.socket.on('task:assigned', (data) => {
            this.handleTaskAssigned(data);
        });

        this.socket.on('task:status_changed', (data) => {
            this.handleTaskStatusChanged(data);
        });

        this.socket.on('task:update_added', (data) => {
            this.handleTaskUpdateAdded(data);
        });

        this.socket.on('users:updated', (users) => {
            this.handleUsersUpdated(users);
        });

        this.socket.on('task:viewer_joined', (data) => {
            this.handleTaskViewerJoined(data);
        });

        this.socket.on('task:viewer_left', (data) => {
            this.handleTaskViewerLeft(data);
        });
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();

            if (data.authenticated) {
                this.currentUser = data.user;
                this.showMainApp();
                this.socket.emit('user:join', this.currentUser);
            } else {
                this.showLoginModal();
            }
        } catch (error) {
            console.error('Auth status check error:', error);
            this.showLoginModal();
        }
    }

    initEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Navigation
        document.getElementById('dashboardLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showView('dashboard');
        });

        document.getElementById('allTasksLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showView('tasks');
        });

        document.getElementById('myTasksLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showView('myTasks');
        });

        document.getElementById('createTaskLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showCreateTaskModal();
        });

        // Admin only
        if (this.currentUser?.role === 'admin') {
            document.getElementById('userManagementLink').addEventListener('click', (e) => {
                e.preventDefault();
                this.showView('userManagement');
            });
        }

        // Task management
        document.getElementById('createTaskBtn').addEventListener('click', () => {
            this.showCreateTaskModal();
        });

        document.getElementById('saveTaskBtn').addEventListener('click', () => {
            this.handleCreateTask();
        });

        // Filters
        document.getElementById('applyFiltersBtn').addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            this.clearFilters();
        });

        // Dashboard refresh
        document.getElementById('refreshDashboardBtn').addEventListener('click', () => {
            this.loadDashboardData();
        });

        // User management (admin)
        document.getElementById('saveUserBtn').addEventListener('click', () => {
            this.handleCreateUser();
        });

        // Task details modal updates
        document.getElementById('addUpdateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddUpdate();
        });

        // Form validation
        this.initFormValidation();
    }

    async handleLogin() {
        const name = document.getElementById('userName').value.trim();

        if (!name) {
            this.showError('Por favor ingresa tu nombre de usuario');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                this.showMainApp();
                this.socket.emit('user:join', this.currentUser);
                await this.loadInitialData();
                this.showSuccess('¡Bienvenido ' + this.currentUser.name + '!');
            } else {
                this.showError(data.error || 'Error de autenticación');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Error de conexión');
        }
    }

    async handleLogout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST'
            });

            this.socket.emit('user:leave');
            this.currentUser = null;
            this.showLoginModal();
            this.showSuccess('Sesión cerrada correctamente');
        } catch (error) {
            console.error('Logout error:', error);
            this.showError('Error al cerrar sesión');
        }
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadTasks(),
                this.loadUsers(),
                this.loadDashboardData()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Error al cargar datos iniciales');
        }
    }

    async loadTasks(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters);
            const response = await fetch(`/api/tasks?${queryParams}`);
            this.tasks = await response.json();

            if (this.currentView === 'tasks' || this.currentView === 'myTasks') {
                this.renderTasks();
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showError('Error al cargar tareas');
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/users');
            this.users = await response.json();
            this.updateUserSelects();
            this.updateActiveUsersList();
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async loadDashboardData() {
        try {
            const [statsResponse, tasksResponse] = await Promise.all([
                fetch('/api/tasks/stats/overview'),
                fetch('/api/tasks?limit=5')
            ]);

            const stats = await statsResponse.json();
            const recentTasks = await tasksResponse.json();

            this.updateDashboardStats(stats);
            this.updateRecentTasks(recentTasks);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    // View management
    showView(viewName) {
        // Hide all content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('d-none');
        });

        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected section and activate nav link
        switch (viewName) {
            case 'dashboard':
                document.getElementById('dashboardContent').classList.remove('d-none');
                document.getElementById('dashboardLink').classList.add('active');
                this.loadDashboardData();
                break;
            case 'tasks':
                document.getElementById('tasksListContent').classList.remove('d-none');
                document.getElementById('allTasksLink').classList.add('active');
                this.renderTasks();
                break;
            case 'myTasks':
                document.getElementById('tasksListContent').classList.remove('d-none');
                document.getElementById('myTasksLink').classList.add('active');
                this.renderMyTasks();
                break;
            case 'userManagement':
                document.getElementById('userManagementContent').classList.remove('d-none');
                document.getElementById('userManagementLink').classList.add('active');
                this.loadUserManagement();
                break;
        }

        this.currentView = viewName;
    }

    // Task rendering
    renderTasks() {
        const container = document.getElementById('tasksGrid');
        const tasks = this.applyCurrentFilters(this.tasks);

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="bi bi-inbox"></i>
                        <h5>No se encontraron tareas</h5>
                        <p>No hay tareas que coincidan con los filtros seleccionados.</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = tasks.map(task => this.createTaskCard(task)).join('');

        // Add event listeners to task cards
        this.attachTaskCardListeners();
    }

    renderMyTasks() {
        const myTasks = this.tasks.filter(task =>
            task.assigned_to === this.currentUser.id
        );

        const container = document.getElementById('tasksGrid');

        if (myTasks.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="bi bi-person-workspace"></i>
                        <h5>No tienes tareas asignadas</h5>
                        <p>Todavía no tienes tareas asignadas a ti.</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = myTasks.map(task => this.createTaskCard(task)).join('');
        this.attachTaskCardListeners();
    }

    createTaskCard(task) {
        const priorityClass = `task-priority-${task.priority}`;
        const statusClass = `status-${task.status}`;
        const priorityText = {
            'alta': 'Alta',
            'media': 'Media',
            'baja': 'Baja'
        }[task.priority];

        const statusText = {
            'activo': 'Activo',
            'inactivo': 'Inactivo',
            'finalizado': 'Finalizado'
        }[task.status];

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card task-card ${priorityClass}" data-task-id="${task.id}">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <span class="badge status-badge ${statusClass}">${statusText}</span>
                        <small class="text-muted">Prioridad: ${priorityText}</small>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${this.escapeHtml(task.title)}</h6>
                        <p class="card-text text-muted small">${this.escapeHtml(task.description || 'Sin descripción')}</p>

                        <div class="task-meta mb-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">
                                    <i class="bi bi-person"></i> ${task.assigned_name || 'Sin asignar'}
                                </small>
                                <small class="text-muted">
                                    <i class="bi bi-calendar"></i> ${new Date(task.created_at).toLocaleDateString()}
                                </small>
                            </div>
                        </div>

                        ${task.due_date ? `
                            <div class="alert alert-warning py-1 px-2 small mb-2">
                                <i class="bi bi-calendar-event"></i> Vence: ${new Date(task.due_date).toLocaleDateString()}
                            </div>
                        ` : ''}

                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary view-task-btn" data-task-id="${task.id}">
                                <i class="bi bi-eye"></i> Ver
                            </button>
                            ${this.canEditTask(task) ? `
                                <button class="btn btn-sm btn-outline-secondary edit-task-btn" data-task-id="${task.id}">
                                    <i class="bi bi-pencil"></i> Editar
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Real-time event handlers
    handleTaskCreated(task) {
        this.tasks.unshift(task);
        if (this.currentView === 'tasks' || this.currentView === 'myTasks') {
            this.renderTasks();
        }
        this.showNotification(`Nueva tarea creada: ${task.title}`, 'info');
    }

    handleTaskUpdated(task) {
        const index = this.tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
            this.tasks[index] = task;
            if (this.currentView === 'tasks' || this.currentView === 'myTasks') {
                this.renderTasks();
            }
            this.showNotification(`Tarea actualizada: ${task.title}`, 'info');
        }
    }

    handleTaskDeleted(data) {
        this.tasks = this.tasks.filter(t => t.id !== data.id);
        if (this.currentView === 'tasks' || this.currentView === 'myTasks') {
            this.renderTasks();
        }
        this.showNotification('Tarea eliminada', 'warning');
    }

    handleTaskAssigned(data) {
        const index = this.tasks.findIndex(t => t.id === data.taskId);
        if (index !== -1) {
            this.tasks[index] = data.task;
            if (this.currentView === 'tasks' || this.currentView === 'myTasks') {
                this.renderTasks();
            }
        }

        if (data.assignedTo === this.currentUser.id) {
            this.showNotification(`Te han asignado la tarea: ${data.task.title}`, 'success');
        }
    }

    handleTaskStatusChanged(data) {
        const index = this.tasks.findIndex(t => t.id === data.taskId);
        if (index !== -1) {
            this.tasks[index] = data.task;
            if (this.currentView === 'tasks' || this.currentView === 'myTasks') {
                this.renderTasks();
            }
        }
        this.showNotification(`Estado de tarea cambiado a: ${data.status}`, 'info');
    }

    handleTaskUpdateAdded(data) {
        const index = this.tasks.findIndex(t => t.id === data.taskId);
        if (index !== -1) {
            this.tasks[index] = data.task;
        }

        // Update task details modal if open
        const modal = document.getElementById('taskDetailsModal');
        if (modal.classList.contains('show')) {
            this.loadTaskDetails(data.taskId);
        }

        this.showNotification(`Nueva actualización de progreso en: ${data.task.title}`, 'info');
    }

    handleUsersUpdated(users) {
        this.connectedUsers = users;
        this.updateActiveUsersList();
    }

    handleTaskViewerJoined(data) {
        // Update viewer indicators in task details modal
        const viewersContainer = document.getElementById('taskViewers');
        if (viewersContainer && viewersContainer.dataset.taskId == data.taskId) {
            this.updateTaskViewers(data.taskId);
        }
    }

    handleTaskViewerLeft(data) {
        // Update viewer indicators in task details modal
        const viewersContainer = document.getElementById('taskViewers');
        if (viewersContainer && viewersContainer.dataset.taskId == data.taskId) {
            this.updateTaskViewers(data.taskId);
        }
    }

    // UI Helpers
    showLoginModal() {
        document.getElementById('loginModal').classList.add('show');
        document.getElementById('loginModal').style.display = 'block';
        document.getElementById('mainApp').classList.add('d-none');
        document.body.classList.add('modal-open');
    }

    showMainApp() {
        document.getElementById('loginModal').classList.remove('show');
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('mainApp').classList.remove('d-none');
        document.body.classList.remove('modal-open');

        // Update user info in header
        document.getElementById('currentUserName').textContent = this.currentUser.name;
        document.getElementById('currentUserRole').textContent =
            this.currentUser.role === 'admin' ? 'Administrador' : 'Trabajador';

        // Show admin features if applicable
        if (this.currentUser.role === 'admin') {
            document.getElementById('userManagementLink').style.display = 'block';
        }
    }

    showCreateTaskModal() {
        const modal = new bootstrap.Modal(document.getElementById('createTaskModal'));

        // Populate user select
        const assignedSelect = document.getElementById('taskAssignedTo');
        assignedSelect.innerHTML = '<option value="">Sin asignar</option>' +
            this.users.map(user =>
                `<option value="${user.id}">${this.escapeHtml(user.name)}</option>`
            ).join('');

        modal.show();
    }

    async handleCreateTask() {
        const taskData = {
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            priority: document.getElementById('taskPriority').value,
            assigned_to: document.getElementById('taskAssignedTo').value || null,
            due_date: document.getElementById('taskDueDate').value || null
        };

        if (!taskData.title) {
            this.showError('El título es obligatorio');
            return;
        }

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('createTaskModal'));
                modal.hide();

                // Reset form
                document.getElementById('createTaskForm').reset();

                this.showSuccess('Tarea creada correctamente');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Error al crear tarea');
            }
        } catch (error) {
            console.error('Create task error:', error);
            this.showError('Error de conexión');
        }
    }

    async showTaskDetails(taskId) {
        try {
            const response = await fetch(`/api/tasks/${taskId}`);
            const task = await response.json();

            this.renderTaskDetails(task);

            const modal = new bootstrap.Modal(document.getElementById('taskDetailsModal'));
            modal.show();

            // Notify others that this user is viewing the task
            this.socket.emit('task:viewing', taskId);

            // Clean up when modal is hidden
            document.getElementById('taskDetailsModal').addEventListener('hidden.bs.modal', () => {
                this.socket.emit('task:stop_viewing', taskId);
            }, { once: true });
        } catch (error) {
            console.error('Error loading task details:', error);
            this.showError('Error al cargar detalles de la tarea');
        }
    }

    renderTaskDetails(task) {
        const container = document.getElementById('taskDetailsContent');
        const statusClass = `status-${task.status}`;
        const priorityClass = `task-priority-${task.priority}`;

        container.innerHTML = `
            <div class="task-detail-section">
                <h4>${this.escapeHtml(task.title)}</h4>
                <div class="mb-3">
                    <span class="badge status-badge ${statusClass} me-2">${task.status}</span>
                    <span class="badge bg-secondary">${task.priority}</span>
                </div>
                <p class="text-muted">${this.escapeHtml(task.description || 'Sin descripción')}</p>
            </div>

            <div class="task-detail-section">
                <h6>Información de la Tarea</h6>
                <div class="task-meta-item">
                    <span>Creado por:</span>
                    <span>${this.escapeHtml(task.creator_name)}</span>
                </div>
                <div class="task-meta-item">
                    <span>Asignado a:</span>
                    <span>${this.escapeHtml(task.assigned_name || 'Sin asignar')}</span>
                </div>
                <div class="task-meta-item">
                    <span>Fecha de creación:</span>
                    <span>${new Date(task.created_at).toLocaleString()}</span>
                </div>
                <div class="task-meta-item">
                    <span>Última actualización:</span>
                    <span>${new Date(task.updated_at).toLocaleString()}</span>
                </div>
                ${task.due_date ? `
                    <div class="task-meta-item">
                        <span>Fecha límite:</span>
                        <span>${new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                ` : ''}
            </div>

            <div class="task-detail-section">
                <h6>Acciones</h6>
                <div class="btn-group" role="group">
                    ${this.canEditTask(task) ? `
                        <button class="btn btn-outline-primary btn-sm" onclick="taskManager.editTask(${task.id})">
                            <i class="bi bi-pencil"></i> Editar
                        </button>
                    ` : ''}
                    <button class="btn btn-outline-success btn-sm" onclick="taskManager.changeTaskStatus(${task.id})">
                        <i class="bi bi-arrow-repeat"></i> Cambiar Estado
                    </button>
                    ${this.currentUser.role === 'admin' ? `
                        <button class="btn btn-outline-danger btn-sm" onclick="taskManager.deleteTask(${task.id})">
                            <i class="bi bi-trash"></i> Eliminar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        this.renderTaskUpdates(task.updates);
    }

    renderTaskUpdates(updates) {
        const container = document.getElementById('taskUpdatesList');

        if (updates.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay actualizaciones aún.</p>';
            return;
        }

        container.innerHTML = updates.map(update => `
            <div class="update-item">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <strong>${this.escapeHtml(update.user_name)}</strong>
                    <small class="text-muted">${new Date(update.timestamp).toLocaleString()}</small>
                </div>
                ${update.comment ? `<p class="mb-2">${this.escapeHtml(update.comment)}</p>` : ''}
                ${update.progress > 0 ? `
                    <div class="progress-bar-custom">
                        <div class="progress-fill" style="width: ${update.progress}%"></div>
                    </div>
                    <small class="progress-info">Progreso: ${update.progress}%</small>
                ` : ''}
            </div>
        `).join('');
    }

    async handleAddUpdate() {
        const taskId = document.getElementById('taskDetailsModal').dataset.taskId;
        const comment = document.getElementById('updateComment').value.trim();
        const progress = parseInt(document.getElementById('updateProgress').value) || 0;

        if (!comment && progress === 0) {
            this.showError('Agrega un comentario o progreso');
            return;
        }

        try {
            const response = await fetch(`/api/tasks/${taskId}/updates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comment, progress })
            });

            if (response.ok) {
                document.getElementById('addUpdateForm').reset();
                this.showSuccess('Actualización agregada correctamente');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Error al agregar actualización');
            }
        } catch (error) {
            console.error('Add update error:', error);
            this.showError('Error de conexión');
        }
    }

    // Utility methods
    canEditTask(task) {
        return this.currentUser.role === 'admin' ||
               task.created_by === this.currentUser.id ||
               task.assigned_to === this.currentUser.id;
    }

    updateDashboardStats(stats) {
        document.getElementById('totalTasksCount').textContent = stats.total;
        document.getElementById('activeTasksCount').textContent = stats.active;
        document.getElementById('inactiveTasksCount').textContent = stats.inactive;
        document.getElementById('completedTasksCount').textContent = stats.completed;
    }

    updateRecentTasks(tasks) {
        const container = document.getElementById('recentTasksList');

        if (tasks.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay tareas recientes.</p>';
            return;
        }

        container.innerHTML = tasks.map(task => `
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                    <strong>${this.escapeHtml(task.title)}</strong>
                    <br>
                    <small class="text-muted">
                        ${task.assigned_name || 'Sin asignar'} - ${new Date(task.created_at).toLocaleDateString()}
                    </small>
                </div>
                <span class="badge status-badge status-${task.status}">${task.status}</span>
            </div>
        `).join('');
    }

    updateUserSelects() {
        const selects = [
            document.getElementById('filterAssigned'),
            document.getElementById('taskAssignedTo')
        ];

        selects.forEach(select => {
            if (select) {
                const currentValue = select.value;
                select.innerHTML = select.id === 'taskAssignedTo'
                    ? '<option value="">Sin asignar</option>'
                    : '<option value="">Todos</option>';

                select.innerHTML += this.users.map(user =>
                    `<option value="${user.id}">${this.escapeHtml(user.name)}</option>`
                ).join('');

                select.value = currentValue;
            }
        });
    }

    updateActiveUsersList() {
        const container = document.getElementById('activeUsersList');
        const count = document.getElementById('activeUsersCount');

        count.textContent = this.connectedUsers.length;

        if (this.connectedUsers.length === 0) {
            container.innerHTML = '<li class="nav-item"><span class="nav-link text-muted small">No hay usuarios activos</span></li>';
            return;
        }

        container.innerHTML = this.connectedUsers.map(user => `
            <li class="nav-item active-user-item">
                <span class="nav-link d-flex align-items-center">
                    <span class="user-avatar">${this.escapeHtml(user.name.charAt(0).toUpperCase())}</span>
                    <span class="flex-grow-1">${this.escapeHtml(user.name)}</span>
                    <span class="user-status"></span>
                </span>
            </li>
        `).join('');
    }

    applyCurrentFilters(tasks) {
        const status = document.getElementById('filterStatus')?.value;
        const priority = document.getElementById('filterPriority')?.value;
        const assignedTo = document.getElementById('filterAssigned')?.value;

        return tasks.filter(task => {
            if (status && task.status !== status) return false;
            if (priority && task.priority !== priority) return false;
            if (assignedTo && task.assigned_to != assignedTo) return false;
            return true;
        });
    }

    applyFilters() {
        this.renderTasks();
    }

    clearFilters() {
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterPriority').value = '';
        document.getElementById('filterAssigned').value = '';
        this.renderTasks();
    }

    // Notification system
    showNotification(message, type = 'info') {
        const toast = document.getElementById('notificationToast');
        const toastBody = document.getElementById('notificationMessage');
        const toastTime = document.getElementById('notificationTime');

        toastBody.textContent = message;
        toastTime.textContent = 'ahora';

        // Add type-specific styling
        toast.classList.remove('text-bg-success', 'text-bg-warning', 'text-bg-danger', 'text-bg-info');
        toast.classList.add(`text-bg-${type}`);

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    // Form validation
    initFormValidation() {
        const forms = document.querySelectorAll('.needs-validation');
        forms.forEach(form => {
            form.addEventListener('submit', event => {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            });
        });
    }

    // Event listeners attachment
    attachTaskCardListeners() {
        document.querySelectorAll('.view-task-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const taskId = btn.dataset.taskId;
                this.showTaskDetails(taskId);
            });
        });

        document.querySelectorAll('.edit-task-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const taskId = btn.dataset.taskId;
                this.editTask(taskId);
            });
        });
    }

    async editTask(taskId) {
        // Implementation for task editing
        this.showInfo('Función de edición en desarrollo');
    }

    async changeTaskStatus(taskId) {
        // Implementation for status change
        this.showInfo('Función de cambio de estado en desarrollo');
    }

    async deleteTask(taskId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
            return;
        }

        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showSuccess('Tarea eliminada correctamente');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Error al eliminar tarea');
            }
        } catch (error) {
            console.error('Delete task error:', error);
            this.showError('Error de conexión');
        }
    }

    async loadUserManagement() {
        try {
            const response = await fetch('/api/users');
            const users = await response.json();

            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = users.map(user => `
                <tr>
                    <td>${user.id}</td>
                    <td>${this.escapeHtml(user.name)}</td>
                    <td>
                        <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">
                            ${user.role === 'admin' ? 'Administrador' : 'Trabajador'}
                        </span>
                    </td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="taskManager.editUser(${user.id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            ${user.id !== this.currentUser.id ? `
                                <button class="btn btn-outline-danger" onclick="taskManager.deleteUser(${user.id})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading user management:', error);
            this.showError('Error al cargar usuarios');
        }
    }

    async handleCreateUser() {
        const name = document.getElementById('newUserName').value.trim();
        const role = document.getElementById('newUserRole').value;

        if (!name || !role) {
            this.showError('Todos los campos son obligatorios');
            return;
        }

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, role })
            });

            if (response.ok) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal'));
                modal.hide();

                document.getElementById('createUserForm').reset();

                this.loadUserManagement();
                this.loadUsers();
                this.showSuccess('Usuario creado correctamente');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Error al crear usuario');
            }
        } catch (error) {
            console.error('Create user error:', error);
            this.showError('Error de conexión');
        }
    }

    async editUser(userId) {
        this.showInfo('Función de edición de usuarios en desarrollo');
    }

    async deleteUser(userId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
            return;
        }

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.loadUserManagement();
                this.loadUsers();
                this.showSuccess('Usuario eliminado correctamente');
            } else {
                const error = await response.json();
                this.showError(error.error || 'Error al eliminar usuario');
            }
        } catch (error) {
            console.error('Delete user error:', error);
            this.showError('Error de conexión');
        }
    }

    // Utility function to escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});