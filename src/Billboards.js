/**
 * Billboards.js
 * Advertising billboards scattered throughout the world
 */

import * as THREE from 'three'

export class Billboards {
    constructor(scene, physicsWorld, RAPIER) {
        this.scene = scene

        // Load the billboard texture
        const textureLoader = new THREE.TextureLoader()
        this.texture = textureLoader.load('/textures/billboard.png')
        this.texture.colorSpace = THREE.SRGBColorSpace

        this.createBillboards(physicsWorld, RAPIER)
    }

    createBillboards(world, RAPIER) {
        const billboardCount = 20
        const spreadRadius = 70

        const width = 6
        const height = 4
        const depth = 0.15
        const postWidth = 0.25
        const postHeight = 0.5

        // Helper to place a single billboard
        const placeBillboard = (x, z, rotationY) => {
            const panelGeometry = new THREE.BoxGeometry(width, height, depth)

            const edgeMaterial = new THREE.MeshStandardMaterial({
                color: 0x444444, roughness: 0.8, metalness: 0.2,
            })
            const adMaterial = new THREE.MeshStandardMaterial({
                map: this.texture, roughness: 0.5, metalness: 0.0,
            })

            const panelMaterials = [
                edgeMaterial, edgeMaterial,
                edgeMaterial, edgeMaterial,
                adMaterial, adMaterial,
            ]

            const panelMesh = new THREE.Mesh(panelGeometry, panelMaterials)
            panelMesh.position.set(x, postHeight + height / 2, z)
            panelMesh.rotation.y = rotationY
            panelMesh.castShadow = true
            panelMesh.receiveShadow = true
            this.scene.add(panelMesh)

            const postGeometry = new THREE.BoxGeometry(postWidth, postHeight, postWidth)
            const postMaterial = new THREE.MeshStandardMaterial({
                color: 0x555555, roughness: 0.9, metalness: 0.3,
            })
            const postMesh = new THREE.Mesh(postGeometry, postMaterial)
            postMesh.position.set(x, postHeight / 2, z)
            postMesh.castShadow = true
            postMesh.receiveShadow = true
            this.scene.add(postMesh)

            const postColliderDesc = RAPIER.ColliderDesc.cuboid(
                postWidth / 2, (postHeight + height) / 2, postWidth / 2
            )
                .setTranslation(x, (postHeight + height) / 2, z)
                .setFriction(0.3)
                .setRestitution(0.2)
            world.createCollider(postColliderDesc)
        }

        // ── Starter billboard — right side of screen at launch ──
        placeBillboard(4, -7, Math.PI * 0.75)

        // ── Random billboards throughout the world (discovered while driving) ──
        for (let i = 0; i < billboardCount; i++) {
            let x, z
            do {
                x = (Math.random() - 0.5) * spreadRadius * 2
                z = (Math.random() - 0.5) * spreadRadius * 2
            } while (Math.abs(x) < 20 && Math.abs(z) < 20)

            placeBillboard(x, z, Math.random() * Math.PI * 2)
        }
    }
}
