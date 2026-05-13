(function registerPlayerBike3d(ns) {
    const { clamp, lerp } = ns.math;
    const { road, speed } = ns.config;
    const PLAYER_BIKE_VISUAL_SCALE = 0.68;

    function createBikeMesh(THREE) {
        const bike = new THREE.Group();

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xd41323,
            metalness: 0.33,
            roughness: 0.3
        });
        const trimMaterial = new THREE.MeshStandardMaterial({
            color: 0x15171d,
            metalness: 0.56,
            roughness: 0.36
        });
        const chromeMaterial = new THREE.MeshStandardMaterial({
            color: 0xb9c4d4,
            metalness: 0.9,
            roughness: 0.16
        });
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xa9d7ff,
            metalness: 0,
            roughness: 0.05,
            transparent: true,
            opacity: 0.42,
            transmission: 0.66,
            thickness: 0.18
        });
        const tireMaterial = new THREE.MeshStandardMaterial({
            color: 0x0e1014,
            emissive: 0x000000,
            metalness: 0.12,
            roughness: 0.78
        });
        const rimMaterial = new THREE.MeshStandardMaterial({
            color: 0xd7deea,
            metalness: 0.9,
            roughness: 0.2
        });
        const accentMaterial = new THREE.MeshStandardMaterial({
            color: 0xffcd3c,
            emissive: 0x3a2500,
            metalness: 0.3,
            roughness: 0.45
        });

        function addMirroredPair(buildPart) {
            const left = buildPart();
            left.position.x = -Math.abs(left.position.x);
            bike.add(left);
            const right = left.clone();
            right.position.x = Math.abs(left.position.x);
            bike.add(right);
        }

        const spine = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07, 0.07, 1.78, 18),
            trimMaterial
        );
        spine.rotation.x = Math.PI * 0.5;
        spine.position.set(0, 0.08, 0.02);
        bike.add(spine);

        const engineBlock = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.24, 0.58),
            trimMaterial
        );
        engineBlock.position.set(0, -0.04, 0.12);
        bike.add(engineBlock);

        const tank = new THREE.Mesh(
            new THREE.SphereGeometry(0.27, 24, 18),
            bodyMaterial
        );
        tank.scale.set(1.08, 0.76, 1.32);
        tank.position.set(0, 0.34, 0.12);
        bike.add(tank);

        const tankAccent = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.22, 0.46),
            accentMaterial
        );
        tankAccent.position.set(0, 0.34, 0.12);
        bike.add(tankAccent);

        addMirroredPair(() => {
            const sideFairing = new THREE.Mesh(
                new THREE.BoxGeometry(0.16, 0.34, 0.86),
                bodyMaterial
            );
            sideFairing.position.set(0.29, 0.15, -0.02);
            sideFairing.rotation.z = 0.26;
            return sideFairing;
        });

        const nose = new THREE.Mesh(
            new THREE.ConeGeometry(0.22, 0.5, 22),
            bodyMaterial
        );
        nose.rotation.x = -Math.PI * 0.5;
        nose.position.set(0, 0.25, -0.64);
        bike.add(nose);

        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.1, 0.48),
            trimMaterial
        );
        seat.position.set(0, 0.42, 0.52);
        bike.add(seat);

        const tail = new THREE.Mesh(
            new THREE.BoxGeometry(0.34, 0.2, 0.56),
            bodyMaterial
        );
        tail.position.set(0, 0.38, 0.82);
        tail.rotation.x = -0.08;
        bike.add(tail);

        const tailLight = new THREE.Mesh(
            new THREE.BoxGeometry(0.16, 0.06, 0.05),
            accentMaterial
        );
        tailLight.position.set(0, 0.37, 1.08);
        bike.add(tailLight);

        const screen = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.2, 0.07),
            glassMaterial
        );
        screen.position.set(0, 0.46, -0.59);
        screen.rotation.x = -0.36;
        bike.add(screen);

        const frontForkPivot = new THREE.Group();
        frontForkPivot.position.set(0, 0.18, -0.58);
        bike.add(frontForkPivot);

        const handlebar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.62, 16),
            chromeMaterial
        );
        handlebar.rotation.z = Math.PI * 0.5;
        handlebar.position.set(0, 0.22, -0.08);
        frontForkPivot.add(handlebar);

        for (const side of [-1, 1]) {
            const forkTube = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 0.52, 12),
                chromeMaterial
            );
            forkTube.position.set(0.15 * side, -0.08, -0.24);
            forkTube.rotation.x = 0.12;
            frontForkPivot.add(forkTube);
        }

        const frontFender = new THREE.Mesh(
            new THREE.TorusGeometry(0.26, 0.035, 12, 24, Math.PI * 0.92),
            bodyMaterial
        );
        frontFender.rotation.y = Math.PI * 0.5;
        frontFender.rotation.z = Math.PI;
        frontFender.position.set(0, -0.24, -0.28);
        frontForkPivot.add(frontFender);

        addMirroredPair(() => {
            const swingArm = new THREE.Mesh(
                new THREE.BoxGeometry(0.07, 0.08, 0.78),
                trimMaterial
            );
            swingArm.position.set(0.2, -0.08, 0.44);
            swingArm.rotation.x = -0.11;
            return swingArm;
        });

        addMirroredPair(() => {
            const footPeg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.14, 10),
                chromeMaterial
            );
            footPeg.position.set(0.23, 0.03, 0.22);
            footPeg.rotation.z = Math.PI * 0.5;
            return footPeg;
        });

        addMirroredPair(() => {
            const exhaust = new THREE.Mesh(
                new THREE.CylinderGeometry(0.045, 0.055, 0.68, 16),
                chromeMaterial
            );
            exhaust.position.set(0.28, 0.04, 0.6);
            exhaust.rotation.x = Math.PI * 0.52;
            return exhaust;
        });

        function createWheel(z) {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(0, -0.22, z);

            const tire = new THREE.Mesh(
                new THREE.TorusGeometry(0.33, 0.085, 20, 34),
                tireMaterial
            );
            tire.rotation.y = Math.PI * 0.5;
            wheelGroup.add(tire);

            const rim = new THREE.Mesh(
                new THREE.TorusGeometry(0.22, 0.028, 16, 28),
                rimMaterial
            );
            rim.rotation.y = Math.PI * 0.5;
            wheelGroup.add(rim);

            const hub = new THREE.Mesh(
                new THREE.CylinderGeometry(0.055, 0.055, 0.19, 14),
                chromeMaterial
            );
            hub.rotation.z = Math.PI * 0.5;
            wheelGroup.add(hub);

            const brakeDisc = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16),
                trimMaterial
            );
            brakeDisc.rotation.z = Math.PI * 0.5;
            wheelGroup.add(brakeDisc);

            const skidSprites = [];
            for (const side of [-1, 1]) {
                const skidMaterial = new THREE.SpriteMaterial({
                    color: 0xdce7f4,
                    transparent: true,
                    opacity: 0,
                    depthWrite: false
                });
                const skidSprite = new THREE.Sprite(skidMaterial);
                skidSprite.position.set(side * 0.2, -0.18, -0.02);
                skidSprite.scale.set(0.26, 0.16, 1);
                wheelGroup.add(skidSprite);
                skidSprites.push(skidSprite);
            }

            return {
                wheelGroup,
                tire,
                skidSprites
            };
        }

        const frontWheelPivot = new THREE.Group();
        frontWheelPivot.position.set(0, 0, -0.6);
        bike.add(frontWheelPivot);

        const frontWheelModel = createWheel(0.02);
        frontWheelPivot.add(frontWheelModel.wheelGroup);

        const rearWheelModel = createWheel(0.9);
        bike.add(rearWheelModel.wheelGroup);

        return {
            bike,
            frontWheelPivot,
            frontWheel: frontWheelModel.wheelGroup,
            rearWheel: rearWheelModel.wheelGroup,
            tires: [frontWheelModel.tire, rearWheelModel.tire],
            skidSprites: [...frontWheelModel.skidSprites, ...rearWheelModel.skidSprites],
            bodyMaterial,
            frontForkPivot
        };
    }

    function createPlayerBike3dRenderer(canvas) {
        const THREE = window.THREE;
        if (!THREE || !canvas) {
            return null;
        }

        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setClearColor(0x000000, 0);
        if ("outputColorSpace" in renderer && "SRGBColorSpace" in THREE) {
            renderer.outputColorSpace = THREE.SRGBColorSpace;
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 100);
        camera.position.set(0, 1.05, 6.2);
        camera.lookAt(0, -0.12, 0);

        const ambientLight = new THREE.HemisphereLight(0xd8ecff, 0x2b1f18, 1.06);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
        keyLight.position.set(4.6, 5.8, 3.1);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0x9ec7ff, 0.62);
        fillLight.position.set(-3.5, 2.8, 5.6);
        scene.add(fillLight);

        const bikeRig = new THREE.Group();
        bikeRig.position.set(0, -0.92, 0);
        bikeRig.scale.setScalar(PLAYER_BIKE_VISUAL_SCALE);
        scene.add(bikeRig);

        const bikeModel = createBikeMesh(THREE);
        bikeRig.add(bikeModel.bike);

        let currentLean = 0;
        let wheelRotation = 0;

        function resize(width, height, dpr) {
            renderer.setPixelRatio(Math.min(2, Math.max(1, dpr || 1)));
            renderer.setSize(width, height, false);
            camera.aspect = width / Math.max(1, height);
            camera.updateProjectionMatrix();
        }

        function update(engineState, steerInput, nowSec) {
            const targetLean = clamp(-steerInput * 0.36, -0.42, 0.42);
            currentLean = lerp(currentLean, targetLean, 0.18);
            bikeRig.rotation.z = currentLean;

            const lateralRatio = clamp(engineState.playerX / road.halfWidthMeters, -1.2, 1.2);
            bikeRig.position.x = lateralRatio * 1.2;

            bikeModel.frontForkPivot.rotation.y = clamp(-steerInput * 0.25, -0.32, 0.32);
            bikeModel.frontWheelPivot.rotation.y = clamp(-steerInput * 0.25, -0.32, 0.32);

            const speedRatio = clamp(engineState.speed / speed.roadMaxKmh, 0, 1);
            wheelRotation += lerp(0.03, 0.36, speedRatio);
            bikeModel.frontWheel.rotation.x = wheelRotation;
            bikeModel.rearWheel.rotation.x = wheelRotation;

            const skidIntensity = clamp(engineState.skidIntensity ?? 0, 0, 1);
            bikeModel.skidSprites.forEach((sprite, index) => {
                const pulse = 0.62 + Math.sin(nowSec * 34 + index * 0.8) * 0.38;
                const opacity = skidIntensity * pulse * 0.56;
                sprite.material.opacity = opacity;
                const scaleJitter = 1 + Math.sin(nowSec * 21 + index) * 0.12;
                const targetWidth = lerp(0.24, 0.5, skidIntensity) * scaleJitter;
                sprite.scale.set(targetWidth, targetWidth * 0.62, 1);
            });

            const glow = lerp(0, 0.25, skidIntensity);
            bikeModel.tires.forEach((tire) => {
                tire.material.emissive.setRGB(glow, glow * 0.86, glow * 0.66);
            });

            const isCrashing = nowSec < engineState.crashUntil;
            bikeModel.bodyMaterial.color.setHex(isCrashing ? 0xff5d73 : 0xd41323);
        }

        function render() {
            renderer.render(scene, camera);
        }

        function dispose() {
            renderer.dispose();
        }

        return {
            resize,
            update,
            render,
            dispose
        };
    }

    ns.playerBike3d = {
        createPlayerBike3dRenderer
    };
})(window.HangTight = window.HangTight || {});
