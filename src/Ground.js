/**
 * Ground.js
 * Light blue ground plane with a plus-sign / grid pattern
 */

import * as THREE from 'three'

export class Ground {
    constructor(scene, physicsWorld, RAPIER) {
        this.scene = scene

        this.createVisual()
        this.createPhysics(physicsWorld, RAPIER)
    }

    createVisual() {
        const size = 200

        // ── Generate a plus-sign grid pattern texture via Canvas ──
        const texSize = 512
        const canvas = document.createElement('canvas')
        canvas.width = texSize
        canvas.height = texSize
        const ctx = canvas.getContext('2d')

        // Base color — light blue
        ctx.fillStyle = '#b8d4e3'
        ctx.fillRect(0, 0, texSize, texSize)

        // Draw grid of plus signs
        const cellSize = 32
        const plusArm = 8     // half-length of each arm
        const plusThick = 1.5 // half-thickness of each arm

        ctx.fillStyle = 'rgba(140, 180, 210, 0.6)' // slightly darker blue for the plus signs

        for (let x = cellSize / 2; x < texSize; x += cellSize) {
            for (let y = cellSize / 2; y < texSize; y += cellSize) {
                // Vertical bar of plus
                ctx.fillRect(x - plusThick, y - plusArm, plusThick * 2, plusArm * 2)
                // Horizontal bar of plus
                ctx.fillRect(x - plusArm, y - plusThick, plusArm * 2, plusThick * 2)
            }
        }

        // Draw subtle grid lines
        ctx.strokeStyle = 'rgba(160, 195, 220, 0.35)'
        ctx.lineWidth = 0.5
        for (let i = 0; i <= texSize; i += cellSize) {
            ctx.beginPath()
            ctx.moveTo(i, 0)
            ctx.lineTo(i, texSize)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(0, i)
            ctx.lineTo(texSize, i)
            ctx.stroke()
        }

        const texture = new THREE.CanvasTexture(canvas)
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(size / 4, size / 4)
        texture.magFilter = THREE.NearestFilter
        texture.minFilter = THREE.LinearMipmapLinearFilter

        // ── Ground plane ──
        const geometry = new THREE.PlaneGeometry(size, size)
        geometry.rotateX(-Math.PI / 2)

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            color: 0xffffff,
            roughness: 0.75,
            metalness: 0.0,
        })

        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.receiveShadow = true
        this.scene.add(this.mesh)
    }

    createPhysics(world, RAPIER) {
        const groundColliderDesc = RAPIER.ColliderDesc.cuboid(100, 0.5, 100)
            .setTranslation(0, -0.5, 0)
            .setFriction(0.7)
            .setRestitution(0.1)

        world.createCollider(groundColliderDesc)
    }
}
