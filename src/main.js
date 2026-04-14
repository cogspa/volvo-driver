/**
 * main.js
 * Entry point — initializes Three.js, Rapier physics, loads the car, runs the game loop
 */

import * as THREE from 'three'
import { Controls } from './Controls.js'
import { Ground } from './Ground.js'
import { Vehicle } from './Vehicle.js'
import { Camera } from './Camera.js'

async function init() {
    // ─── Rapier Physics (must be loaded async) ───────────────────────
    const RAPIER = await import('@dimforge/rapier3d')

    // ─── Renderer ────────────────────────────────────────────────────
    const canvas = document.getElementById('game-canvas')
    const speedValueEl = document.getElementById('speed-value')

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2

    // ─── Scene ───────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xc8dce8)
    scene.fog = new THREE.Fog(0xc8dce8, 50, 150)

    // ─── Lighting ────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x8899aa, 1.2)
    scene.add(ambientLight)

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0xb8d4e3, 1.0)
    scene.add(hemiLight)

    const dirLight = new THREE.DirectionalLight(0xffeedd, 3.0)
    dirLight.position.set(15, 20, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048
    dirLight.shadow.camera.near = 1
    dirLight.shadow.camera.far = 80
    dirLight.shadow.camera.left = -25
    dirLight.shadow.camera.right = 25
    dirLight.shadow.camera.top = 25
    dirLight.shadow.camera.bottom = -25
    dirLight.shadow.bias = -0.0005
    scene.add(dirLight)

    const shadowTarget = new THREE.Object3D()
    scene.add(shadowTarget)
    dirLight.target = shadowTarget

    // ─── Physics World ───────────────────────────────────────────────
    const gravity = { x: 0, y: -9.81, z: 0 }
    const world = new RAPIER.World(gravity)

    // ─── Game Objects ────────────────────────────────────────────────
    const controls = new Controls()
    const chaseCamera = new Camera(renderer)
    scene.add(chaseCamera.camera)

    const ground = new Ground(scene, world, RAPIER)

    const vehicle = new Vehicle(scene, world, RAPIER)
    
    try {
        await vehicle.load('/vehicle/default.glb')
        console.log('✅ Vehicle loaded successfully')
        console.log('   Parts found:', Object.keys(vehicle.parts))
    } catch (err) {
        console.error('❌ Failed to load vehicle:', err)
    }

    // ─── Resize ──────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    })

    // ─── Game Loop ───────────────────────────────────────────────────
    const clock = new THREE.Clock()
    let previousTime = 0

    function gameLoop() {
        requestAnimationFrame(gameLoop)

        const elapsedTime = clock.getElapsedTime()
        const deltaTime = elapsedTime - previousTime
        previousTime = elapsedTime

        // Cap delta to avoid spiral of death
        const dt = Math.min(deltaTime, 1 / 20)

        // Input
        controls.update()

        // Reset
        if (controls.reset) {
            vehicle.reset()
        }

        // Physics pre-step (apply forces)
        vehicle.updatePrePhysics(controls, dt)

        // Step physics world
        world.step()

        // Physics post-step (read positions)
        vehicle.updatePostPhysics(dt)

        // Camera follow
        chaseCamera.setTarget(vehicle.position)
        chaseCamera.update(dt)

        // Move shadow to follow vehicle
        shadowTarget.position.copy(vehicle.position)
        dirLight.position.set(
            vehicle.position.x + 15,
            20,
            vehicle.position.z + 10
        )

        // HUD
        if (speedValueEl) {
            speedValueEl.textContent = vehicle.getDisplaySpeed()
        }

        // Render
        renderer.render(scene, chaseCamera.camera)
    }

    gameLoop()
    console.log('🚗 Volvo Driver — Game loop started')
}

init().catch(err => {
    console.error('Fatal error during init:', err)
})
