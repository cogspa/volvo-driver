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

        // Billboard dimensions (tall portrait-style ad boards)
        const width = 6
        const height = 8
        const depth = 0.2

        // Post dimensions
        const postWidth = 0.3
        const postHeight = 3

        for (let i = 0; i < billboardCount; i++) {
            // Random position (avoid car spawn area)
            let x, z
            do {
                x = (Math.random() - 0.5) * spreadRadius * 2
                z = (Math.random() - 0.5) * spreadRadius * 2
            } while (Math.abs(x) < 10 && Math.abs(z) < 10)

            // Random rotation (face random direction)
            const rotationY = Math.random() * Math.PI * 2

            // ── Billboard panel (the ad itself) ──
            const panelGeometry = new THREE.BoxGeometry(width, height, depth)
            
            // Create materials: ad texture on front and back, grey edges
            const edgeMaterial = new THREE.MeshStandardMaterial({
                color: 0x444444,
                roughness: 0.8,
                metalness: 0.2,
            })
            
            const adMaterial = new THREE.MeshStandardMaterial({
                map: this.texture,
                roughness: 0.5,
                metalness: 0.0,
            })

            // Box materials: [+x, -x, +y, -y, +z (front), -z (back)]
            const panelMaterials = [
                edgeMaterial, // right edge
                edgeMaterial, // left edge
                edgeMaterial, // top edge
                edgeMaterial, // bottom edge
                adMaterial,   // front face (the ad)
                adMaterial,   // back face (the ad)
            ]

            const panelMesh = new THREE.Mesh(panelGeometry, panelMaterials)
            panelMesh.position.set(x, postHeight + height / 2, z)
            panelMesh.rotation.y = rotationY
            panelMesh.castShadow = true
            panelMesh.receiveShadow = true
            this.scene.add(panelMesh)

            // ── Support post ──
            const postGeometry = new THREE.BoxGeometry(postWidth, postHeight, postWidth)
            const postMaterial = new THREE.MeshStandardMaterial({
                color: 0x555555,
                roughness: 0.9,
                metalness: 0.3,
            })

            const postMesh = new THREE.Mesh(postGeometry, postMaterial)
            postMesh.position.set(x, postHeight / 2, z)
            postMesh.castShadow = true
            postMesh.receiveShadow = true
            this.scene.add(postMesh)

            // ── Physics collider for the post (so car can bump into it) ──
            const postColliderDesc = RAPIER.ColliderDesc.cuboid(
                postWidth / 2,
                (postHeight + height) / 2,
                postWidth / 2
            )
                .setTranslation(x, (postHeight + height) / 2, z)
                .setFriction(0.3)
                .setRestitution(0.2)

            world.createCollider(postColliderDesc)
        }
    }
}
