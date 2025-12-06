class Profile1App {
    constructor() {
        this.correctPattern = [1, 2, 3, 4];
        this.currentPattern = [];
        this.isDrawing = false;
        this.dots = [];
        this.isUnlocked = false;
        this.socket = null;
        this.mySocketId = null;
        this.isChangingPattern = false;
        this.newPattern = [];

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
        this.changePatternBtn = document.getElementById('changePatternBtn');
        this.patternChangeModal = document.getElementById('patternChangeModal');
        this.canvasChange = document.getElementById('canvasChange');
        this.ctxChange = this.canvasChange.getContext('2d');
        this.gridChange = document.getElementById('gridChange');
        this.patternChangeTitle = document.getElementById('patternChangeTitle');
        this.savePatternBtn = document.getElementById('savePatternBtn');
        this.cancelPatternBtn = document.getElementById('cancelPatternBtn');

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
        this.changePatternBtn.addEventListener('click', () => this.openPatternChange());
        this.savePatternBtn.addEventListener('click', () => this.saveNewPattern());
        this.cancelPatternBtn.addEventListener('click', () => this.closePatternChange());

        // Pattern change modal events
        this.gridChange.addEventListener('mousedown', this.startPatternChange.bind(this));
        this.gridChange.addEventListener('mousemove', this.continuePatternChange.bind(this));
        this.gridChange.addEventListener('mouseup', this.endPatternChange.bind(this));
        this.gridChange.addEventListener('mouseleave', this.endPatternChange.bind(this));

        this.gridChange.addEventListener('touchstart', this.handleTouchChange.bind(this));
        this.gridChange.addEventListener('touchmove', this.handleTouchChange.bind(this));
        this.gridChange.addEventListener('touchend', this.endPatternChange.bind(this));
    }

    initSocket() {
        this.socket = io();
        this.mySocketId = this.socket.id;

        this.socket.emit('join-profile', 'profile1');

        this.socket.on('load-messages', (messages) => {
            this.messagesContainer.innerHTML = '';
            messages.forEach(msg => {
                this.displayMessage(msg.text, msg.time, msg.profile, msg.profile === 'profile1');
            });
        });

        this.socket.on('receive-message', (data) => {
            this.displayMessage(data.text, data.time, data.profile, data.profile === 'profile1');
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
        this.status.textContent = 'Draw pattern to unlock Profile 1';
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
        this.resetPattern();
    }

    sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text || !this.socket) return;

        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        this.socket.emit('send-message', {
            profile: 'profile1',
            message: text,
            time: time
        });

        this.messageInput.value = '';
    }

    displayMessage(text, time, fromProfile, isMine) {
        const messageDiv = document.createElement('div');
        messageDiv.className = isMine ? 'message sent' : 'message received';

        const profileLabel = fromProfile === 'profile1' ? 'Profile 1' : 'Profile 2';
        const showLabel = !isMine;

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

    // Pattern changing methods
    loadPattern() {
        const saved = localStorage.getItem('profile1_pattern');
        if (saved) {
            this.correctPattern = JSON.parse(saved);
        }
    }

    savePattern(pattern) {
        localStorage.setItem('profile1_pattern', JSON.stringify(pattern));
        this.correctPattern = pattern;
    }

    openPatternChange() {
        this.patternChangeModal.style.display = 'flex';
        this.newPattern = [];
        this.patternChangeTitle.textContent = 'Draw your new pattern (at least 4 dots)';
        this.canvasChange.width = this.canvasChange.parentElement.offsetWidth;
        this.canvasChange.height = this.canvasChange.parentElement.offsetHeight;
    }

    closePatternChange() {
        this.patternChangeModal.style.display = 'none';
        this.newPattern = [];
        this.clearChangePattern();
    }

    saveNewPattern() {
        if (this.newPattern.length < 4) {
            this.patternChangeTitle.textContent = 'Pattern too short! Need at least 4 dots';
            this.patternChangeTitle.style.color = '#f56565';
            setTimeout(() => {
                this.patternChangeTitle.textContent = 'Draw your new pattern (at least 4 dots)';
                this.patternChangeTitle.style.color = '#333';
            }, 2000);
            return;
        }

        this.savePattern(this.newPattern);
        this.patternChangeTitle.textContent = '✓ Pattern saved successfully!';
        this.patternChangeTitle.style.color = '#48bb78';

        setTimeout(() => {
            this.closePatternChange();
            this.patternChangeTitle.style.color = '#333';
        }, 1500);
    }

    startPatternChange(e) {
        if (e.target.classList.contains('dot')) {
            this.isChangingPattern = true;
            this.addDotToChangePattern(e.target);
        }
    }

    continuePatternChange(e) {
        if (!this.isChangingPattern) return;

        const element = e.target || document.elementFromPoint(e.clientX, e.clientY);
        if (element && element.classList.contains('dot')) {
            this.addDotToChangePattern(element);
        }

        this.drawChangePattern(e.clientX, e.clientY);
    }

    endPatternChange() {
        if (!this.isChangingPattern) return;
        this.isChangingPattern = false;
        this.clearChangeCanvas();
    }

    addDotToChangePattern(dotElement) {
        const num = parseInt(dotElement.dataset.num);

        if (!this.newPattern.includes(num)) {
            this.newPattern.push(num);
            dotElement.classList.add('active');
            this.patternChangeTitle.textContent = `Pattern: ${this.newPattern.join(' → ')}`;
        }
    }

    drawChangePattern(mouseX, mouseY) {
        this.clearChangeCanvas();

        if (this.newPattern.length === 0) return;

        const dotsChange = [];
        this.gridChange.querySelectorAll('.dot').forEach(dotEl => {
            const num = parseInt(dotEl.dataset.num);
            const rect = dotEl.getBoundingClientRect();
            const containerRect = this.gridChange.getBoundingClientRect();
            dotsChange.push({
                num: num,
                x: rect.left + rect.width / 2 - containerRect.left,
                y: rect.top + rect.height / 2 - containerRect.top
            });
        });

        this.ctxChange.strokeStyle = '#667eea';
        this.ctxChange.lineWidth = 4;
        this.ctxChange.lineCap = 'round';
        this.ctxChange.lineJoin = 'round';

        this.ctxChange.beginPath();

        const firstDot = dotsChange.find(d => d.num === this.newPattern[0]);
        this.ctxChange.moveTo(firstDot.x, firstDot.y);

        for (let i = 1; i < this.newPattern.length; i++) {
            const dot = dotsChange.find(d => d.num === this.newPattern[i]);
            this.ctxChange.lineTo(dot.x, dot.y);
        }

        if (this.isChangingPattern && mouseX && mouseY) {
            const containerRect = this.gridChange.getBoundingClientRect();
            const relX = mouseX - containerRect.left;
            const relY = mouseY - containerRect.top;
            this.ctxChange.lineTo(relX, relY);
        }

        this.ctxChange.stroke();
    }

    clearChangePattern() {
        this.newPattern = [];
        this.gridChange.querySelectorAll('.dot').forEach(dot => {
            dot.classList.remove('active', 'success', 'error');
        });
        this.clearChangeCanvas();
    }

    clearChangeCanvas() {
        this.ctxChange.clearRect(0, 0, this.canvasChange.width, this.canvasChange.height);
    }

    handleTouchChange(e) {
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;

        const fakeEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: document.elementFromPoint(touch.clientX, touch.clientY)
        };

        if (e.type === 'touchstart') {
            this.startPatternChange(fakeEvent);
        } else if (e.type === 'touchmove') {
            this.continuePatternChange(fakeEvent);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Profile1App();
});
