(function configureGameNamespace(ns) {
    const LANE_COUNT = 2;
    const LANE_WIDTH_METERS = 3.6;
    const ROAD_HALF_WIDTH_METERS = (LANE_COUNT * LANE_WIDTH_METERS) * 0.5;

    function buildLaneCenterOffsetsMeters(laneCount, laneWidthMeters) {
        const totalWidthMeters = laneCount * laneWidthMeters;
        const leftEdgeMeters = -totalWidthMeters * 0.5;
        return Array.from(
            { length: laneCount },
            (_, laneIndex) => leftEdgeMeters + (laneIndex + 0.5) * laneWidthMeters
        );
    }

    const ROAD_CURVE_PROFILES = [
        { key: "slight", angleDegrees: 120, distanceMeters: 500 },
        { key: "sharp", angleDegrees: 240, distanceMeters: 500 },
        { key: "very-sharp", angleDegrees: 360, distanceMeters: 500 },
        { key: "straight", angleDegrees: 0, distanceMeters: 500 }
    ];

    ns.config = Object.freeze({
        road: Object.freeze({
            laneCount: LANE_COUNT,
            laneWidthMeters: LANE_WIDTH_METERS,
            halfWidthMeters: ROAD_HALF_WIDTH_METERS,
            nearMeters: 2,
            farMeters: 160,
            curveProfiles: ROAD_CURVE_PROFILES,
            maxCurveProfileDistanceMeters: Math.max(...ROAD_CURVE_PROFILES.map((profile) => profile.distanceMeters)),
            curveTransitionMeters: 60,
            edgeMarkerWidthMeters: 0.5,
            edgeMarkerColorCycleMeters: 1,
            leftShoulderLineOffsetMeters: 0.2,
            playerLateralLimitMeters: ROAD_HALF_WIDTH_METERS + 1.4,
            nearRoadHalfScreenRatio: 0.48
        }),
        traffic: Object.freeze({
            bikeColors: ["#ffd166", "#f94144", "#43aa8b", "#90be6d", "#f3722c"],
            laneSpawnOffsets: buildLaneCenterOffsetsMeters(LANE_COUNT, LANE_WIDTH_METERS),
            opponentCount: 0
        }),
        laneDividerMarkers: Object.freeze({
            lengthMeters: 3,
            gapMeters: 9,
            visualLengthMultiplier: 1
        }),
        warningSigns: Object.freeze({
            switchWarningDistanceMeters: 100,
            signScaleMultiplier: 1,
            signSizeMeters: 1,
            minScreenSizePx: 10,
            maxScreenSizePx: 90,
            visibilityMeters: 320,
            nearClipMeters: 0.5,
            grassOffsetMeters: 0.42
        }),
        speed: Object.freeze({
            roadMaxKmh: 240,
            grassMaxKmh: 60
        }),
        physics: Object.freeze({
            accelerationRate: 240 / 15,
            coastDecelerationRate: 22,
            brakeDecelerationRate: 160,
            offroadSpeedBleedRate: 210,
            pullReferenceAngleDegrees: 240,
            pullReferenceSpeedKmh: 120,
            visualWorldSpeedMultiplier: 3
        }),
        audio: Object.freeze({
            minFrequencyHz: 45,
            maxFrequencyHz: 190
        }),
        ui: Object.freeze({
            initialStatus: "Use W/A/S/D or arrows.",
            initialTimerSeconds: 75,
            gameStartStatus: "Hold THROTTLE to start."
        })
    });
})(window.HangTight = window.HangTight || {});
