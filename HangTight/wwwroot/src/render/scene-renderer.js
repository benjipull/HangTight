(function registerSceneRenderer(ns) {
    const { road, laneDividerMarkers, warningSigns, traffic } = ns.config;
    const { lerp, clamp } = ns.math;
    const roadModel = ns.roadModel;

    function drawCurveWarningSignSprite(ctx, x, y, size, direction, sharpnessDegrees, sharpnessStep) {
        const poleHeight = size * 1.7;
        const poleWidth = Math.max(2, size * 0.14);
        const triangleRadius = size * 0.72;
        const signCenterY = -poleHeight - triangleRadius * 0.76;
        const innerScale = 0.74;

        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = "#8d949d";
        ctx.fillRect(-poleWidth * 0.5, -poleHeight, poleWidth, poleHeight);

        const drawTriangle = (radius) => {
            const angleOffset = -Math.PI / 2;
            ctx.beginPath();
            for (let vertex = 0; vertex < 3; vertex += 1) {
                const angle = angleOffset + (vertex * Math.PI * 2) / 3;
                const px = Math.cos(angle) * radius;
                const py = Math.sin(angle) * radius;
                if (vertex === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();
        };

        ctx.save();
        ctx.translate(0, signCenterY);
        drawTriangle(triangleRadius);
        ctx.fillStyle = "#d21321";
        ctx.fill();
        drawTriangle(triangleRadius * innerScale);
        ctx.fillStyle = "#fdfdfd";
        ctx.fill();

        const bend = lerp(0.2, 0.46, (sharpnessStep - 1) / 2);
        ctx.save();
        ctx.scale(direction, 1);
        ctx.strokeStyle = "#11141b";
        ctx.lineWidth = size * 0.11;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(-size * 0.2, -size * 0.02);
        ctx.bezierCurveTo(
            -size * 0.11,
            -size * 0.22,
            size * (0.05 + bend * 0.2),
            size * -0.01,
            size * (0.1 + bend * 0.4),
            size * 0.2
        );
        ctx.stroke();

        ctx.fillStyle = "#11141b";
        ctx.beginPath();
        ctx.moveTo(size * (0.1 + bend * 0.4), size * 0.2);
        ctx.lineTo(size * (0.04 + bend * 0.34), size * 0.09);
        ctx.lineTo(size * (0.15 + bend * 0.26), size * 0.11);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        const plateWidth = size * 0.96;
        const plateHeight = size * 0.34;
        const plateY = triangleRadius * 0.93;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-plateWidth * 0.5, plateY, plateWidth, plateHeight);
        ctx.strokeStyle = "#20242c";
        ctx.lineWidth = Math.max(1, size * 0.04);
        ctx.strokeRect(-plateWidth * 0.5, plateY, plateWidth, plateHeight);

        ctx.fillStyle = "#101317";
        ctx.font = `${Math.max(7, Math.round(size * 0.22))}px "Trebuchet MS", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${Math.round(sharpnessDegrees)} deg`, 0, plateY + plateHeight * 0.53);
        ctx.restore();

        ctx.restore();
    }

    function drawCurveWarningSignLayer(ctx, width, height, horizon, engineState) {
        const signVisibilityMeters = Math.min(warningSigns.visibilityMeters, road.farMeters);
        const visibleStartMeters = engineState.roadMeters + warningSigns.nearClipMeters;
        const visibleEndMeters = engineState.roadMeters + signVisibilityMeters;
        const signs = roadModel.collectUpcomingCurveWarningSigns(engineState, visibleStartMeters, visibleEndMeters)
            .sort((a, b) => b.worldMeters - a.worldMeters);

        for (const sign of signs) {
            const depthMeters = sign.worldMeters - engineState.roadMeters;
            if (depthMeters <= warningSigns.nearClipMeters || depthMeters > signVisibilityMeters) {
                continue;
            }

            const t = roadModel.screenRatioFromDepthMeters(depthMeters);
            const y = horizon + t * (height - horizon);
            const { center, half } = roadModel.projectRoadSlice(
                t,
                width,
                engineState,
                engineState.roadMeters,
                sign.worldMeters,
                engineState.playerX
            );
            const pixelsPerMeter = roadModel.pixelsPerMeterAtDepth(width, depthMeters);
            const unclampedSize =
                warningSigns.signSizeMeters * pixelsPerMeter * warningSigns.signScaleMultiplier;
            const size = clamp(
                unclampedSize,
                warningSigns.minScreenSizePx,
                warningSigns.maxScreenSizePx
            );
            const roadLeftEdge = center - half;
            if (roadLeftEdge <= 0) {
                continue;
            }

            const lanePixelsPerMeter = half / road.halfWidthMeters;
            const edgeMarkerWidth = roadModel.roadEdgeMarkerWidthPixels(half);
            const shoulderOffsetPx = warningSigns.grassOffsetMeters * lanePixelsPerMeter;
            const x = roadLeftEdge - edgeMarkerWidth - shoulderOffsetPx;
            if (x <= 0 || x >= width) {
                continue;
            }

            drawCurveWarningSignSprite(
                ctx,
                x,
                y,
                size,
                sign.angleDegrees < 0 ? 1 : -1,
                Math.abs(sign.angleDegrees),
                roadModel.getCurveWarningSharpnessStep(sign.angleDegrees)
            );
        }
    }

    function drawLaneDividerMarkers(ctx, width, height, horizon, engineState) {
        const markerCycleMeters = laneDividerMarkers.lengthMeters + laneDividerMarkers.gapMeters;
        const visibleStartMeters = engineState.roadMeters + road.nearMeters;
        const visibleEndMeters = engineState.roadMeters + road.farMeters;
        const firstCycle = Math.floor(visibleStartMeters / markerCycleMeters) - 1;
        const lastCycle = Math.ceil(visibleEndMeters / markerCycleMeters) + 1;

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        for (let divider = 1; divider < road.laneCount; divider += 1) {
            const laneT = divider / road.laneCount;
            for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
                const dashStartWorld = cycle * markerCycleMeters;
                const dashEndWorld = dashStartWorld + laneDividerMarkers.lengthMeters;
                const dashCenterWorld = (dashStartWorld + dashEndWorld) * 0.5;
                const visualDashHalfMeters = (laneDividerMarkers.lengthMeters * laneDividerMarkers.visualLengthMultiplier) * 0.5;
                const visualDashStartWorld = dashCenterWorld - visualDashHalfMeters;
                const visualDashEndWorld = dashCenterWorld + visualDashHalfMeters;

                if (visualDashEndWorld <= visibleStartMeters || visualDashStartWorld >= visibleEndMeters) {
                    continue;
                }

                const nearWorld = Math.max(visualDashStartWorld, visibleStartMeters);
                const farWorld = Math.min(visualDashEndWorld, visibleEndMeters);
                if (farWorld <= nearWorld) {
                    continue;
                }

                const nearDepth = nearWorld - engineState.roadMeters;
                const farDepth = farWorld - engineState.roadMeters;
                const tNear = roadModel.screenRatioFromDepthMeters(nearDepth);
                const tFar = roadModel.screenRatioFromDepthMeters(farDepth);
                const yNear = horizon + tNear * (height - horizon);
                const yFar = horizon + tFar * (height - horizon);

                const mNear = roadModel.projectRoadSlice(tNear, width, engineState, engineState.roadMeters, nearWorld, engineState.playerX);
                const mFar = roadModel.projectRoadSlice(tFar, width, engineState, engineState.roadMeters, farWorld, engineState.playerX);
                const xNear = lerp(mNear.center - mNear.half, mNear.center + mNear.half, laneT);
                const xFar = lerp(mFar.center - mFar.half, mFar.center + mFar.half, laneT);
                const thickNear = lerp(0.75, 3.9, tNear);
                const thickFar = lerp(0.75, 3.9, tFar);

                ctx.beginPath();
                ctx.moveTo(xFar - thickFar, yFar);
                ctx.lineTo(xFar + thickFar, yFar);
                ctx.lineTo(xNear + thickNear, yNear);
                ctx.lineTo(xNear - thickNear, yNear);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    function drawLeftShoulderMarkers(ctx, width, height, horizon, engineState) {
        const markerCycleMeters = laneDividerMarkers.lengthMeters + laneDividerMarkers.gapMeters;
        const visibleStartMeters = engineState.roadMeters + road.nearMeters;
        const visibleEndMeters = engineState.roadMeters + road.farMeters;
        const firstCycle = Math.floor(visibleStartMeters / markerCycleMeters) - 1;
        const lastCycle = Math.ceil(visibleEndMeters / markerCycleMeters) + 1;
        const laneT = 0;

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        for (let cycle = firstCycle; cycle <= lastCycle; cycle += 1) {
            const dashStartWorld = cycle * markerCycleMeters;
            const dashEndWorld = dashStartWorld + laneDividerMarkers.lengthMeters;
            const dashCenterWorld = (dashStartWorld + dashEndWorld) * 0.5;
            const visualDashHalfMeters = (laneDividerMarkers.lengthMeters * laneDividerMarkers.visualLengthMultiplier) * 0.5;
            const visualDashStartWorld = dashCenterWorld - visualDashHalfMeters;
            const visualDashEndWorld = dashCenterWorld + visualDashHalfMeters;

            if (visualDashEndWorld <= visibleStartMeters || visualDashStartWorld >= visibleEndMeters) {
                continue;
            }

            const nearWorld = Math.max(visualDashStartWorld, visibleStartMeters);
            const farWorld = Math.min(visualDashEndWorld, visibleEndMeters);
            if (farWorld <= nearWorld) {
                continue;
            }

            const nearDepth = nearWorld - engineState.roadMeters;
            const farDepth = farWorld - engineState.roadMeters;
            const tNear = roadModel.screenRatioFromDepthMeters(nearDepth);
            const tFar = roadModel.screenRatioFromDepthMeters(farDepth);
            const yNear = horizon + tNear * (height - horizon);
            const yFar = horizon + tFar * (height - horizon);

            const mNear = roadModel.projectRoadSlice(tNear, width, engineState, engineState.roadMeters, nearWorld, engineState.playerX);
            const mFar = roadModel.projectRoadSlice(tFar, width, engineState, engineState.roadMeters, farWorld, engineState.playerX);
            const pixelsPerMeterNear = mNear.half / road.halfWidthMeters;
            const pixelsPerMeterFar = mFar.half / road.halfWidthMeters;
            const xNear = lerp(mNear.center - mNear.half, mNear.center + mNear.half, laneT) - road.leftShoulderLineOffsetMeters * pixelsPerMeterNear;
            const xFar = lerp(mFar.center - mFar.half, mFar.center + mFar.half, laneT) - road.leftShoulderLineOffsetMeters * pixelsPerMeterFar;
            const thickNear = lerp(0.75, 3.9, tNear);
            const thickFar = lerp(0.75, 3.9, tFar);

            ctx.beginPath();
            ctx.moveTo(xFar - thickFar, yFar);
            ctx.lineTo(xFar + thickFar, yFar);
            ctx.lineTo(xNear + thickNear, yNear);
            ctx.lineTo(xNear - thickNear, yNear);
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawOpponentBikeSprite(ctx, x, y, scale, color) {
        const width = 36 * scale;
        const height = 52 * scale;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.ellipse(0, height * 0.58, width * 0.46, height * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.fillRect(-width * 0.18, -height * 0.2, width * 0.36, height * 0.54);
        ctx.fillStyle = "#101316";
        ctx.fillRect(-width * 0.28, height * 0.08, width * 0.56, height * 0.24);
        ctx.fillStyle = "#d9dce2";
        ctx.fillRect(-width * 0.07, -height * 0.34, width * 0.14, height * 0.16);
        ctx.restore();
    }

    function drawPlayerBikeSprite(ctx, x, y, steerInput, isCrashing) {
        const lean = steerInput * 0.16;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(lean);

        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(0, 36, 62, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isCrashing ? "#ff4d6d" : "#ffb703";
        ctx.fillRect(-24, -24, 48, 54);
        ctx.fillStyle = "#11131a";
        ctx.fillRect(-34, 4, 68, 24);
        ctx.fillStyle = "#f5f8ff";
        ctx.fillRect(-10, -40, 20, 16);
        ctx.restore();
    }

    function renderRaceScene(ctx, canvas, engineState, steerInput, nowSec) {
        const width = canvas.width;
        const height = canvas.height;
        const horizon = height * 0.33;

        ctx.clearRect(0, 0, width, height);

        const sky = ctx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, "#7cc5ff");
        sky.addColorStop(0.55, "#5f9fff");
        sky.addColorStop(1, "#e4eeff");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, width, horizon);

        ctx.fillStyle = "#ffe089";
        ctx.beginPath();
        ctx.arc(width * 0.84, horizon * 0.36, 48, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 4; i += 1) {
            const mountainHeight = 70 + i * 14;
            const x = (i * width) / 3.1;
            ctx.fillStyle = i % 2 === 0 ? "#4b5f99" : "#596ca5";
            ctx.beginPath();
            ctx.moveTo(x - 220, horizon);
            ctx.lineTo(x, horizon - mountainHeight);
            ctx.lineTo(x + 220, horizon);
            ctx.closePath();
            ctx.fill();
        }

        const roadRows = 110;
        roadModel.ensureRoadSegmentsCoverDistance(engineState, engineState.roadMeters + 2000);

        for (let row = 0; row < roadRows; row += 1) {
            const t0 = row / roadRows;
            const t1 = (row + 1) / roadRows;
            const y0 = horizon + t0 * (height - horizon);
            const y1 = horizon + t1 * (height - horizon);
            const depthMeters0 = roadModel.depthMetersFromScreenRatio(t0);
            const depthMeters1 = roadModel.depthMetersFromScreenRatio(t1);
            const worldMeters0 = engineState.roadMeters + depthMeters0;
            const worldMeters1 = engineState.roadMeters + depthMeters1;
            const m0 = roadModel.projectRoadSlice(t0, width, engineState, engineState.roadMeters, worldMeters0, engineState.playerX);
            const m1 = roadModel.projectRoadSlice(t1, width, engineState, engineState.roadMeters, worldMeters1, engineState.playerX);
            const grassSegment = Math.floor(worldMeters0 / 6);
            const edgeMarkerCycleMeters = Math.max(0.1, road.edgeMarkerColorCycleMeters || 6);
            const edgeMarkerSegment = Math.floor(worldMeters0 / edgeMarkerCycleMeters);

            ctx.fillStyle = grassSegment % 2 === 0 ? "#3d9d36" : "#3aa032";
            ctx.fillRect(0, y0, width, y1 - y0 + 1);

            ctx.fillStyle = "#575961";
            ctx.beginPath();
            ctx.moveTo(m0.center - m0.half, y0);
            ctx.lineTo(m0.center + m0.half, y0);
            ctx.lineTo(m1.center + m1.half, y1);
            ctx.lineTo(m1.center - m1.half, y1);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = edgeMarkerSegment % 2 === 0 ? "#ffffff" : "#ff5d73";
            const leftRightMarker0 = roadModel.roadEdgeMarkerWidthPixels(m0.half);
            const leftRightMarker1 = roadModel.roadEdgeMarkerWidthPixels(m1.half);
            ctx.beginPath();
            ctx.moveTo(m0.center - m0.half, y0);
            ctx.lineTo(m0.center - m0.half + leftRightMarker0, y0);
            ctx.lineTo(m1.center - m1.half + leftRightMarker1, y1);
            ctx.lineTo(m1.center - m1.half, y1);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(m0.center + m0.half - leftRightMarker0, y0);
            ctx.lineTo(m0.center + m0.half, y0);
            ctx.lineTo(m1.center + m1.half, y1);
            ctx.lineTo(m1.center + m1.half - leftRightMarker1, y1);
            ctx.closePath();
            ctx.fill();
        }

        drawLaneDividerMarkers(ctx, width, height, horizon, engineState);
        drawLeftShoulderMarkers(ctx, width, height, horizon, engineState);
        drawCurveWarningSignLayer(ctx, width, height, horizon, engineState);

        const sortedTraffic = [...engineState.traffic].sort((a, b) => b.z - a.z);
        sortedTraffic.forEach((rider) => {
            if (rider.z < 8 || rider.z > 410) {
                return;
            }
            const p = 1 - rider.z / 410;
            const y = horizon + Math.pow(p, 1.8) * (height - horizon - 34);
            const t = clamp((y - horizon) / (height - horizon), 0, 1);
            const riderWorldMeters = engineState.roadMeters + roadModel.depthMetersFromScreenRatio(t);
            const { center, half } = roadModel.projectRoadSlice(t, width, engineState, engineState.roadMeters, riderWorldMeters, engineState.playerX);
            const x = center + rider.lane * half * 0.9;
            const scale = lerp(0.25, 1.12, Math.pow(p, 1.3));
            drawOpponentBikeSprite(ctx, x, y, scale, rider.color);
        });

        const playerX = width / 2 + engineState.playerX * roadModel.pixelsPerMeterAtDepth(width, road.nearMeters);
        drawPlayerBikeSprite(ctx, playerX, height - 66, steerInput, nowSec < engineState.crashUntil);
    }

    ns.renderer = {
        renderRaceScene
    };
})(window.HangTight = window.HangTight || {});
