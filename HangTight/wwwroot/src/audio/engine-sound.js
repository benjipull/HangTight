(function registerEngineSound(ns) {
    const { clamp, lerp } = ns.math;
    const { speed, audio } = ns.config;

    function createEngineSound() {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) {
            return null;
        }

        const context = new AudioContextCtor();
        const masterGain = context.createGain();
        masterGain.gain.value = 0;

        const engineFilter = context.createBiquadFilter();
        engineFilter.type = "lowpass";
        engineFilter.frequency.value = 900;
        engineFilter.Q.value = 0.9;

        const lowOscillator = context.createOscillator();
        lowOscillator.type = "sawtooth";
        lowOscillator.frequency.value = 52;

        const highOscillator = context.createOscillator();
        highOscillator.type = "square";
        highOscillator.frequency.value = 104;

        const lowGain = context.createGain();
        lowGain.gain.value = 0.18;
        const highGain = context.createGain();
        highGain.gain.value = 0.08;

        lowOscillator.connect(lowGain);
        highOscillator.connect(highGain);
        lowGain.connect(engineFilter);
        highGain.connect(engineFilter);
        engineFilter.connect(masterGain);
        masterGain.connect(context.destination);

        lowOscillator.start();
        highOscillator.start();

        return {
            context,
            masterGain,
            engineFilter,
            lowOscillator,
            highOscillator
        };
    }

    function syncEngineSound(engineSound, speedKmh, isThrottlePressed) {
        if (!engineSound) {
            return;
        }

        const speedRatio = clamp(speedKmh / speed.roadMaxKmh, 0, 1);
        const throttleBoost = isThrottlePressed ? 1.06 : 1;
        const baseFrequency = lerp(audio.minFrequencyHz, audio.maxFrequencyHz, speedRatio) * throttleBoost;
        const now = engineSound.context.currentTime;

        engineSound.lowOscillator.frequency.setTargetAtTime(baseFrequency, now, 0.05);
        engineSound.highOscillator.frequency.setTargetAtTime(baseFrequency * 2.02, now, 0.05);
        engineSound.engineFilter.frequency.setTargetAtTime(lerp(650, 3000, speedRatio), now, 0.06);
        engineSound.masterGain.gain.setTargetAtTime(lerp(0.0001, 0.34, speedRatio), now, 0.07);
    }

    function disposeEngineSound(engineSound) {
        if (!engineSound) {
            return;
        }

        const now = engineSound.context.currentTime;
        engineSound.masterGain.gain.setTargetAtTime(0.0001, now, 0.05);
        window.setTimeout(() => {
            try {
                engineSound.lowOscillator.stop();
                engineSound.highOscillator.stop();
                engineSound.context.close();
            } catch {
                // Ignore already-stopped audio resources.
            }
        }, 180);
    }

    ns.audio = {
        createEngineSound,
        syncEngineSound,
        disposeEngineSound
    };
})(window.HangTight = window.HangTight || {});
