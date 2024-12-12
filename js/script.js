class Calculator {
    constructor() {
        this.inputValue = document.getElementById("user-input");
        this.historyList = document.getElementById("calculation-history");
        this.clickSound = document.getElementById("clickSound");
        this.errorSound = document.getElementById("errorSound");
        this.historyToggle = document.getElementById('history-toggle');
        this.container = document.querySelector('.container');
        this.memory = 0;
        this.memoryDisplay = document.getElementById('memory-value');
        this.themeSelect = document.getElementById('theme-select');
        this.precisionInput = document.getElementById('precision-input');
        this.educationalMode = document.getElementById('educational-mode');
        this.settingsToggle = document.getElementById('settings-toggle');
        this.settingsPanel = document.getElementById('settings-panel');
        this.exportBtn = document.getElementById('export-history');
        this.history = [];
        this.precision = 8;
        this.isEducationalMode = false;
        this.soundEnabled = true;
        this.vibrationEnabled = true;
        this.keyboardEnabled = true;
        this.autoCalculate = false;
        this.historySize = 10;
        this.fontSize = 'medium';
        this.isScientificMode = false;
        this.customThemes = JSON.parse(localStorage.getItem('calculator-custom-themes') || '{}');
        
        this.themeModal = document.getElementById('theme-creator');
        this.createThemeBtn = document.getElementById('create-theme');
        this.saveThemeBtn = document.getElementById('save-theme');
        this.cancelThemeBtn = document.getElementById('cancel-theme');
        
        this.calculatorMode = document.getElementById('calculator-mode');
        this.scientificButtons = document.querySelector('.scientific-buttons');
        
        this.previewResult = document.createElement('div');
        this.previewResult.className = 'preview-result';
        this.inputValue.parentElement.appendChild(this.previewResult);
        
        this.setupEventListeners();
        this.loadSettings();
        this.setupControlButtons();
        this.setupThemeCreator();
        this.setupScientificMode();
        
        document.addEventListener('click', (e) => {
            if (!this.settingsPanel.contains(e.target) && 
                !this.settingsToggle.contains(e.target)) {
                this.settingsPanel.classList.remove('show');
            }
            
            const themeModal = document.getElementById('theme-creator');
            const createThemeBtn = document.getElementById('create-theme');
            if (themeModal && 
                !themeModal.querySelector('.modal-content').contains(e.target) && 
                !createThemeBtn.contains(e.target)) {
                themeModal.classList.remove('show');
            }
        });
        
        this.setupTouchGestures();
        
        this.timeFormat = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        document.querySelectorAll('.operations').forEach(button => {
            button.addEventListener('click', (e) => {
                const operation = e.target.textContent;
                if (operation === 'AC') {
                    this.clearAll();
                } else if (operation === 'DEL') {
                    this.delete();
                }
            });
        });

        this.setupErrorTracking();
        this.setupAnalytics();

        if (this.clickSound) {
            this.clickSound.volume = 0.5;
            console.log('Click sound loaded:', this.clickSound.readyState);
        }
        if (this.errorSound) {
            this.errorSound.volume = 0.2;
            console.log('Error sound loaded:', this.errorSound.readyState);
        }

        const soundSetting = localStorage.getItem('calculator-sound');
        this.soundEnabled = soundSetting === null ? true : soundSetting !== 'false';
        console.log('Sound enabled:', this.soundEnabled);

        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.checked = this.soundEnabled;
            soundToggle.addEventListener('change', (e) => {
                this.soundEnabled = e.target.checked;
                localStorage.setItem('calculator-sound', this.soundEnabled);
                console.log('Sound toggled:', this.soundEnabled);
            });
        }

        this.mathFacts = [
            "The sum of numbers from 1 to 100 is 5050.",
            "Zero is the only number that can't be represented in Roman numerals.",
            "A 'googol' is 1 followed by 100 zeros.",
            "The word 'hundred' comes from the Old Norse word 'hundrath'.",
            "The equals sign (=) was invented in 1557 by Robert Recorde.",
            "Pi (π) has been calculated to over 31 trillion digits.",
            "Every odd number has an 'e' in its spelling.",
            "123456789 × 9 = 1111111101"
        ];
        
        this.currentFactIndex = 0;
        
        document.addEventListener('DOMContentLoaded', () => {
            this.setupMathFacts();
        });

        this.setupKeyboardShortcuts();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Prevent default behavior for these keys
            if (['Enter', 'Escape', 'Backspace', 'h', 'H'].includes(e.key)) {
                e.preventDefault();
            }

            switch(e.key) {
                case 'Enter':
                    // Calculate
                    this.calculate();
                    this.playClickSound();
                    break;
                    
                case 'Escape':
                    // Clear
                    this.clearAll();
                    this.playClickSound();
                    break;
                    
                case 'Backspace':
                    // Delete
                    this.delete();
                    this.playClickSound();
                    break;
                    
                case 'h':
                case 'H':
                    // Toggle History
                    this.toggleHistory();
                    this.playClickSound();
                    break;
            }
        });
    }

    toggleHistory() {
        const calculatorEl = document.querySelector('.calculator-inner');
        calculatorEl.classList.toggle('show-history');
        
        // Update history toggle button aria-label
        const historyToggle = document.getElementById('history-toggle');
        const isHistoryShown = calculatorEl.classList.contains('show-history');
        historyToggle.setAttribute('aria-label', 
            isHistoryShown ? 'hide history' : 'show history'
        );
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        document.querySelectorAll('.calc-keys button, .memory-buttons button').forEach(button => {
            button.addEventListener('click', (e) => {
                if (!e.target.classList.contains('control-btn')) {
                    this.addButtonAnimation(button);
                    this.playClickSound();
                }
                this.handleButton(e);
            });
        });

        if (this.historyList) {
            this.historyList.addEventListener('click', (e) => {
                if (e.target.tagName === 'LI') {
                    const calculation = e.target.textContent.split('=')[0].trim();
                    this.toggleHistory();
                    this.inputValue.innerText = calculation;
                    this.adjustDisplaySize();
                }
            });
        }

        const memoryButtons = {
            'mc': () => this.memoryClear(),
            'mr': () => this.memoryRecall(),
            'm-plus': () => this.memoryAdd(),
            'm-minus': () => this.memorySubtract(),
            'ms': () => this.memoryStore()
        };

        Object.entries(memoryButtons).forEach(([id, handler]) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', handler);
            }
        });

        const settingsElements = {
            'sound-toggle': (e) => {
                this.soundEnabled = e.target.checked;
                localStorage.setItem('calculator-sound', this.soundEnabled);
            },
            'keyboard-toggle': (e) => {
                this.keyboardEnabled = e.target.checked;
                localStorage.setItem('calculator-keyboard', this.keyboardEnabled);
                this.applySettings();
            },
            'auto-calculate': (e) => {
                this.autoCalculate = e.target.checked;
                localStorage.setItem('calculator-autoCalculate', this.autoCalculate);
                if (this.autoCalculate) {
                    this.setupAutoCalculate();
                } else {
                    this.removeAutoCalculate();
                }
            },
            'font-size': (e) => {
                this.fontSize = e.target.value;
                localStorage.setItem('calculator-fontSize', this.fontSize);
                this.applySettings();
            },
            'history-size': (e) => {
                this.historySize = parseInt(e.target.value) || 10;
                localStorage.setItem('calculator-historySize', this.historySize);
                this.trimHistory();
            },
            'theme-select': () => this.changeTheme(),
            'precision-input': () => this.changePrecision(),
            'educational-mode': () => this.toggleEducationalMode(),
            'export-history': () => this.exportHistory()
        };

        Object.entries(settingsElements).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(
                    element.type === 'checkbox' || element.tagName === 'SELECT' ? 'change' : 'click',
                    handler
                );
            }
        });

        if (this.isEducationalMode) {
            document.querySelectorAll('.calc-keys button').forEach(button => {
                button.addEventListener('mouseenter', (e) => this.showTooltip(e));
                button.addEventListener('mouseleave', () => this.hideTooltip());
            });
        }

        if (this.inputValue) {
            this.inputValue.addEventListener('dblclick', () => this.copyToClipboard());
        }

        const memoryDisplay = document.querySelector('.memory-display .copy-icon');
        if (memoryDisplay) {
            memoryDisplay.addEventListener('click', () => {
                navigator.clipboard.writeText(this.memory);
            });
        }

        const inputDisplay = document.querySelector('.calc-text .copy-icon');
        if (inputDisplay) {
            inputDisplay.addEventListener('click', () => {
                navigator.clipboard.writeText(this.currentInput);
            });
        }
    }

    handleKeyboard(event) {
        if (event.key >= '0' && event.key <= '9' || event.key === '.') {
            this.appendNumber(event.key);
        } else if (['+', '-', '*', '/'].includes(event.key)) {
            this.handleOperator(event.key);
        } else if (event.key === 'Enter') {
            this.compute();
        } else if (event.key === 'Backspace') {
            this.delete();
        } else if (event.key === 'Escape') {
            this.clear();
        }
    }

    addButtonAnimation(button) {
        button.classList.add('button-press');
        setTimeout(() => button.classList.remove('button-press'), 100);
    }

    playClickSound() {
        if (this.soundEnabled && this.clickSound) {
            console.log('Attempting to play click sound');
            this.clickSound.currentTime = 0;
            this.clickSound.play()
                .then(() => console.log('Click sound played successfully'))
                .catch(error => console.error('Error playing click sound:', error));
        }
        if (this.vibrationEnabled && navigator.vibrate) {
            navigator.vibrate(30);
        }
    }

    playErrorSound() {
        if (this.soundEnabled && this.errorSound) {
            console.log('Attempting to play error sound');
            this.errorSound.currentTime = 0;
            this.errorSound.play()
                .then(() => console.log('Error sound played successfully'))
                .catch(error => console.error('Error playing error sound:', error));
        }
    }

    handleButton(e) {
        const button = e.target;
        const value = button.textContent;

        console.log('Button clicked:', value);

        if (button.classList.contains('operations')) {
            if (value === '=') {
                this.compute();
            } else if (value === 'AC') {
                this.clearAll();
            } else if (value === 'DEL') {
                this.delete();
            } else {
                this.handleOperator(value);
            }
        } else if (button.classList.contains('numbers')) {
            this.appendNumber(value);
        }
        
        this.playClickSound();
    }

    appendNumber(number) {
        if (this.inputValue.innerText === '0' && number !== '.') {
            this.inputValue.innerText = number;
        } else {
            this.inputValue.innerText += number;
        }
        this.adjustDisplaySize();
    }

    handleOperator(operator) {
        const lastChar = this.inputValue.innerText.slice(-1);
        if (['+', '-', '*', '/', '%'].includes(lastChar)) {
            this.inputValue.innerText = this.inputValue.innerText.slice(0, -1) + operator;
        } else {
            this.inputValue.innerText += operator;
        }
        this.adjustDisplaySize();
    }

    compute() {
        try {
            const expression = this.inputValue.innerText;
            if (expression.includes('/0')) {
                throw new Error("Cannot divide by zero");
            }
            
            const result = this.formatResult(eval(expression));
            this.addToHistory(`${expression} = ${result}`);
            this.inputValue.innerText = result;
            
            // Add result animation
            this.inputValue.classList.add('result-animation');
            setTimeout(() => {
                this.inputValue.classList.remove('result-animation');
            }, 300);
            
            this.previewResult.style.opacity = '0';
            this.adjustDisplaySize();
        } catch (error) {
            this.handleError(error.message);
        }
    }

    formatResult(result) {
        return Number(parseFloat(result).toPrecision(this.precision));
    }

    clear() {
        this.inputValue.innerText = "0";
    }

    delete() {
        const current = this.inputValue.innerText;
        this.inputValue.innerText = current.slice(0, -1) || "0";
    }

    addToHistory(calculation) {
        const timestamp = this.timeFormat.format(new Date());
        const historyEntry = {
            calculation,
            timestamp,
            id: Date.now()
        };
        
        this.history.unshift(historyEntry);
        if (this.history.length > this.historySize) {
            this.history.pop();
        }
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        this.historyList.innerHTML = this.history
            .map(entry => `
                <li data-id="${entry.id}">
                    <span class="calculation">${entry.calculation}</span>
                    <span class="timestamp">${entry.timestamp}</span>
                </li>
            `)
            .join('');
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.inputValue.innerText);
            this.inputValue.style.opacity = 0.5;
            setTimeout(() => this.inputValue.style.opacity = 1, 200);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    adjustDisplaySize() {
        const display = this.inputValue;
        const fontSize = parseInt(window.getComputedStyle(display).fontSize);
        const maxWidth = display.parentElement.offsetWidth * 0.9;
        
        if (display.scrollWidth > maxWidth) {
            display.style.fontSize = `${fontSize - 1}px`;
        }
    }

    memoryClear() {
        this.memory = 0;
        this.memoryDisplay.textContent = '0';
        this.playClickSound();
    }

    memoryRecall() {
        this.inputValue.innerText = this.memory.toString();
        this.adjustDisplaySize();
        this.playClickSound();
    }

    memoryAdd() {
        try {
            const currentValue = eval(this.inputValue.innerText);
            this.memory += currentValue;
            this.memoryDisplay.textContent = this.formatResult(this.memory);
            this.playClickSound();
        } catch (error) {
            this.handleError("Invalid operation for memory addition");
        }
    }

    memorySubtract() {
        try {
            const currentValue = eval(this.inputValue.innerText);
            this.memory -= currentValue;
            this.memoryDisplay.textContent = this.formatResult(this.memory);
            this.playClickSound();
        } catch (error) {
            this.handleError("Invalid operation for memory subtraction");
        }
    }

    memoryStore() {
        try {
            this.memory = eval(this.inputValue.innerText);
            this.memoryDisplay.textContent = this.formatResult(this.memory);
            this.playClickSound();
        } catch (error) {
            this.handleError("Invalid value for memory storage");
        }
    }

    changeTheme() {
        document.documentElement.setAttribute('data-theme', this.themeSelect.value);
        localStorage.setItem('calculator-theme', this.themeSelect.value);
    }

    changePrecision() {
        this.precision = parseInt(this.precisionInput.value) || 8;
        localStorage.setItem('calculator-precision', this.precision);
    }

    toggleEducationalMode() {
        this.isEducationalMode = this.educationalMode.checked;
        localStorage.setItem('calculator-educational', this.isEducationalMode);
    }

    showTooltip(event) {
        if (!this.isEducationalMode) return;

        const button = event.target;
        const tooltips = {
            '+': 'Addition operator: Adds two numbers',
            '-': 'Subtraction operator: Subtracts second number from first',
            '*': 'Multiplication operator: Multiplies two numbers',
            '/': 'Division operator: Divides first number by second',
            '%': 'Percentage operator: Converts number to percentage',
            '=': 'Equals: Computes the result',
            'AC': 'All Clear: Resets the calculator',
            'DEL': 'Delete: Removes the last entered digit'
        };

        const tooltip = document.createElement('div');
        tooltip.className = 'edu-tooltip';
        tooltip.textContent = tooltips[button.textContent] || `Number ${button.textContent}`;
        document.body.appendChild(tooltip);

        const rect = button.getBoundingClientRect();
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
        tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;
        
        setTimeout(() => tooltip.classList.add('show'), 10);
    }

    hideTooltip() {
        const tooltip = document.querySelector('.edu-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    exportHistory() {
        const historyText = this.history.join('\n');
        const blob = new Blob([historyText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'calculator-history.txt';
        a.click();
        window.URL.revokeObjectURL(url);
    }

    handleError(message) {
        this.playErrorSound();
        this.inputValue.innerText = message;
        this.inputValue.classList.add('error-shake');
        setTimeout(() => {
            this.inputValue.classList.remove('error-shake');
            this.inputValue.innerText = "0";
            this.adjustDisplaySize();
        }, 2000);
    }

    loadSettings() {
        const theme = localStorage.getItem('calculator-theme') || 'default';
        const precision = localStorage.getItem('calculator-precision') || 8;
        const educational = localStorage.getItem('calculator-educational') === 'true';

        this.soundEnabled = localStorage.getItem('calculator-sound') !== 'false';
        console.log('Sound enabled:', this.soundEnabled);
        this.keyboardEnabled = localStorage.getItem('calculator-keyboard') !== 'false';
        this.autoCalculate = localStorage.getItem('calculator-autoCalculate') === 'true';
        this.historySize = parseInt(localStorage.getItem('calculator-historySize')) || 10;
        this.fontSize = localStorage.getItem('calculator-fontSize') || 'medium';

        this.themeSelect.value = theme;
        this.precisionInput.value = precision;
        this.educationalMode.checked = educational;
        document.getElementById('sound-toggle').checked = this.soundEnabled;
        document.getElementById('keyboard-toggle').checked = this.keyboardEnabled;
        document.getElementById('auto-calculate').checked = this.autoCalculate;
        document.getElementById('history-size').value = this.historySize;
        document.getElementById('font-size').value = this.fontSize;

        this.precision = parseInt(precision);
        this.isEducationalMode = educational;
        this.changeTheme();
        this.applySettings();
    }

    setupControlButtons() {
        this.calculatorInner = this.container.querySelector('.calculator-inner');

        this.historyToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('History button clicked');
            
            this.playClickSound();
            
            if (this.container.classList.contains('show-history')) {
                this.container.classList.remove('show-history');
                this.calculatorInner.style.transform = 'rotateY(0deg)';
            } else {
                this.container.classList.add('show-history');
                this.calculatorInner.style.transform = 'rotateY(180deg)';
                this.updateHistoryDisplay();
            }
            
            this.settingsPanel.classList.remove('show');
        });

        this.settingsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.settingsPanel.classList.toggle('show');
            this.container.classList.remove('show-history');
            this.calculatorInner.style.transform = 'rotateY(0deg)';
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.top-controls') && 
                !e.target.closest('.settings-panel') && 
                !e.target.closest('.calculator-back')) {
                this.resetControlButtons();
            }
        });
    }

    resetControlButtons() {
        this.container.classList.remove('show-history');
        this.calculatorInner.style.transform = 'rotateY(0deg)';
        this.settingsPanel.classList.remove('show');
    }

    toggleHistory() {
        if (this.container.classList.contains('show-history')) {
            this.container.classList.remove('show-history');
            this.calculatorInner.style.transform = 'rotateY(0deg)';
        } else {
            this.container.classList.add('show-history');
            this.calculatorInner.style.transform = 'rotateY(180deg)';
            this.updateHistoryDisplay();
        }
        this.settingsPanel.classList.remove('show');
    }

    applySettings() {
        this.inputValue.style.fontSize = this.getFontSize();
        
        if (this.keyboardEnabled) {
            document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        } else {
            document.removeEventListener('keydown', (e) => this.handleKeyboard(e));
        }
    }

    getFontSize() {
        const sizes = {
            'small': '2.5rem',
            'medium': '3.5rem',
            'large': '4.5rem'
        };
        return sizes[this.fontSize] || sizes.medium;
    }

    trimHistory() {
        if (this.history.length > this.historySize) {
            this.history = this.history.slice(0, this.historySize);
            this.updateHistoryDisplay();
        }
    }

    setupAutoCalculate() {
        this.inputValue.addEventListener('input', this.autoComputeHandler);
    }

    removeAutoCalculate() {
        this.inputValue.removeEventListener('input', this.autoComputeHandler);
    }

    autoComputeHandler = () => {
        const expression = this.inputValue.innerText;
        
        try {
            if (expression && !expression.match(/[+\-*/]$/)) {
                const result = this.formatResult(eval(expression));
                
                this.previewResult.innerText = `= ${result}`;
                this.previewResult.style.opacity = '1';
            } else {
                this.previewResult.style.opacity = '0';
            }
        } catch (error) {
            this.previewResult.style.opacity = '0';
        }
    }

    setupScientificMode() {
        this.calculatorMode.addEventListener('change', () => {
            this.isScientificMode = this.calculatorMode.value === 'scientific';
            this.scientificButtons.classList.toggle('hidden', !this.isScientificMode);
            this.container.classList.toggle('scientific-mode', this.isScientificMode);
            localStorage.setItem('calculator-mode', this.calculatorMode.value);
        });

        document.querySelectorAll('.sci-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const operation = btn.dataset.operation;
                this.handleScientificOperation(operation);
            });
        });

        const savedMode = localStorage.getItem('calculator-mode') || 'basic';
        this.calculatorMode.value = savedMode;
        this.calculatorMode.dispatchEvent(new Event('change'));
    }

    handleScientificOperation(operation) {
        const currentValue = this.inputValue.innerText;
        let result;

        switch(operation) {
            case 'sin':
            case 'cos':
            case 'tan':
                result = Math[operation](parseFloat(currentValue) * Math.PI / 180);
                break;
            case 'sqrt':
                result = Math.sqrt(parseFloat(currentValue));
                break;
            case 'log':
                result = Math.log10(parseFloat(currentValue));
                break;
            case 'ln':
                result = Math.log(parseFloat(currentValue));
                break;
            case 'pi':
                result = Math.PI;
                break;
            case 'e':
                result = Math.E;
                break;
            case '(':
            case ')':
                this.appendNumber(operation);
                return;
            case 'pow':
                this.appendNumber('^');
                return;
        }

        if (result !== undefined) {
            this.inputValue.innerText = this.formatResult(result);
            this.adjustDisplaySize();
        }
    }

    setupThemeCreator() {
        this.createThemeBtn.addEventListener('click', () => {
            this.themeModal.classList.add('show');
        });

        this.cancelThemeBtn.addEventListener('click', () => {
            this.themeModal.classList.remove('show');
        });

        this.saveThemeBtn.addEventListener('click', () => {
            const themeName = document.getElementById('theme-name').value;
            const colors = {
                primary: document.getElementById('primary-color').value,
                secondary: document.getElementById('secondary-color').value,
                accent: document.getElementById('accent-color').value
            };

            this.addCustomTheme(themeName, colors);
            this.themeModal.classList.remove('show');
        });

        this.themeModal.addEventListener('click', (e) => {
            if (e.target === this.themeModal) {
                this.themeModal.classList.remove('show');
            }
        });

        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            const lightThemeOption = themeSelect.querySelector('option[value="light"]');
            if (lightThemeOption) {
                lightThemeOption.remove();
            }
        }
    }

    addCustomTheme(name, colors) {
        if (!name) return;
        
        this.customThemes[name] = colors;
        localStorage.setItem('calculator-custom-themes', JSON.stringify(this.customThemes));
        
        const option = document.createElement('option');
        option.value = `custom-${name}`;
        option.textContent = name;
        this.themeSelect.appendChild(option);
        
        this.themeSelect.value = `custom-${name}`;
        this.applyTheme(colors);
    }

    applyTheme(colors) {
        document.documentElement.style.setProperty('--primary-color', colors.primary);
        document.documentElement.style.setProperty('--secondary-color', colors.secondary);
        document.documentElement.style.setProperty('--accent-color', colors.accent);
    }

    setupTouchGestures() {
        let touchStartY = 0;
        let touchEndY = 0;

        this.settingsPanel.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        });

        this.settingsPanel.addEventListener('touchmove', (e) => {
            touchEndY = e.touches[0].clientY;
            const diff = touchEndY - touchStartY;
            
            if (diff > 0) { 
                this.settingsPanel.style.transform = `translateY(${diff}px)`;
            }
        });

        this.settingsPanel.addEventListener('touchend', () => {
            const diff = touchEndY - touchStartY;
            if (diff > 50) { 
                this.settingsPanel.classList.remove('show');
            }
            this.settingsPanel.style.transform = '';
        });
    }

    clearAll() {
        this.inputValue.innerText = '0';
        this.currentOperand = '';
        this.previousOperand = '';
        this.operation = undefined;
        this.adjustDisplaySize();
        
        if (this.previewResult) {
            this.previewResult.style.opacity = '0';
        }
    }

    delete() {
        if (this.inputValue.textContent.length === 1) {
            this.inputValue.textContent = '0';
        } else {
            this.inputValue.textContent = this.inputValue.textContent.slice(0, -1);
        }
        this.currentOperand = this.inputValue.textContent;
    }

    setupErrorTracking() {
        window.onerror = (msg, url, lineNo, columnNo, error) => {
            console.error('Error: ', msg, url, lineNo, columnNo, error);
        }
    }

    setupAnalytics() {
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                this.trackEvent('button_click', {
                    button_type: button.className,
                    button_value: button.textContent
                });
            });
        });
    }

    trackEvent(eventName, params = {}) {
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, params);
        }
    }

    setupMathFacts() {
        const mathFactsElement = document.querySelector('.math-facts');
        const nextFactButton = document.querySelector('.next-fact');
        const currentFactElement = document.getElementById('current-fact');

        if (mathFactsElement && nextFactButton && currentFactElement) {
            mathFactsElement.classList.add('show');

            nextFactButton.addEventListener('click', () => {
                this.currentFactIndex = (this.currentFactIndex + 1) % this.mathFacts.length;
                currentFactElement.textContent = this.mathFacts[this.currentFactIndex];
            });
        }
    }

    async setupCurrencyConverter() {
        const rates = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const currencyConverter = (amount, from, to) => {
            // Convert currencies
        };
    }
}

