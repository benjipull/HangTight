(function registerRaceGameApp(ns) {
    const { useEffect, useRef, useState } = React;
    const { ui } = ns.config;
    const { createEngineSound, syncEngineSound, disposeEngineSound } = ns.audio;
    const { createInitialGameState, resetGameState, stepSimulation } = ns.gameState;
    const { renderRaceScene } = ns.renderer;

    function RaceGameApp() {
        const canvasRef = useRef(null);
        const engineSoundRef = useRef(null);
        const controlsRef = useRef({
            left: false,
            right: false,
            accelerate: false,
            brake: false
        });
        const engineStateRef = useRef(createInitialGameState());

        const [hudState, setHudState] = useState({
            speed: 0,
            score: 0,
            timeLeft: ui.initialTimerSeconds,
            status: ui.initialStatus
        });

        useEffect(() => {
            resetGameState(engineStateRef.current);
        }, []);

        const ensureEngineSoundStarted = () => {
            if (!engineSoundRef.current) {
                engineSoundRef.current = createEngineSound();
            }

            if (engineSoundRef.current && engineSoundRef.current.context.state === "suspended") {
                engineSoundRef.current.context.resume();
            }
        };

        useEffect(() => {
            const onKeyDown = (event) => {
                if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
                    event.preventDefault();
                }

                ensureEngineSoundStarted();

                if (event.code === "KeyA" || event.key === "ArrowLeft") {
                    controlsRef.current.left = true;
                }
                if (event.code === "KeyD" || event.key === "ArrowRight") {
                    controlsRef.current.right = true;
                }
                if (event.code === "KeyW" || event.key === "ArrowUp") {
                    controlsRef.current.accelerate = true;
                }
                if (event.code === "KeyS" || event.key === "ArrowDown") {
                    controlsRef.current.brake = true;
                }
            };

            const onKeyUp = (event) => {
                if (event.code === "KeyA" || event.key === "ArrowLeft") {
                    controlsRef.current.left = false;
                }
                if (event.code === "KeyD" || event.key === "ArrowRight") {
                    controlsRef.current.right = false;
                }
                if (event.code === "KeyW" || event.key === "ArrowUp") {
                    controlsRef.current.accelerate = false;
                }
                if (event.code === "KeyS" || event.key === "ArrowDown") {
                    controlsRef.current.brake = false;
                }
            };

            const clearControls = () => {
                controlsRef.current.left = false;
                controlsRef.current.right = false;
                controlsRef.current.accelerate = false;
                controlsRef.current.brake = false;
            };

            window.addEventListener("keydown", onKeyDown);
            window.addEventListener("keyup", onKeyUp);
            window.addEventListener("blur", clearControls);
            return () => {
                window.removeEventListener("keydown", onKeyDown);
                window.removeEventListener("keyup", onKeyUp);
                window.removeEventListener("blur", clearControls);
            };
        }, []);

        useEffect(() => {
            return () => {
                disposeEngineSound(engineSoundRef.current);
                engineSoundRef.current = null;
            };
        }, []);

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) {
                return undefined;
            }

            const context = canvas.getContext("2d");
            if (!context) {
                return undefined;
            }

            const resizeCanvas = () => {
                const rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                canvas.width = Math.floor(rect.width * dpr);
                canvas.height = Math.floor((rect.width * 9) / 16 * dpr);
                context.setTransform(dpr, 0, 0, dpr, 0, 0);
            };

            resizeCanvas();
            const resizeObserver = new ResizeObserver(resizeCanvas);
            resizeObserver.observe(canvas);

            let animationFrame = 0;
            let lastFrameTimeMs = performance.now();
            let uiUpdateAccumulator = 0;

            const onFrame = (nowMs) => {
                const dt = Math.min((nowMs - lastFrameTimeMs) / 1000, 0.2);
                lastFrameTimeMs = nowMs;
                const nowSec = nowMs / 1000;
                const engineState = engineStateRef.current;
                const steeringInput = stepSimulation(engineState, controlsRef.current, dt, nowSec);
                syncEngineSound(engineSoundRef.current, engineState.speed, controlsRef.current.accelerate);
                renderRaceScene(context, canvas, engineState, steeringInput, nowSec);

                uiUpdateAccumulator += dt;
                if (uiUpdateAccumulator >= 0.08) {
                    uiUpdateAccumulator = 0;
                    setHudState({
                        speed: Math.round(engineState.speed),
                        score: Math.floor(engineState.score),
                        timeLeft: Math.ceil(engineState.timeLeft),
                        status: engineState.lastStatus
                    });
                }
                animationFrame = window.requestAnimationFrame(onFrame);
            };

            animationFrame = window.requestAnimationFrame(onFrame);
            return () => {
                resizeObserver.disconnect();
                window.cancelAnimationFrame(animationFrame);
            };
        }, []);

        const setControl = (name, value) => {
            if (value) {
                ensureEngineSoundStarted();
            }
            controlsRef.current[name] = value;
        };

        const restartGame = () => {
            resetGameState(engineStateRef.current);
        };

        return (
            <div className="game-shell">
                <div className="hud">
                    <div className="hud-block">
                        <span className="hud-label">Speed</span>
                        <span className="hud-value">{hudState.speed} km/h</span>
                    </div>
                    <div className="hud-block">
                        <span className="hud-label">Score</span>
                        <span className="hud-value emphasis">{hudState.score}</span>
                    </div>
                    <div className="hud-block">
                        <span className="hud-label">Time</span>
                        <span className="hud-value">{hudState.timeLeft}s</span>
                    </div>
                    <div className="status">{hudState.status}</div>
                </div>

                <div className="canvas-wrap">
                    <canvas className="race-canvas" ref={canvasRef} />
                </div>

                <div className="controls">
                    <button
                        className="control-btn"
                        onPointerDown={() => setControl("left", true)}
                        onPointerUp={() => setControl("left", false)}
                        onPointerCancel={() => setControl("left", false)}
                        onPointerLeave={() => setControl("left", false)}
                    >
                        LEFT
                    </button>
                    <button
                        className="control-btn"
                        onPointerDown={() => setControl("right", true)}
                        onPointerUp={() => setControl("right", false)}
                        onPointerCancel={() => setControl("right", false)}
                        onPointerLeave={() => setControl("right", false)}
                    >
                        RIGHT
                    </button>
                    <button
                        className="control-btn"
                        onPointerDown={() => setControl("accelerate", true)}
                        onPointerUp={() => setControl("accelerate", false)}
                        onPointerCancel={() => setControl("accelerate", false)}
                        onPointerLeave={() => setControl("accelerate", false)}
                    >
                        THROTTLE
                    </button>
                    <button
                        className="control-btn"
                        onPointerDown={() => setControl("brake", true)}
                        onPointerUp={() => setControl("brake", false)}
                        onPointerCancel={() => setControl("brake", false)}
                        onPointerLeave={() => setControl("brake", false)}
                    >
                        BRAKE
                    </button>
                    <button className="control-btn restart" onClick={restartGame}>RESTART</button>
                </div>
            </div>
        );
    }

    ns.ui = ns.ui || {};
    ns.ui.RaceGameApp = RaceGameApp;
})(window.HangTight = window.HangTight || {});
