/**
 * Ground.js
 * Light blue ground plane with a plus-sign / grid pattern + scattered colored cubes
 */

import * as THREE from 'three'

export class Ground {
    constructor(scene, physicsWorld, RAPIER) {
        this.scene = scene

        this.createVisual()
        this.createPhysics(physicsWorld, RAPIER)
        this.createCubes(physicsWorld, RAPIER)
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
        const plusArm = 8
        const plusThick = 1.5

        ctx.fillStyle = 'rgba(140, 180, 210, 0.6)'

        for (let x = cellSize / 2; x < texSize; x += cellSize) {
            for (let y = cellSize / 2; y < texSize; y += cellSize) {
                ctx.fillRect(x - plusThick, y - plusArm, plusThick * 2, plusArm * 2)
                ctx.fillRect(x - plusArm, y - plusThick, plusArm * 2, plusThick * 2)
            }
        }

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

    createCubes(world, RAPIER) {
        // Vibrant color palette for the cubes
        const colors = [
            0xff4466,  // coral red
            0x44bbff,  // sky blue
            0xffcc33,  // golden yellow
            0x66ff88,  // mint green
            0xaa55ff,  // purple
            0xff8833,  // orange
            0xff66aa,  // pink
            0x33ddcc,  // teal
            0x88ff44,  // lime
            0x5588ff,  // royal blue
        ]

        const cubeCount = 120
        const spreadRadius = 80  // how far from center cubes can spawn

        // Shared geometry — we vary the scale per instance
        const baseGeometry = new THREE.BoxGeometry(1, 1, 1)

        // Helper to place a single cube (visual + physics)
        const placeCube = (x, z, sizeX, sizeY, sizeZ, color) => {
            const material = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.4,
                metalness: 0.1,
            })
            const mesh = new THREE.Mesh(baseGeometry, material)
            mesh.scale.set(sizeX, sizeY, sizeZ)
            mesh.position.set(x, sizeY / 2, z)
            mesh.rotation.y = Math.random() * Math.PI * 2
            mesh.castShadow = true
            mesh.receiveShadow = true
            this.scene.add(mesh)

            const colliderDesc = RAPIER.ColliderDesc.cuboid(sizeX / 2, sizeY / 2, sizeZ / 2)
                .setTranslation(x, sizeY / 2, z)
                .setRotation({ x: 0, y: Math.sin(mesh.rotation.y / 2), z: 0, w: Math.cos(mesh.rotation.y / 2) })
                .setFriction(0.5)
                .setRestitution(0.3)
            world.createCollider(colliderDesc)
        }

        // ── Starter cubes near spawn (car starts at 0,0,0 facing +X) ──
        placeCube(-4,  3, 1.0, 1.5, 1.0, 0x44bbff)   // behind-left
        placeCube(-4, -3, 1.2, 2.0, 1.2, 0xff4466)   // behind-right
        placeCube(-3,  0, 0.8, 1.0, 0.8, 0xffcc33)   // directly behind
        placeCube( 5,  4, 1.0, 1.8, 1.0, 0x66ff88)   // ahead-left
        placeCube( 5, -4, 0.9, 1.4, 0.9, 0xaa55ff)   // ahead-right
        placeCube( 8,  0, 1.5, 2.5, 1.5, 0xff8833)   // further ahead

        // ── Random cubes throughout the world ──
        for (let i = 0; i < cubeCount; i++) {
            let x, z
            do {
                x = (Math.random() - 0.5) * spreadRadius * 2
                z = (Math.random() - 0.5) * spreadRadius * 2
            } while (Math.abs(x) < 6 && Math.abs(z) < 6) // keep a clear area around spawn

            // Random size
            const sizeX = 0.5 + Math.random() * 1.5
            const sizeY = 0.5 + Math.random() * 2.5
            const sizeZ = 0.5 + Math.random() * 1.5

            // Random color from palette
            const color = colors[Math.floor(Math.random() * colors.length)]

            // Visual cube
            const material = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.4,
                metalness: 0.1,
            })

            const mesh = new THREE.Mesh(baseGeometry, material)
            mesh.scale.set(sizeX, sizeY, sizeZ)
            mesh.position.set(x, sizeY / 2, z)
            mesh.rotation.y = Math.random() * Math.PI * 2
            mesh.castShadow = true
            mesh.receiveShadow = true
            this.scene.add(mesh)

            // Physics collider (static — cubes don't move)
            const halfX = sizeX / 2
            const halfY = sizeY / 2
            const halfZ = sizeZ / 2

            const colliderDesc = RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ)
                .setTranslation(x, halfY, z)
                .setRotation({ x: 0, y: Math.sin(mesh.rotation.y / 2), z: 0, w: Math.cos(mesh.rotation.y / 2) })
                .setFriction(0.5)
                .setRestitution(0.3)

            world.createCollider(colliderDesc)
        }
    }
}