class AdvancedCalculator extends Calculator {
    constructor() {
        super();
        this.setupMatrixOperations();
        this.setupEquationSolver();
    }

    setupMatrixOperations() {
        this.matrixOperations = {
            add: (matrix1, matrix2) => {
            },
            multiply: (matrix1, matrix2) => {
            },
            determinant: (matrix) => {
            }
        };
    }

    setupEquationSolver() {
        this.equationSolver = {
            linear: (a, b) => {
                return -b / a;
            },
            quadratic: (a, b, c) => {
                const discriminant = Math.sqrt(b * b - 4 * a * c);
                return [
                    (-b + discriminant) / (2 * a),
                    (-b - discriminant) / (2 * a)
                ];
            }
        };
    }
}

class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.worker = new Worker('./calc-worker.js');
        this.setupWorkerHandling();
        this.setupServiceWorker();
    }

    setupWorkerHandling() {
        this.worker.onmessage = (e) => {
            // Handle worker messages with proper cleanup
            const response = e.data;
            if (response.type === 'calculation_complete') {
                // Process the calculation result
                return response.result;
            }
        };

        window.addEventListener('unload', () => {
            if (this.worker) {
                this.worker.terminate();
            }
        });
    }

    offloadCalculation(calculation) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Calculation timed out'));
            }, 5000);

            this.worker.postMessage({ type: 'calculate', calculation });
            
            this.worker.onmessage = (e) => {
                clearTimeout(timeout);
                resolve(e.data);
            };
            
            this.worker.onerror = (e) => {
                clearTimeout(timeout);
                reject(e);
            };
        });
    }
}

