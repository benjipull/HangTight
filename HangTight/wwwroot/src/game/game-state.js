(function registerGameState(ns) {
    const { road, traffic, speed, physics, ui } = ns.config;
    const { lerp, clamp, pickRandomItem } = ns.math;
    const roadModel = ns.roadModel;

    function createTrafficRider(zMin, zMax) {
        return {
            lane: pickRandomItem(traffic.laneSpawnOffsets),
            z: lerp(zMin, zMax, Math.random()),
            speed: lerp(70, 172, Math.random()),
            color: pickRandomItem(traffic.bikeColors)
        };
    }

    function createInitialGameState() {
        return {
            playerX: 0,
            speed: 0,
            roadMeters: 0,
            score: 0,
            timeLeft: ui.initialTimerSeconds,
            crashUntil: 0,
            gameOver: false,
            started: false,
            traffic: [],
            lastStatus: ui.gameStartStatus,
            roadPlan: [],
            roadPlanEndMeters: 0,
            roadPlanEndHeadingRadians: 0
        };
    }

    function resetGameState(engineState) {
        engineState.playerX = 0;
        engineState.speed = 0;
        engineState.roadMeters = 0;
        engineState.score = 0;
        engineState.timeLeft = ui.initialTimerSeconds;
        engineState.crashUntil = 0;
        engineState.gameOver = false;
        engineState.started = false;
        engineState.lastStatus = ui.gameStartStatus;
        engineState.traffic = Array.from(
            { length: traffic.opponentCount },
            (_, i) => createTrafficRider(60 + i * 40, 280 + i * 44)
        );
        engineState.roadPlan = [];
        engineState.roadPlanEndMeters = 0;
        engineState.roadPlanEndHeadingRadians = 0;

        const straightStartProfile = road.curveProfiles.find((profile) => profile.key === "straight")
            ?? roadModel.pickRandomCurveProfile();
        const firstSegment = roadModel.buildRoadSegmentFromProfile(straightStartProfile, false);
        roadModel.appendRoadSegment(engineState, firstSegment);
        roadModel.ensureRoadSegmentsCoverDistance(engineState, 3000);
    }

    function stepSimulation(engineState, controls, dt, nowSec) {
        if (!engineState.gameOver && (controls.accelerate || controls.brake)) {
            engineState.started = true;
        }

        const steeringInput = (controls.left ? -1 : 0) + (controls.right ? 1 : 0);
        const accelerating = controls.accelerate ? 1 : 0;
        const braking = controls.brake ? 1 : 0;

        if (accelerating) {
            engineState.speed += physics.accelerationRate * dt;
        } else {
            engineState.speed -= physics.coastDecelerationRate * dt;
        }

        if (braking) {
            engineState.speed -= physics.brakeDecelerationRate * dt;
        }

        engineState.speed = clamp(engineState.speed, 0, speed.roadMaxKmh);

        const steerGrip = lerp(2.6, 1.35, engineState.speed / speed.roadMaxKmh);
        const roadAngleDegrees = roadModel.roadAngleDegreesAtDistance(engineState, engineState.roadMeters);
        const anglePullRatio = Math.abs(roadAngleDegrees) / physics.pullReferenceAngleDegrees;
        const speedPullRatio = engineState.speed / physics.pullReferenceSpeedKmh;
        const pullRatio = anglePullRatio * speedPullRatio;
        const pullDirection = roadAngleDegrees === 0 ? 0 : -Math.sign(roadAngleDegrees);
        const curvePull = pullDirection * steerGrip * pullRatio;
        engineState.playerX += (steeringInput * steerGrip + curvePull) * dt;

        engineState.playerX = clamp(
            engineState.playerX,
            -road.playerLateralLimitMeters,
            road.playerLateralLimitMeters
        );
        const onGrass = Math.abs(engineState.playerX) > road.halfWidthMeters;
        if (onGrass && engineState.speed > speed.grassMaxKmh) {
            engineState.speed -= physics.offroadSpeedBleedRate * dt;
        }

        const currentMaxSpeed = onGrass ? speed.grassMaxKmh : speed.roadMaxKmh;
        engineState.speed = clamp(engineState.speed, 0, currentMaxSpeed);
        const speedMetersPerSecond = engineState.speed / 3.6;
        engineState.roadMeters += speedMetersPerSecond * dt * physics.visualWorldSpeedMultiplier;

        if (engineState.started && !engineState.gameOver) {
            engineState.timeLeft -= dt;
            engineState.score += engineState.speed * dt * 0.52;
            if (engineState.timeLeft <= 0) {
                engineState.timeLeft = 0;
                engineState.gameOver = true;
                engineState.lastStatus = "Time up. Hit RESTART.";
            }
        }

        for (const rider of engineState.traffic) {
            rider.z -= (engineState.speed - rider.speed) * dt * 0.62 * physics.visualWorldSpeedMultiplier;

            if (!engineState.gameOver && rider.z < 4 && rider.z > -3) {
                const laneDiff = Math.abs(engineState.playerX - rider.lane);
                if (laneDiff < 0.28 && nowSec > engineState.crashUntil) {
                    engineState.crashUntil = nowSec + 0.7;
                    engineState.speed *= 0.34;
                    engineState.score = Math.max(0, engineState.score - 200);
                    engineState.lastStatus = "Crash! Stay off traffic.";
                }
            }

            if (rider.z < -12) {
                if (!engineState.gameOver && engineState.speed > rider.speed + 14) {
                    engineState.score += 72;
                }
                rider.lane = pickRandomItem(traffic.laneSpawnOffsets);
                rider.z = lerp(280, 420, Math.random());
                rider.speed = lerp(65, 176, Math.random());
                rider.color = pickRandomItem(traffic.bikeColors);
            }
        }

        if (!engineState.started) {
            engineState.lastStatus = "Use W/A/S/D or arrows.";
        } else if (!engineState.gameOver && onGrass) {
            engineState.lastStatus = `Off-road: grass limits speed to ${speed.grassMaxKmh} km/h.`;
        } else if (!engineState.gameOver && nowSec > engineState.crashUntil) {
            engineState.lastStatus = "Thread traffic and keep speed up.";
        }

        return steeringInput;
    }

    ns.gameState = {
        createInitialGameState,
        createTrafficRider,
        resetGameState,
        stepSimulation
    };
})(window.HangTight = window.HangTight || {});
