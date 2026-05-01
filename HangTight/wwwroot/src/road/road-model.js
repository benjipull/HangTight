(function registerRoadModel(ns) {
    const { road, warningSigns } = ns.config;
    const { clamp, lerp, pickRandomItem } = ns.math;

    function pickRandomCurveProfile() {
        return pickRandomItem(road.curveProfiles);
    }

    function buildRoadSegmentFromProfile(curveProfile, randomizeDirection = true) {
        const levelAngleDegrees = Number(curveProfile.angleDegrees) || 0;
        const isStraight = curveProfile.key === "straight" || Math.abs(levelAngleDegrees) < 0.0001;
        const distanceMeters = Math.max(1, Number(curveProfile.distanceMeters) || 1);

        if (isStraight) {
            return {
                type: "straight",
                label: curveProfile.key,
                angleDegrees: 0,
                distanceMeters
            };
        }

        const direction = !randomizeDirection ? 1 : (Math.random() < 0.5 ? -1 : 1);
        return {
            type: "curve",
            label: curveProfile.key,
            angleDegrees: Math.abs(levelAngleDegrees) * direction,
            distanceMeters
        };
    }

    function appendRoadSegment(engineState, segmentSpec) {
        const startDistanceMeters = engineState.roadPlanEndMeters;
        const segmentDistanceMeters = Math.max(1, segmentSpec.distanceMeters);
        const endDistanceMeters = startDistanceMeters + segmentDistanceMeters;
        const angleDegrees = segmentSpec.type === "straight" ? 0 : segmentSpec.angleDegrees;
        const angleRadians = (angleDegrees * Math.PI) / 180;
        const startHeadingRadians = engineState.roadPlanEndHeadingRadians;
        const previousSegment = engineState.roadPlan[engineState.roadPlan.length - 1];
        const startAngleDegrees = previousSegment ? previousSegment.angleDegrees : angleDegrees;
        const startAngleRadians = (startAngleDegrees * Math.PI) / 180;
        const transitionDistanceMeters = Math.min(road.curveTransitionMeters, segmentDistanceMeters);
        const startTurnRate = startAngleRadians / segmentDistanceMeters;
        const targetTurnRate = angleRadians / segmentDistanceMeters;

        const transitionHeadingDelta = transitionDistanceMeters > 0
            ? ((startTurnRate + targetTurnRate) * 0.5) * transitionDistanceMeters
            : 0;
        const steadyHeadingDelta = targetTurnRate * (segmentDistanceMeters - transitionDistanceMeters);
        const endHeadingRadians = startHeadingRadians + transitionHeadingDelta + steadyHeadingDelta;

        engineState.roadPlan.push({
            type: segmentSpec.type,
            label: segmentSpec.label,
            start: startDistanceMeters,
            end: endDistanceMeters,
            distanceMeters: segmentDistanceMeters,
            angleDegrees,
            startAngleDegrees,
            angleRadians,
            startTurnRate,
            targetTurnRate,
            transitionMeters: transitionDistanceMeters,
            startHeading: startHeadingRadians,
            endHeading: endHeadingRadians
        });
        engineState.roadPlanEndMeters = endDistanceMeters;
        engineState.roadPlanEndHeadingRadians = endHeadingRadians;
    }

    function ensureRoadSegmentsCoverDistance(engineState, upToDistanceMeters) {
        while (engineState.roadPlanEndMeters < upToDistanceMeters) {
            appendRoadSegment(engineState, buildRoadSegmentFromProfile(pickRandomCurveProfile()));
        }
    }

    function findSegmentAtDistance(segments, worldDistanceMeters) {
        let low = 0;
        let high = segments.length - 1;

        while (low <= high) {
            const middle = (low + high) >> 1;
            const segment = segments[middle];
            if (worldDistanceMeters < segment.start) {
                high = middle - 1;
            } else if (worldDistanceMeters >= segment.end) {
                low = middle + 1;
            } else {
                return segment;
            }
        }

        return segments[Math.max(0, Math.min(segments.length - 1, low))];
    }

    function depthMetersFromScreenRatio(screenRatio) {
        const farScale = road.nearMeters / road.farMeters;
        const perspectiveScale = lerp(farScale, 1, clamp(screenRatio, 0, 1));
        return road.nearMeters / perspectiveScale;
    }

    function screenRatioFromDepthMeters(depthMeters) {
        const clampedDepth = clamp(depthMeters, road.nearMeters, road.farMeters);
        const perspectiveScale = road.nearMeters / clampedDepth;
        const farScale = road.nearMeters / road.farMeters;
        return clamp((perspectiveScale - farScale) / (1 - farScale), 0, 1);
    }

    function pixelsPerMeterAtDepth(canvasWidth, depthMeters) {
        const clampedDepth = clamp(depthMeters, road.nearMeters, road.farMeters);
        const nearHalfPixels = canvasWidth * road.nearRoadHalfScreenRatio;
        const pixelsPerMeterAtNear = nearHalfPixels / road.halfWidthMeters;
        return pixelsPerMeterAtNear * (road.nearMeters / clampedDepth);
    }

    function roadHeadingAtDistance(engineState, worldDistanceMeters) {
        ensureRoadSegmentsCoverDistance(engineState, worldDistanceMeters + road.maxCurveProfileDistanceMeters);
        const segment = findSegmentAtDistance(engineState.roadPlan, worldDistanceMeters);
        if (!segment) {
            return 0;
        }

        const localMeters = clamp(worldDistanceMeters - segment.start, 0, segment.distanceMeters);
        const transitionMeters = segment.transitionMeters;

        if (transitionMeters <= 0) {
            return segment.startHeading + segment.targetTurnRate * localMeters;
        }

        if (localMeters <= transitionMeters) {
            const delta =
                segment.startTurnRate * localMeters +
                ((segment.targetTurnRate - segment.startTurnRate) * localMeters * localMeters) / (2 * transitionMeters);
            return segment.startHeading + delta;
        }

        const transitionDelta = ((segment.startTurnRate + segment.targetTurnRate) * 0.5) * transitionMeters;
        return segment.startHeading + transitionDelta + segment.targetTurnRate * (localMeters - transitionMeters);
    }

    function roadAngleDegreesAtDistance(engineState, worldDistanceMeters) {
        ensureRoadSegmentsCoverDistance(engineState, worldDistanceMeters + road.maxCurveProfileDistanceMeters);
        const segment = findSegmentAtDistance(engineState.roadPlan, worldDistanceMeters);
        if (!segment) {
            return 0;
        }

        const localMeters = clamp(worldDistanceMeters - segment.start, 0, segment.distanceMeters);
        const transitionMeters = segment.transitionMeters;
        if (transitionMeters <= 0 || localMeters >= transitionMeters) {
            return segment.angleDegrees ?? 0;
        }

        const transitionProgress = localMeters / transitionMeters;
        return lerp(segment.startAngleDegrees ?? 0, segment.angleDegrees ?? 0, transitionProgress);
    }

    function roadLateralOffsetMeters(engineState, cameraDistanceMeters, worldDistanceMeters) {
        const depthMeters = Math.max(0, worldDistanceMeters - cameraDistanceMeters);
        if (depthMeters <= 0.001) {
            return 0;
        }

        const steps = 8;
        const stepMeters = depthMeters / steps;
        const cameraHeading = roadHeadingAtDistance(engineState, cameraDistanceMeters);
        let lateralMeters = 0;
        for (let i = 0; i < steps; i += 1) {
            const sampleMeters = cameraDistanceMeters + stepMeters * (i + 0.5);
            const relativeHeading = roadHeadingAtDistance(engineState, sampleMeters) - cameraHeading;
            lateralMeters += Math.tan(relativeHeading) * stepMeters;
        }
        return lateralMeters;
    }

    function projectRoadSlice(screenRatio, canvasWidth, engineState, cameraDistanceMeters, worldDistanceMeters, playerLateralMeters) {
        const depthMeters = depthMetersFromScreenRatio(screenRatio);
        const pixelsPerMeter = pixelsPerMeterAtDepth(canvasWidth, depthMeters);
        const lateralMeters = roadLateralOffsetMeters(engineState, cameraDistanceMeters, worldDistanceMeters);
        const centerX = canvasWidth / 2 + (lateralMeters - playerLateralMeters) * pixelsPerMeter;
        const halfWidthPixels = road.halfWidthMeters * pixelsPerMeter;
        return { center: centerX, half: halfWidthPixels };
    }

    function roadEdgeMarkerWidthPixels(roadHalfWidthPixels) {
        const laneWidthPixels = (roadHalfWidthPixels * 2) / road.laneCount;
        const markerToLaneRatio = road.edgeMarkerWidthMeters / road.laneWidthMeters;
        return laneWidthPixels * markerToLaneRatio;
    }

    function getCurveWarningSharpnessStep(angleDegrees) {
        const absAngle = Math.abs(angleDegrees);
        if (absAngle < 170) {
            return 1;
        }
        if (absAngle < 300) {
            return 2;
        }
        return 3;
    }

    function collectUpcomingCurveWarningSigns(engineState, visibleStartMeters, visibleEndMeters) {
        const signs = [];
        for (let index = 1; index < engineState.roadPlan.length; index += 1) {
            const previous = engineState.roadPlan[index - 1];
            const segment = engineState.roadPlan[index];
            if (!segment || segment.type !== "curve") {
                continue;
            }

            const switchesCurveLevel =
                previous.type !== segment.type ||
                Math.abs((previous.angleDegrees ?? 0) - (segment.angleDegrees ?? 0)) > 0.001;
            if (!switchesCurveLevel) {
                continue;
            }

            const signWorldMeters = segment.start - warningSigns.switchWarningDistanceMeters;
            if (signWorldMeters < visibleStartMeters || signWorldMeters > visibleEndMeters) {
                continue;
            }

            signs.push({
                worldMeters: signWorldMeters,
                angleDegrees: segment.angleDegrees
            });
        }
        return signs;
    }

    ns.roadModel = {
        pickRandomCurveProfile,
        buildRoadSegmentFromProfile,
        appendRoadSegment,
        ensureRoadSegmentsCoverDistance,
        findSegmentAtDistance,
        depthMetersFromScreenRatio,
        screenRatioFromDepthMeters,
        pixelsPerMeterAtDepth,
        roadHeadingAtDistance,
        roadAngleDegreesAtDistance,
        roadLateralOffsetMeters,
        projectRoadSlice,
        roadEdgeMarkerWidthPixels,
        getCurveWarningSharpnessStep,
        collectUpcomingCurveWarningSigns
    };
})(window.HangTight = window.HangTight || {});
