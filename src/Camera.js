/**
 * Camera.js
 * Isometric-style chase camera that smoothly follows the vehicle
 */

import * as THREE from 'three'

export class Camera {
    constructor(renderer) {
        this.camera = new THREE.PerspectiveCamera(
            25,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        )

        // Isometric-ish offset (matches the folio-2025 feel)
        this.sphericalPhi = Math.PI * 0.31        // elevation angle
        this.sphericalTheta = Math.PI * 0.25       // rotation angle
        this.radius = 25
        this.smoothing = 5

        this.targetPosition = new THREE.Vector3()
        this.smoothedTarget = new THREE.Vector3()
        this.offset = new THREE.Vector3()
        this._updateOffset()

        // Initial position
        this.camera.position.copy(this.offset)
        this.camera.lookAt(0, 0, 0)

        // Resize handler
        this._onResize = () => {
            this.camera.aspect = window.innerWidth / window.innerHeight
            this.camera.updateProjectionMatrix()
        }
        window.addEventListener('resize', this._onResize)
    }

    _updateOffset() {
        this.offset.setFromSphericalCoords(
            this.radius,
            this.sphericalPhi,
            this.sphericalTheta
        )
    }

    setTarget(position) {
        this.targetPosition.set(position.x, 0, position.z)
    }

    update(deltaTime) {
        // Smooth follow
        const lerpFactor = 1 - Math.exp(-this.smoothing * deltaTime)
        this.smoothedTarget.lerp(this.targetPosition, lerpFactor)

        // Position camera at offset from smoothed target
        this.camera.position.copy(this.smoothedTarget).add(this.offset)
        this.camera.lookAt(this.smoothedTarget)
    }

    destroy() {
        window.removeEventListener('resize', this._onResize)
    }
}
