/**
 * Vehicle.js
 * Loads the Volvo GLB model and creates a Rapier vehicle controller
 * with 4 wheels, matching the folio-2025 physics setup.
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export class Vehicle {
    constructor(scene, physicsWorld, RAPIER) {
        this.scene = scene
        this.world = physicsWorld
        this.RAPIER = RAPIER

        // Visual parts
        this.parts = {}
        this.chassisGroup = null
        this.wheels = { items: [], steering: 0 }

        // Physics
        this.chassisBody = null
        this.controller = null

        // State
        this.position = new THREE.Vector3(0, 4, 0)
        this.quaternion = new THREE.Quaternion()
        this.speed = 0
        this.forwardSpeed = 0
        this.goingForward = true

        // Tuning (matches folio-2025 PhysicsVehicle.js)
        this.steeringAmplitude = 0.5
        this.engineForceAmplitude = 300
        this.boostMultiplier = 2
        this.topSpeed = 5
        this.topSpeedBoost = 40
        this.brakeAmplitude = 35
        this.idleBrake = 0.06
        this.reverseBrake = 0.4

        // Flip detection
        this.upward = new THREE.Vector3(0, 1, 0)
        this.flipTimer = 0
        this.flipThreshold = 1.5 // seconds upside-down before auto-unflip

        this.ready = false
    }

    async load(url) {
        const loader = new GLTFLoader()
        const gltf = await loader.loadAsync(url)
        const model = gltf.scene

        console.log('GLB loaded, root children:', model.children.map(c => c.name))
        model.traverse(child => {
            console.log(`  ↳ ${child.name} (${child.type})`)
        })

        this._extractParts(model)
        this._createPhysics()
        this._createWheels()

        this.ready = true
    }

    _extractParts(model) {
        const searchList = [
            'bodyPainted', 'bodypainted',
            'chassis',
            'blinkerLeft',
            'blinkerRight',
            'stopLights',
            'backLights',
            'wheelContainer',
            'antenna',
            'cell1', 'cell2', 'cell3',
            'energy',
        ]

        const regexList = searchList.map(name => new RegExp(`^(${name})`, 'i'))

        model.traverse((child) => {
            if (child.isMesh) {
                child.receiveShadow = true
                child.castShadow = true
            }

            for (const regex of regexList) {
                const match = child.name.match(regex)
                if (match) {
                    this.parts[match[0].toLowerCase()] = child
                }
            }
        })

        console.log('Parts found:', Object.keys(this.parts))

        // Setup chassis — look for 'chassis' first
        const chassisKey = Object.keys(this.parts).find(k => k.startsWith('chassis'))
        if (chassisKey) {
            this.chassisGroup = this.parts[chassisKey]
            this.chassisGroup.rotation.reorder('YXZ')
            this.scene.add(this.chassisGroup)
        } else {
            // Fallback: use the entire model as chassis
            console.warn('No "chassis" group found, using entire model')
            this.chassisGroup = model
            this.chassisGroup.rotation.reorder('YXZ')
            this.scene.add(this.chassisGroup)
        }

        // Hide optional lights by default
        const blinkerL = Object.keys(this.parts).find(k => k.startsWith('blinkerleft'))
        const blinkerR = Object.keys(this.parts).find(k => k.startsWith('blinkerright'))
        const stopLights = Object.keys(this.parts).find(k => k.startsWith('stoplights'))
        const backLights = Object.keys(this.parts).find(k => k.startsWith('backlights'))

        if (blinkerL) this.parts[blinkerL].visible = false
        if (blinkerR) this.parts[blinkerR].visible = false
        if (stopLights) this.parts[stopLights].visible = false
        if (backLights) this.parts[backLights].visible = false
    }

    _createPhysics() {
        // Rigid body for the chassis
        const bodyDesc = this.RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(this.position.x, this.position.y, this.position.z)
            .setCanSleep(false)

        this.chassisBody = this.world.createRigidBody(bodyDesc)

        // Main collider
        const mainCollider = this.RAPIER.ColliderDesc.cuboid(1.3, 0.4, 0.85)
            // Lower center of mass drastically so the bottom is heavy
            .setTranslation(0, -0.45, 0)
            .setMass(2.5)
            .setFriction(0.4)

        this.world.createCollider(mainCollider, this.chassisBody)

        // Top collider
        const topCollider = this.RAPIER.ColliderDesc.cuboid(0.5, 0.15, 0.65)
            .setTranslation(0, 0.4, 0)
            .setMass(0)

        this.world.createCollider(topCollider, this.chassisBody)

        // Vehicle controller
        this.controller = this.world.createVehicleController(this.chassisBody)
        console.log('✅ Rapier vehicle controller created')
    }

    _createWheels() {
        const wheelSettings = {
            offset: { x: 0.90, y: 0, z: 0.75 },
            radius: 0.4,
            // Shorten suspension so the car sits lower to the ground
            suspensionRestLength: 0.85,
            // Lower friction slip so the car drifts sideways instead of gripping and rolling over
            frictionSlip: 0.6,
            maxSuspensionForce: 150,
            maxSuspensionTravel: 2,
            sideFrictionStiffness: 3,
            suspensionCompression: 10,
            suspensionRelaxation: 2.7,
            suspensionStiffness: 25,
        }

        // Directions for the raycast
        const directionCs = new THREE.Vector3(0, -1, 0)
        const axleCs = new THREE.Vector3(0, 0, 1)

        // 4 wheel positions (front-right, front-left, back-right, back-left)
        const positions = [
            new THREE.Vector3( wheelSettings.offset.x,  wheelSettings.offset.y,   wheelSettings.offset.z),
            new THREE.Vector3( wheelSettings.offset.x,  wheelSettings.offset.y, - wheelSettings.offset.z),
            new THREE.Vector3(-wheelSettings.offset.x,  wheelSettings.offset.y,   wheelSettings.offset.z),
            new THREE.Vector3(-wheelSettings.offset.x,  wheelSettings.offset.y, - wheelSettings.offset.z),
        ]

        // Find the visual wheel template
        const wheelContainerKey = Object.keys(this.parts).find(k => k.startsWith('wheelcontainer'))
        const wheelTemplate = wheelContainerKey ? this.parts[wheelContainerKey] : null

        if (wheelTemplate) {
            console.log('✅ Found wheel template:', wheelContainerKey)
        } else {
            console.warn('⚠️ No wheelContainer found in model — wheels will be invisible')
        }

        for (let i = 0; i < 4; i++) {
            const wheel = {
                basePosition: positions[i],
                inContact: false,
                suspensionLength: 0,
                visual: null,
                cylinder: null,
                suspension: null,
            }

            // Add wheel to the Rapier controller
            this.controller.addWheel(
                positions[i],
                directionCs,
                axleCs,
                wheelSettings.suspensionRestLength,
                wheelSettings.radius
            )

            // Configure the wheel
            this.controller.setWheelFrictionSlip(i, wheelSettings.frictionSlip)
            this.controller.setWheelMaxSuspensionForce(i, wheelSettings.maxSuspensionForce)
            this.controller.setWheelMaxSuspensionTravel(i, wheelSettings.maxSuspensionTravel)
            this.controller.setWheelSideFrictionStiffness(i, wheelSettings.sideFrictionStiffness)
            this.controller.setWheelSuspensionCompression(i, wheelSettings.suspensionCompression)
            this.controller.setWheelSuspensionRelaxation(i, wheelSettings.suspensionRelaxation)
            this.controller.setWheelSuspensionStiffness(i, wheelSettings.suspensionStiffness)

            // Clone visual wheel if we have one
            if (wheelTemplate) {
                wheel.visual = wheelTemplate.clone(true)
                this.chassisGroup.add(wheel.visual)

                // Find cylinder (spinning part) and suspension (scaling part)
                wheel.visual.traverse((child) => {
                    if (child.name.match(/wheelCylinder/i)) wheel.cylinder = child
                    if (child.name.match(/wheelSuspension/i)) wheel.suspension = child
                })

                if (wheel.cylinder) {
                    wheel.cylinder.position.set(0, 0, 0)
                }

                // Mirror wheels on the left side (indices 0 and 2)
                if (i === 0 || i === 2) {
                    wheel.visual.rotation.y = Math.PI
                }
            }

            this.wheels.items.push(wheel)
        }

        console.log(`✅ ${this.wheels.items.length} wheels created`)
    }

    updatePrePhysics(controls, dt) {
        if (!this.ready) return

        // Engine force
        const boosting = controls.boosting ? 1 : 0
        const topSpeed = this.topSpeed + boosting * (this.topSpeedBoost - this.topSpeed)
        const overflowSpeed = Math.max(0, this.speed - topSpeed)
        let engineForce = (controls.accelerating * (1 + boosting * this.boostMultiplier)) * this.engineForceAmplitude / (1 + overflowSpeed) * dt

        // Brake
        let brake = controls.braking ? 1 : 0

        if (!controls.braking && Math.abs(controls.accelerating) < 0.1) {
            brake = this.idleBrake
        }

        // Reverse braking when trying to go the other direction
        if (
            this.speed > 0.5 &&
            (
                (controls.accelerating > 0 && !this.goingForward) ||
                (controls.accelerating < 0 && this.goingForward)
            )
        ) {
            brake = this.reverseBrake
            engineForce = 0
        }

        brake *= this.brakeAmplitude * dt

        // Steer (negative because of coordinate system)
        const steer = -controls.steering * this.steeringAmplitude

        // Apply to front wheels (0 and 1)
        this.controller.setWheelSteering(0, steer)
        this.controller.setWheelSteering(1, steer)

        for (let i = 0; i < 4; i++) {
            this.controller.setWheelBrake(i, brake)
            this.controller.setWheelEngineForce(i, engineForce)
        }

        // Update the controller (must call before world.step)
        this.controller.updateVehicle(1 / 60)
    }

    updatePostPhysics(dt) {
        if (!this.ready) return

        // Read physics state
        const newPos = this.chassisBody.translation()
        const velocity = new THREE.Vector3(
            newPos.x - this.position.x,
            newPos.y - this.position.y,
            newPos.z - this.position.z
        )

        this.position.set(newPos.x, newPos.y, newPos.z)
        this.quaternion.copy(this.chassisBody.rotation())

        const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion)
        const direction = velocity.clone().normalize()
        const safeDt = Math.max(dt, 0.001)
        this.speed = velocity.length() / safeDt
        this.forwardSpeed = this.speed * direction.dot(forward)
        this.goingForward = direction.dot(forward) > 0.5

        // Sync visual chassis to physics body
        this.chassisGroup.position.copy(this.position)
        this.chassisGroup.quaternion.copy(this.quaternion)

        // Sync visual wheels
        const wheelRotationSpeed = this.forwardSpeed / 0.4 * 0.006

        for (let i = 0; i < 4; i++) {
            const wheel = this.wheels.items[i]
            if (!wheel.visual) continue

            // Spin the wheel cylinder
            if (wheel.cylinder) {
                if (i === 0 || i === 2) {
                    wheel.cylinder.rotation.z += wheelRotationSpeed
                } else {
                    wheel.cylinder.rotation.z -= wheelRotationSpeed
                }
            }

            // Front wheel steering visual
            const steer = -this.wheels.steering
            if (i === 0) wheel.visual.rotation.y = Math.PI + steer
            if (i === 1) wheel.visual.rotation.y = steer

            // Suspension
            wheel.inContact = this.controller.wheelIsInContact(i)
            wheel.suspensionLength = this.controller.wheelSuspensionLength(i)

            let wheelY = wheel.basePosition.y - wheel.suspensionLength
            wheelY = Math.min(wheelY, -0.5)

            wheel.visual.position.x = wheel.basePosition.x
            wheel.visual.position.y += (wheelY - wheel.visual.position.y) * 25 * dt
            wheel.visual.position.z = wheel.basePosition.z

            if (wheel.suspension) {
                const suspensionScale = Math.abs(wheel.visual.position.y) - 0.5
                wheel.suspension.scale.y = suspensionScale
            }
        }

        // ── Auto-unflip detection ──
        this.upward.set(0, 1, 0).applyQuaternion(this.quaternion)
        const isUpsideDown = this.upward.dot(new THREE.Vector3(0, -1, 0)) > 0.3

        if (isUpsideDown) {
            this.flipTimer += dt
            if (this.flipTimer > this.flipThreshold) {
                this._unflip()
                this.flipTimer = 0
            }
        } else {
            this.flipTimer = 0
        }
    }

    _unflip() {
        if (!this.chassisBody) return

        // Get current position and preserve the car's Y rotation (heading)
        const pos = this.chassisBody.translation()
        const euler = new THREE.Euler().setFromQuaternion(this.quaternion, 'YXZ')

        // Teleport: same X/Z, lift up 2 units, keep heading, zero out tilt
        const uprightQuat = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0, euler.y, 0)
        )

        this.chassisBody.setTranslation({ x: pos.x, y: pos.y + 2, z: pos.z }, true)
        this.chassisBody.setRotation(uprightQuat, true)
        this.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
        this.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true)

        console.log('🔄 Auto-unflip: car righted at current position')
    }

    reset() {
        if (!this.chassisBody) return

        this.chassisBody.setTranslation({ x: 0, y: 4, z: 0 }, true)
        this.chassisBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        this.chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
        this.chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }

    getDisplaySpeed() {
        return Math.round(Math.abs(this.forwardSpeed) * 30)
    }
}
