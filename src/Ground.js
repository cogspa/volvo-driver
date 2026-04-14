/**
 * Ground.js
 * Dark grid plane with Rapier static collider
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

        // Main ground plane — dark surface
        const geometry = new THREE.PlaneGeometry(size, size)
        geometry.rotateX(-Math.PI / 2)

        const material = new THREE.MeshStandardMaterial({
            color: 0x111118,
            roughness: 0.85,
            metalness: 0.1,
        })

        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.receiveShadow = true
        this.scene.add(this.mesh)

        // Grid overlay
        const gridHelper = new THREE.GridHelper(size, 100, 0x222233, 0x1a1a28)
        gridHelper.position.y = 0.01
        gridHelper.material.transparent = true
        gridHelper.material.opacity = 0.4
        this.scene.add(gridHelper)

        // Subtle center cross for orientation
        const crossGrid = new THREE.GridHelper(size, 10, 0x334466, 0x1a1a28)
        crossGrid.position.y = 0.02
        crossGrid.material.transparent = true
        crossGrid.material.opacity = 0.15
        this.scene.add(crossGrid)
    }

    createPhysics(world, RAPIER) {
        // Static ground collider — infinite flat plane at y=0
        const groundColliderDesc = RAPIER.ColliderDesc.cuboid(100, 0.5, 100)
            .setTranslation(0, -0.5, 0)
            .setFriction(0.7)
            .setRestitution(0.1)

        world.createCollider(groundColliderDesc)
    }
}