class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.setupPerformanceObserver();
    }

    setupPerformanceObserver() {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                this.metrics[entry.name] = entry.duration;
            }
        });

        observer.observe({ entryTypes: ['measure'] });
    }

    measureOperation(name, operation) {
        performance.mark(`${name}-start`);
        const result = operation();
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        return result;
    }
}

// Formula Library Data
const formulas = {
    'Basic Math': {
        'Square': 'x²',
        'Cube': 'x³',
        'Square Root': '√x',
        'Cube Root': '∛x',
        'Reciprocal': '1/x',
        'Percentage': 'x/100'
    },
    'Geometry': {
        'Circle Area': 'πr²',
        'Circle Circumference': '2πr',
        'Square Area': 'a²',
        'Rectangle Area': 'l × w',
        'Triangle Area': '(b × h)/2',
        'Sphere Volume': '(4/3)πr³'
    },
    'Algebra': {
        'Quadratic Formula': '(-b ± √(b² - 4ac))/2a',
        'Linear Equation': 'y = mx + b',
        'Slope': '(y₂ - y₁)/(x₂ - x₁)',
        'Distance': '√((x₂-x₁)² + (y₂-y₁)²)'
    },
    'Trigonometry': {
        'Sine Law': 'a/sin(A) = b/sin(B) = c/sin(C)',
        'Cosine Law': 'c² = a² + b² - 2ab×cos(C)',
        'Area of Triangle': '(1/2)ab×sin(C)'
    }
};

