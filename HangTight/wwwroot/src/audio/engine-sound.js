(function registerEngineSound(ns) {
    const { clamp, lerp } = ns.math;
    const { speed, audio } = ns.config;

    function createNoiseBuffer(context) {
        const bufferSize = context.sampleRate * 2;
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i += 1) {
            channelData[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    function createEngineSound() {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) {
            return null;
        }

        const context = new AudioContextCtor();
        const masterGain = context.createGain();
        masterGain.gain.value = 0;

        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.knee.value = 12;
        compressor.ratio.value = 4.5;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.22;

        const engineBus = context.createGain();
        engineBus.gain.value = 0.94;

        const toneFilter = context.createBiquadFilter();
        toneFilter.type = "lowpass";
        toneFilter.frequency.value = 1200;
        toneFilter.Q.value = 1.1;

        const bodyFilter = context.createBiquadFilter();
        bodyFilter.type = "bandpass";
        bodyFilter.frequency.value = 180;
        bodyFilter.Q.value = 0.8;

        const mainOscillator = context.createOscillator();
        mainOscillator.type = "sawtooth";
        mainOscillator.frequency.value = 60;
        const midOscillator = context.createOscillator();
        midOscillator.type = "triangle";
        midOscillator.frequency.value = 120;
        const highOscillator = context.createOscillator();
        highOscillator.type = "sawtooth";
        highOscillator.frequency.value = 182;
        const subOscillator = context.createOscillator();
        subOscillator.type = "square";
        subOscillator.frequency.value = 32;

        const mainGain = context.createGain();
        mainGain.gain.value = 0.1;
        const midGain = context.createGain();
        midGain.gain.value = 0.06;
        const highGain = context.createGain();
        highGain.gain.value = 0.025;
        const subGain = context.createGain();
        subGain.gain.value = 0.045;

        const noiseSource = context.createBufferSource();
        noiseSource.buffer = createNoiseBuffer(context);
        noiseSource.loop = true;

        const noiseHighpass = context.createBiquadFilter();
        noiseHighpass.type = "highpass";
        noiseHighpass.frequency.value = 180;
        const noiseBandpass = context.createBiquadFilter();
        noiseBandpass.type = "bandpass";
        noiseBandpass.frequency.value = 700;
        noiseBandpass.Q.value = 0.7;
        const noiseGain = context.createGain();
        noiseGain.gain.value = 0.01;

        const skidHighpass = context.createBiquadFilter();
        skidHighpass.type = "highpass";
        skidHighpass.frequency.value = 900;
        const skidBandpass = context.createBiquadFilter();
        skidBandpass.type = "bandpass";
        skidBandpass.frequency.value = 1800;
        skidBandpass.Q.value = 0.9;
        const skidGain = context.createGain();
        skidGain.gain.value = 0.0001;

        mainOscillator.connect(mainGain);
        midOscillator.connect(midGain);
        highOscillator.connect(highGain);
        subOscillator.connect(subGain);

        mainGain.connect(toneFilter);
        midGain.connect(toneFilter);
        highGain.connect(toneFilter);
        subGain.connect(bodyFilter);
        bodyFilter.connect(toneFilter);

        noiseSource.connect(noiseHighpass);
        noiseHighpass.connect(noiseBandpass);
        noiseBandpass.connect(noiseGain);
        noiseGain.connect(toneFilter);

        noiseSource.connect(skidHighpass);
        skidHighpass.connect(skidBandpass);
        skidBandpass.connect(skidGain);
        skidGain.connect(compressor);

        toneFilter.connect(engineBus);
        engineBus.connect(compressor);
        compressor.connect(masterGain);
        masterGain.connect(context.destination);

        mainOscillator.start();
        midOscillator.start();
        highOscillator.start();
        subOscillator.start();
        noiseSource.start();

        return {
            context,
            masterGain,
            toneFilter,
            bodyFilter,
            noiseBandpass,
            noiseGain,
            skidBandpass,
            skidGain,
            mainGain,
            midGain,
            highGain,
            subGain,
            mainOscillator,
            midOscillator,
            highOscillator,
            subOscillator,
            noiseSource,
            throttleBlend: 0
        };
    }

    function syncEngineSound(engineSound, speedKmh, isThrottlePressed, skidIntensity = 0) {
        if (!engineSound) {
            return;
        }

        const speedRatio = clamp(speedKmh / speed.roadMaxKmh, 0, 1);
        const skidRatio = clamp(skidIntensity, 0, 1);
        const targetThrottle = isThrottlePressed ? 1 : 0;
        engineSound.throttleBlend = lerp(engineSound.throttleBlend, targetThrottle, 0.22);

        const throttleBoost = lerp(0.98, 1.1, engineSound.throttleBlend);
        const jitterHz = (Math.random() - 0.5) * lerp(0.3, 2.4, speedRatio);
        const baseFrequency = lerp(audio.minFrequencyHz, audio.maxFrequencyHz, speedRatio) * throttleBoost + jitterHz;
        const now = engineSound.context.currentTime;

        engineSound.mainOscillator.frequency.setTargetAtTime(Math.max(20, baseFrequency), now, 0.045);
        engineSound.midOscillator.frequency.setTargetAtTime(Math.max(40, baseFrequency * 2.01), now, 0.045);
        engineSound.highOscillator.frequency.setTargetAtTime(Math.max(60, baseFrequency * 3.02), now, 0.045);
        engineSound.subOscillator.frequency.setTargetAtTime(Math.max(16, baseFrequency * 0.5), now, 0.045);

        engineSound.mainGain.gain.setTargetAtTime(lerp(0.06, 0.16, speedRatio), now, 0.07);
        engineSound.midGain.gain.setTargetAtTime(lerp(0.035, 0.085, speedRatio), now, 0.07);
        engineSound.highGain.gain.setTargetAtTime(
            lerp(0.008, 0.035, speedRatio) * lerp(0.8, 1.2, engineSound.throttleBlend),
            now,
            0.07
        );
        engineSound.subGain.gain.setTargetAtTime(lerp(0.025, 0.058, speedRatio), now, 0.07);

        engineSound.toneFilter.frequency.setTargetAtTime(
            lerp(900, 4300, speedRatio) + engineSound.throttleBlend * 700,
            now,
            0.08
        );
        engineSound.bodyFilter.frequency.setTargetAtTime(lerp(140, 420, speedRatio), now, 0.08);
        engineSound.noiseBandpass.frequency.setTargetAtTime(
            lerp(580, 2550, speedRatio) + engineSound.throttleBlend * 800,
            now,
            0.08
        );
        engineSound.noiseGain.gain.setTargetAtTime(
            lerp(0.003, 0.03, speedRatio) * lerp(0.65, 1.35, engineSound.throttleBlend),
            now,
            0.09
        );
        engineSound.skidBandpass.frequency.setTargetAtTime(lerp(1200, 3200, speedRatio), now, 0.08);
        engineSound.skidGain.gain.setTargetAtTime(lerp(0.0001, 0.22, skidRatio) * lerp(0.5, 1, speedRatio), now, 0.06);
        engineSound.masterGain.gain.setTargetAtTime(lerp(0.0001, 0.4, speedRatio), now, 0.08);
    }

    function disposeEngineSound(engineSound) {
        if (!engineSound) {
            return;
        }

        const now = engineSound.context.currentTime;
        engineSound.masterGain.gain.setTargetAtTime(0.0001, now, 0.05);
        window.setTimeout(() => {
            try {
                engineSound.mainOscillator.stop();
                engineSound.midOscillator.stop();
                engineSound.highOscillator.stop();
                engineSound.subOscillator.stop();
                engineSound.noiseSource.stop();
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
