class Profile2App {
    constructor() {
        this.correctPattern = [1, 2, 3, 4];
        this.currentPattern = [];
        this.isDrawing = false;
        this.dots = [];
        this.isUnlocked = false;
        this.socket = null;
        this.mySocketId = null;
        this.userName = null;

        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.grid = document.getElementById('grid');
        this.status = document.getElementById('status');
        this.lockScreen = document.getElementById('lockScreen');
        this.messagingApp = document.getElementById('messagingApp');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.lockBtn = document.getElementById('lockBtn');
        this.nameModal = document.getElementById('nameModal');
        this.nameInput = document.getElementById('nameInput');
        this.submitNameBtn = document.getElementById('submitNameBtn');

        this.initCanvas();
        this.initDots();
        this.initEventListeners();
        this.loadPattern();
    }

    initCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;
    }

    initDots() {
        const dotElements = document.querySelectorAll('.dot');
        dotElements.forEach(dotEl => {
            const num = parseInt(dotEl.dataset.num);
            const rect = dotEl.getBoundingClientRect();
            const containerRect = this.grid.getBoundingClientRect();

            this.dots.push({
                num: num,
                element: dotEl,
                x: rect.left + rect.width / 2 - containerRect.left,
                y: rect.top + rect.height / 2 - containerRect.top
            });
        });
    }

    initEventListeners() {
        this.grid.addEventListener('mousedown', this.startPattern.bind(this));
        this.grid.addEventListener('mousemove', this.continuePattern.bind(this));
        this.grid.addEventListener('mouseup', this.endPattern.bind(this));
        this.grid.addEventListener('mouseleave', this.endPattern.bind(this));

        this.grid.addEventListener('touchstart', this.handleTouch.bind(this));
        this.grid.addEventListener('touchmove', this.handleTouch.bind(this));
        this.grid.addEventListener('touchend', this.endPattern.bind(this));

        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        this.lockBtn.addEventListener('click', () => this.lockApp());

        // Name modal events
        this.submitNameBtn.addEventListener('click', () => this.submitName());
        this.nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitName();
        });
    }

    initSocket() {
        this.socket = io();
        this.mySocketId = this.socket.id;

        this.socket.emit('join-profile', {
            profile: 'profile2',
            userName: this.userName
        });

        this.socket.on('load-messages', (messages) => {
            this.messagesContainer.innerHTML = '';
            messages.forEach(msg => {
                this.displayMessage(msg.text, msg.time, msg.profile, msg.profile === 'profile2');
            });
        });

        this.socket.on('receive-message', (data) => {
            this.displayMessage(data.text, data.time, data.profile, data.profile === 'profile2');
        });
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;

        const fakeEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: document.elementFromPoint(touch.clientX, touch.clientY)
        };

        if (e.type === 'touchstart') {
            this.startPattern(fakeEvent);
        } else if (e.type === 'touchmove') {
            this.continuePattern(fakeEvent);
        }
    }

    startPattern(e) {
        if (e.target.classList.contains('dot')) {
            this.isDrawing = true;
            this.addDotToPattern(e.target);
        }
    }

    continuePattern(e) {
        if (!this.isDrawing) return;

        const element = e.target || document.elementFromPoint(e.clientX, e.clientY);
        if (element && element.classList.contains('dot')) {
            this.addDotToPattern(element);
        }

        this.drawPattern(e.clientX, e.clientY);
    }

    endPattern() {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (this.currentPattern.length >= 4) {
            this.validatePattern();
        } else if (this.currentPattern.length > 0) {
            this.status.textContent = 'Pattern too short!';
            this.showError();
            setTimeout(() => this.resetPattern(), 1000);
        }

        this.clearCanvas();
    }

    addDotToPattern(dotElement) {
        const num = parseInt(dotElement.dataset.num);

        if (!this.currentPattern.includes(num)) {
            this.currentPattern.push(num);
            dotElement.classList.add('active');
        }
    }

    drawPattern(mouseX, mouseY) {
        this.clearCanvas();

        if (this.currentPattern.length === 0) return;

        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();

        const firstDot = this.dots.find(d => d.num === this.currentPattern[0]);
        this.ctx.moveTo(firstDot.x, firstDot.y);

        for (let i = 1; i < this.currentPattern.length; i++) {
            const dot = this.dots.find(d => d.num === this.currentPattern[i]);
            this.ctx.lineTo(dot.x, dot.y);
        }

        if (this.isDrawing && mouseX && mouseY) {
            const containerRect = this.grid.getBoundingClientRect();
            const relX = mouseX - containerRect.left;
            const relY = mouseY - containerRect.top;
            this.ctx.lineTo(relX, relY);
        }

        this.ctx.stroke();
    }

    validatePattern() {
        if (this.arraysEqual(this.currentPattern, this.correctPattern)) {
            this.status.textContent = 'Unlocked!';
            this.showSuccess();
            setTimeout(() => this.unlockApp(), 500);
        } else {
            this.status.textContent = 'Wrong pattern';
            this.showError();
            setTimeout(() => this.resetPattern(), 1500);
        }
    }

    showSuccess() {
        document.querySelectorAll('.dot.active').forEach(dot => {
            dot.classList.add('success');
        });
        this.ctx.strokeStyle = '#48bb78';
        this.drawPattern();
    }

    showError() {
        document.querySelectorAll('.dot.active').forEach(dot => {
            dot.classList.add('error');
        });
        this.ctx.strokeStyle = '#f56565';
        this.drawPattern();
    }

    resetPattern() {
        this.currentPattern = [];
        this.isDrawing = false;
        document.querySelectorAll('.dot').forEach(dot => {
            dot.classList.remove('active', 'success', 'error');
        });
        this.clearCanvas();
        this.status.textContent = 'Draw pattern to unlock Profile 2';
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }
        return true;
    }

    unlockApp() {
        this.isUnlocked = true;
        this.lockScreen.style.display = 'none';
        this.nameModal.style.display = 'flex';
        this.nameInput.focus();
    }

    submitName() {
        const name = this.nameInput.value.trim();
        if (!name) {
            this.nameInput.style.borderColor = '#f56565';
            setTimeout(() => {
                this.nameInput.style.borderColor = '#ddd';
            }, 1000);
            return;
        }

        this.userName = name;
        this.nameModal.style.display = 'none';
        this.messagingApp.style.display = 'flex';
        this.messagingApp.style.flexDirection = 'column';
        this.initSocket();
        this.scrollToBottom();
    }

    lockApp() {
        this.isUnlocked = false;
        this.messagingApp.style.display = 'none';
        this.lockScreen.style.display = 'block';
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.userName = null;
        this.nameInput.value = '';
        this.resetPattern();
    }

    sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text || !this.socket) return;

        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        this.socket.emit('send-message', {
            profile: 'profile2',
            message: text,
            time: time,
            userName: this.userName
        });

        this.messageInput.value = '';
    }

    displayMessage(text, time, fromProfile, isMine) {
        const messageDiv = document.createElement('div');
        messageDiv.className = isMine ? 'message sent' : 'message received';

        let profileLabel;
        if (isMine) {
            profileLabel = this.userName || 'Profile 2';
        } else {
            profileLabel = fromProfile === 'profile1' ? 'J' : 'Profile 2';
        }
        const showLabel = true; // Always show labels

        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${showLabel ? `<div style="font-size: 11px; font-weight: bold; margin-bottom: 4px; opacity: 0.8;">${profileLabel}</div>` : ''}
                <div>${this.escapeHtml(text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Load pattern from localStorage
    loadPattern() {
        const saved = localStorage.getItem('profile2_pattern');
        if (saved) {
            this.correctPattern = JSON.parse(saved);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Profile2App();
});
