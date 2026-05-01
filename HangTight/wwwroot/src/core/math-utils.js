(function registerMathUtils(ns) {
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function lerp(start, end, t) {
        return start + (end - start) * t;
    }

    function pickRandomItem(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    ns.math = {
        clamp,
        lerp,
        pickRandomItem
    };
})(window.HangTight = window.HangTight || {});
