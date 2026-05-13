(function configureGameNamespace(ns) {
    // Road: number of lanes on the road.
    const ROAD_LANE_COUNT = 2;
    // Road: width of a single lane in meters.
    const ROAD_LANE_WIDTH_METERS = 3.6;
    // Road: distance to the near clipping point in meters.
    const ROAD_NEAR_METERS = 2;
    // Road: distance to the far clipping point in meters.
    const ROAD_FAR_METERS = 160;
    // Road: available curve profiles for generated segments.
    const ROAD_CURVE_PROFILES = [
        { key: "slight", angleDegrees: 120, distanceMeters: 500 },
        { key: "sharp", angleDegrees: 240, distanceMeters: 500 },
        { key: "very-sharp", angleDegrees: 360, distanceMeters: 500 },
        { key: "straight", angleDegrees: 0, distanceMeters: 500 }
    ];
    // Road: curve blending distance between profiles in meters.
    const ROAD_CURVE_TRANSITION_METERS = 60;
    // Road: width of edge marker stripes in meters.
    const ROAD_EDGE_MARKER_WIDTH_METERS = 0.5;
    // Road: color cycle length for edge markers in meters.
    const ROAD_EDGE_MARKER_COLOR_CYCLE_METERS = 1;
    // Road: inset of the shoulder line from road edge in meters.
    const ROAD_LEFT_SHOULDER_LINE_OFFSET_METERS = 0.2;
    // Road: half-screen ratio used for near-road projection width.
    const ROAD_NEAR_HALF_SCREEN_RATIO = 0.48;

    // Traffic: available opponent bike colors.
    const TRAFFIC_BIKE_COLORS = ["#ffd166", "#f94144", "#43aa8b", "#90be6d", "#f3722c"];
    // Traffic: number of opponent bikes to spawn.
    const TRAFFIC_OPPONENT_COUNT = 0;

    // Lane divider markers: painted marker length in meters.
    const LANE_DIVIDER_MARKER_LENGTH_METERS = 3;
    // Lane divider markers: gap between markers in meters.
    const LANE_DIVIDER_MARKER_GAP_METERS = 9;
    // Lane divider markers: visual stretch multiplier for marker length.
    const LANE_DIVIDER_VISUAL_LENGTH_MULTIPLIER = 1;

    // Warning signs: distance before a switch warning appears, in meters.
    const WARNING_SIGNS_SWITCH_WARNING_DISTANCE_METERS = 100;
    // Warning signs: world-scale multiplier for sign rendering.
    const WARNING_SIGNS_SCALE_MULTIPLIER = 1;
    // Warning signs: base sign size in meters.
    const WARNING_SIGNS_SIZE_METERS = 1;
    // Warning signs: minimum on-screen size in pixels.
    const WARNING_SIGNS_MIN_SCREEN_SIZE_PX = 10;
    // Warning signs: maximum on-screen size in pixels.
    const WARNING_SIGNS_MAX_SCREEN_SIZE_PX = 90;
    // Warning signs: max visibility range in meters.
    const WARNING_SIGNS_VISIBILITY_METERS = 320;
    // Warning signs: near clipping distance in meters.
    const WARNING_SIGNS_NEAR_CLIP_METERS = 0.5;
    // Warning signs: lateral grass offset in meters.
    const WARNING_SIGNS_GRASS_OFFSET_METERS = 0.42;

    // Goal posts: distance interval between goal posts in meters.
    const GOAL_POSTS_INTERVAL_METERS = 5000;
    // Goal posts: time bonus granted at each goal post, in seconds.
    const GOAL_POSTS_TIME_BONUS_SECONDS = 60;
    // Goal posts: post height in meters.
    const GOAL_POSTS_POST_HEIGHT_METERS = 5.2;
    // Goal posts: post thickness in meters.
    const GOAL_POSTS_POST_THICKNESS_METERS = 0.25;
    // Goal posts: shoulder offset from road edge in meters.
    const GOAL_POSTS_SHOULDER_OFFSET_METERS = 0.35;

    // Speed: maximum speed on the road in km/h.
    const SPEED_ROAD_MAX_KMH = 240;
    // Speed: maximum speed on grass in km/h.
    const SPEED_GRASS_MAX_KMH = 60;

    // Physics: acceleration rate in km/h per second.
    const PHYSICS_ACCELERATION_RATE = 240 / 15;
    // Physics: passive speed loss when coasting, in km/h per second.
    const PHYSICS_COAST_DECELERATION_RATE = 22;
    // Physics: speed loss while braking, in km/h per second.
    const PHYSICS_BRAKE_DECELERATION_RATE = 160;
    // Physics: additional off-road speed bleed in km/h per second.
    const PHYSICS_OFFROAD_SPEED_BLEED_RATE = 210;
    
    //So basically these two items mean that at 120km/h on a 240 curve.  
    // The bike will be in an equilibrium balance and stay put. 
    // Physics: reference curve angle used for lateral pull tuning.
    const PHYSICS_PULL_REFERENCE_ANGLE_DEGREES = 240;
    // Physics: reference speed used for lateral pull tuning in km/h.
    const PHYSICS_PULL_REFERENCE_SPEED_KMH = 120;
    // Physics: pull-ratio threshold where skidding begins.
    const PHYSICS_SKID_START_PULL_RATIO = 1;
    // Physics: pull-ratio where skidding reaches full intensity.
    const PHYSICS_SKID_FULL_PULL_RATIO = 1.55;

    // Physics: multiplier for converting gameplay speed to world motion.
    const PHYSICS_VISUAL_WORLD_SPEED_MULTIPLIER = 3;

    // Audio: minimum engine tone frequency in hertz.
    const AUDIO_MIN_FREQUENCY_HZ = 45;
    // Audio: maximum engine tone frequency in hertz.
    const AUDIO_MAX_FREQUENCY_HZ = 190;

    // UI: initial status message shown before play.
    const UI_INITIAL_STATUS = "Use W/A/S/D or arrows.";
    // UI: initial race timer in seconds.
    const UI_INITIAL_TIMER_SECONDS = 75;
    // UI: status message shown at race start.
    const UI_GAME_START_STATUS = "Hold THROTTLE to start.";

    // Road: half of the total road width in meters.
    const ROAD_HALF_WIDTH_METERS = (ROAD_LANE_COUNT * ROAD_LANE_WIDTH_METERS) * 0.5;
    // Road: longest curve profile distance in meters.
    const ROAD_MAX_CURVE_PROFILE_DISTANCE_METERS = Math.max(...ROAD_CURVE_PROFILES.map((profile) => profile.distanceMeters));
    // Road: furthest lateral player position allowed in meters.
    const ROAD_PLAYER_LATERAL_LIMIT_METERS = ROAD_HALF_WIDTH_METERS + 1.4;
    // Traffic: lane-centered spawn offsets in meters.
    const TRAFFIC_LANE_SPAWN_OFFSETS = buildLaneCenterOffsetsMeters(ROAD_LANE_COUNT, ROAD_LANE_WIDTH_METERS);

    function buildLaneCenterOffsetsMeters(laneCount, laneWidthMeters) {
        const totalWidthMeters = laneCount * laneWidthMeters;
        const leftEdgeMeters = -totalWidthMeters * 0.5;
        return Array.from(
            { length: laneCount },
            (_, laneIndex) => leftEdgeMeters + (laneIndex + 0.5) * laneWidthMeters
        );
    }

    ns.config = Object.freeze({
        road: Object.freeze({
            laneCount: ROAD_LANE_COUNT,
            laneWidthMeters: ROAD_LANE_WIDTH_METERS,
            halfWidthMeters: ROAD_HALF_WIDTH_METERS,
            nearMeters: ROAD_NEAR_METERS,
            farMeters: ROAD_FAR_METERS,
            curveProfiles: ROAD_CURVE_PROFILES,
            maxCurveProfileDistanceMeters: ROAD_MAX_CURVE_PROFILE_DISTANCE_METERS,
            curveTransitionMeters: ROAD_CURVE_TRANSITION_METERS,
            edgeMarkerWidthMeters: ROAD_EDGE_MARKER_WIDTH_METERS,
            edgeMarkerColorCycleMeters: ROAD_EDGE_MARKER_COLOR_CYCLE_METERS,
            leftShoulderLineOffsetMeters: ROAD_LEFT_SHOULDER_LINE_OFFSET_METERS,
            playerLateralLimitMeters: ROAD_PLAYER_LATERAL_LIMIT_METERS,
            nearRoadHalfScreenRatio: ROAD_NEAR_HALF_SCREEN_RATIO
        }),
        traffic: Object.freeze({
            bikeColors: TRAFFIC_BIKE_COLORS,
            laneSpawnOffsets: TRAFFIC_LANE_SPAWN_OFFSETS,
            opponentCount: TRAFFIC_OPPONENT_COUNT
        }),
        laneDividerMarkers: Object.freeze({
            lengthMeters: LANE_DIVIDER_MARKER_LENGTH_METERS,
            gapMeters: LANE_DIVIDER_MARKER_GAP_METERS,
            visualLengthMultiplier: LANE_DIVIDER_VISUAL_LENGTH_MULTIPLIER
        }),
        warningSigns: Object.freeze({
            switchWarningDistanceMeters: WARNING_SIGNS_SWITCH_WARNING_DISTANCE_METERS,
            signScaleMultiplier: WARNING_SIGNS_SCALE_MULTIPLIER,
            signSizeMeters: WARNING_SIGNS_SIZE_METERS,
            minScreenSizePx: WARNING_SIGNS_MIN_SCREEN_SIZE_PX,
            maxScreenSizePx: WARNING_SIGNS_MAX_SCREEN_SIZE_PX,
            visibilityMeters: WARNING_SIGNS_VISIBILITY_METERS,
            nearClipMeters: WARNING_SIGNS_NEAR_CLIP_METERS,
            grassOffsetMeters: WARNING_SIGNS_GRASS_OFFSET_METERS
        }),
        goalPosts: Object.freeze({
            intervalMeters: GOAL_POSTS_INTERVAL_METERS,
            timeBonusSeconds: GOAL_POSTS_TIME_BONUS_SECONDS,
            postHeightMeters: GOAL_POSTS_POST_HEIGHT_METERS,
            postThicknessMeters: GOAL_POSTS_POST_THICKNESS_METERS,
            shoulderOffsetMeters: GOAL_POSTS_SHOULDER_OFFSET_METERS
        }),
        speed: Object.freeze({
            roadMaxKmh: SPEED_ROAD_MAX_KMH,
            grassMaxKmh: SPEED_GRASS_MAX_KMH
        }),
        physics: Object.freeze({
            accelerationRate: PHYSICS_ACCELERATION_RATE,
            coastDecelerationRate: PHYSICS_COAST_DECELERATION_RATE,
            brakeDecelerationRate: PHYSICS_BRAKE_DECELERATION_RATE,
            offroadSpeedBleedRate: PHYSICS_OFFROAD_SPEED_BLEED_RATE,
            pullReferenceAngleDegrees: PHYSICS_PULL_REFERENCE_ANGLE_DEGREES,
            pullReferenceSpeedKmh: PHYSICS_PULL_REFERENCE_SPEED_KMH,
            skidStartPullRatio: PHYSICS_SKID_START_PULL_RATIO,
            skidFullPullRatio: PHYSICS_SKID_FULL_PULL_RATIO,
            visualWorldSpeedMultiplier: PHYSICS_VISUAL_WORLD_SPEED_MULTIPLIER
        }),
        audio: Object.freeze({
            minFrequencyHz: AUDIO_MIN_FREQUENCY_HZ,
            maxFrequencyHz: AUDIO_MAX_FREQUENCY_HZ
        }),
        ui: Object.freeze({
            initialStatus: UI_INITIAL_STATUS,
            initialTimerSeconds: UI_INITIAL_TIMER_SECONDS,
            gameStartStatus: UI_GAME_START_STATUS
        })
    });
})(window.HangTight = window.HangTight || {});
