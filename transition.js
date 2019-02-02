
class Transition {
    constructor(from, to, duration, delay = 0, timing = null) {
        this.startTime = Date.now() + delay;
        this.endTime = this.startTime + duration;
        this.from = from;
        this.to = to;
        this.current = from;
        this.timing = Transition.getTimingFunction(timing);
    }
    get value() {
        return this.current;
    }
    update() {
        var now = Date.now();
        if (now <= this.startTime) {
            this.current = this.from;
            return false;
        }
        if (now >= this.endTime) {
            this.current = this.to;
            return true;
        }
        var lambda = (now - this.startTime) / (this.endTime - this.startTime);
        this.current = this.from + this.timing(lambda) * (this.to - this.from);
        return false;
    }
    static defineTimingFunction(timing, fn) {
        this.timingFunctions[timing] = fn;
    }
    static getTimingFunction(timing) {
        if (typeof timing === 'function') return timing;
        if (typeof timing === 'string') {
            if (timing in this.timingFunctions) {
                return this.timingFunctions[timing];
            }
        }
        return this.timingFunctions[this.defaultTiming];
    }
}

Transition.timingFunctions = {};
Transition.defineTimingFunction('linear', (lambda) => lambda);
Transition.defaultTiming = 'linear';
