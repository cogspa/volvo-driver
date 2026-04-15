/**
 * Controls.js
 * Keyboard input handler for WASD/Arrow driving controls
 */

export class Controls {
    constructor() {
        this.keys = {}
        this.accelerating = 0   // -1 to 1
        this.steering = 0       // -1 to 1
        this.braking = false
        this.boosting = false
        this.reset = false

        this._onKeyDown = this._onKeyDown.bind(this)
        this._onKeyUp = this._onKeyUp.bind(this)

        window.addEventListener('keydown', this._onKeyDown)
        window.addEventListener('keyup', this._onKeyUp)

        // Wait a tick for the DOM to be ready, then set up touch bounds
        setTimeout(() => this._setupTouch(), 0)
    }

    _onKeyDown(e) {
        this.keys[e.code] = true
    }

    _onKeyUp(e) {
        this.keys[e.code] = false
        if (e.code === 'KeyR') this.reset = false
    }

    _setupTouch() {
        const btnFwd = document.getElementById('touch-fwd')
        const btnRev = document.getElementById('touch-rev')
        const btnLeft = document.getElementById('touch-left')
        const btnRight = document.getElementById('touch-right')

        if (!btnFwd) return

        const bindTouch = (el, code) => {
            el.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[code] = true })
            el.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[code] = false })
        }

        bindTouch(btnFwd, 'KeyW')
        bindTouch(btnRev, 'KeyS')
        bindTouch(btnLeft, 'KeyA')
        bindTouch(btnRight, 'KeyD')
    }

    update() {
        // Acceleration
        const forward = this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0
        const backward = this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0
        this.accelerating = forward - backward

        // Steering
        const left = this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0
        const right = this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0
        this.steering = right - left

        // Boost
        this.boosting = !!this.keys['Space']

        // Brake
        this.braking = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight']

        // Reset
        this.reset = !!this.keys['KeyR']
    }

    destroy() {
        window.removeEventListener('keydown', this._onKeyDown)
        window.removeEventListener('keyup', this._onKeyUp)
    }
}