// Initialize Formula Library
function initFormulaLibrary() {
    const categorySelect = document.getElementById('formula-category');
    const formulaDisplay = document.getElementById('formula-display');

    // Populate categories
    for (let category in formulas) {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    }

    // Initial display
    displayFormulas(categorySelect.value);

    // Add change event listener
    categorySelect.addEventListener('change', (e) => {
        displayFormulas(e.target.value);
    });
}

// Display formulas for selected category
function displayFormulas(category) {
    const formulaDisplay = document.getElementById('formula-display');
    formulaDisplay.innerHTML = '';

    const title = document.createElement('h4');
    title.textContent = category;
    formulaDisplay.appendChild(title);

    for (let formula in formulas[category]) {
        const formulaDiv = document.createElement('div');
        formulaDiv.className = 'formula-item';
        
        const formulaText = document.createElement('div');
        formulaText.className = 'formula-text';
        formulaText.textContent = `${formula}: ${formulas[category][formula]}`;
        
        const useButton = document.createElement('button');
        useButton.className = 'use-formula';
        useButton.textContent = 'Use';
        useButton.onclick = () => useFormula(formulas[category][formula]);
        
        formulaDiv.appendChild(formulaText);
        formulaDiv.appendChild(useButton);
        formulaDisplay.appendChild(formulaDiv);
    }
}

// Function to use selected formula
function useFormula(formula) {
    // Get the calculator display element
    const display = document.querySelector('.calc-text');
    const input = display.querySelector('#user-input');
    
    if (!input) {
        console.error('Calculator input element not found');
        return;
    }

    try {
        // Insert formula at cursor position or append to end
        const cursorPos = input.selectionStart || input.value.length;
        const currentValue = input.value || '';
        
        // Ensure we're working with strings
        const newValue = currentValue.toString().slice(0, cursorPos) + 
                        formula.toString() + 
                        currentValue.toString().slice(cursorPos);
        
        input.value = newValue;
        
        // Update calculator display if needed
        if (typeof updateDisplay === 'function') {
            updateDisplay();
        }
        
        // Focus back on input and set cursor position after formula
        input.focus();
        const newCursorPos = cursorPos + formula.toString().length;
        input.setSelectionRange(newCursorPos, newCursorPos);
    } catch (error) {
        console.error('Error inserting formula:', error);
    }
}

// Call initialization when document is ready
document.addEventListener('DOMContentLoaded', initFormulaLibrary);

const calculator = new AdvancedCalculator(); 