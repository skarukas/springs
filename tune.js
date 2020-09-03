(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.tune = factory());
}(this, (function () { 'use strict';

    const Util = {
        // ====== Math Utils ======
        /** Round `n` to a certain number of decimal `places`. */
        round: (n, places = 0) => {
            let c = Math.pow(10, places);
            return Math.round(n * c) / c;
        },
        /** Calculate the logarithm of `n` to a certain `base`. */
        log: (n, base) => Math.log(n) / Math.log(base),
        /** Calculate the log of `n`, base 2. */
        log2: (n) => Util.log(n, 2),
        /** Calculate the modulo of two numbers. In contrast to `%`, this never returns a negative number. */
        mod: (n, base) => {
            //correct for rounding err
            let m = (n % base);
            m = (Math.abs(m) < 1e-14) ? 0 : m;
            return (m + base) % base;
        },
        /**
         * Calculate the quotient and remainder when dividing two numbers
         * @returns A pair with the form `[quotient, remainder]`
         */
        divide: (n, d) => [Math.floor(n / d), Util.mod(n, d)],
        /**
         * Perform an operation analagous to modulo but with exponentiation instead of multiplication.
         * Essentially finds the "remainder" of calculating a logarithm.
         */
        powerMod: (n, base) => Math.pow(base, (Util.mod(Util.log(n, base), 1))),
        /** Calculate the next furthest integer away from zero. */
        absCeil: (n) => (n >= 0) ? Math.ceil(n) : Math.floor(n),
        // ====== Pitch / Frequency Conversion ======
        /** The frequency equal to A4 (MIDI note 69). */
        refA: 440,
        /**
         * Calculate the frequency representation of an equal-tempered pitch.
         * Equates MIDI pitch 69 with `Util.refA`, and equates all equal-tempered zero values.
         */
        ETToFreq: (pitch, base = 12) => Util.refA * Math.pow(2, (pitch / base - 69 / 12)),
        /**
         * Calculate the equal-tempered pitch representation of a frequency.
         * Equates MIDI pitch 69 with `Util.refA`, and equates all equal-tempered zero values.
         */
        freqToET: (freq, base = 12) => base * (Util.log2(freq / Util.refA) + 69 / 12),
        /**
         * Return the chromatic (12-ET) note name of a pitch.
         *
         * @param pitch A MIDI pitch.
         * @returns The note name as a string (always using sharps).
         */
        pitchToChromaticNoteName: (pitch) => {
            let noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
            let pitchClass = Math.round(Util.mod(pitch, 12));
            return noteNames[pitchClass];
        },
        /**
         * Convert a decimal to a fraction.
         * Give the rational approximation of a number using continued fractions.
         *
         * @param n A floating-point number.
         * @param places The number of places at which to round. Defaults to 9.
         *
         * @return A pair of numbers in the form `[numerator, denominator]`.
         */
        dtf(n, places = 9) {
            let err = Math.pow(10, -places);
            let x = n, a = Math.floor(x), h1 = 1, h2, k1 = 0, k2, h = a, k = 1;
            while (x - a > err * k * k) {
                x = 1 / (x - a);
                a = Math.floor(x);
                h2 = h1;
                h1 = h;
                k2 = k1;
                k1 = k;
                h = h2 + a * h1;
                k = k2 + a * k1;
            }
            return [h, k];
        },
        // ====== Prime Numbers ======
        /** All previously calculated prime numbers. */
        __primes__: [],
        /** Generate all prime numbers up to `limit` (inclusive). */
        primesUpTo(limit) {
            if (limit < 2)
                return [];
            let primes = Util.__primes__;
            let i = primes.length - 1;
            // select already generated primes less than limit
            /**
             * TODO: use binary search instead
             */
            if (i >= 0 && limit <= primes[i]) {
                while (limit < primes[i])
                    i--;
                return primes.slice(0, i + 1);
            }
            i = (i == -1) ? 2 : primes[i] + 1;
            // append primes up to limit
            outer: for (; i <= limit; i++) {
                for (let p of primes) {
                    if (p > Math.sqrt(i))
                        break;
                    if (i % p == 0)
                        continue outer;
                }
                primes.push(i);
            }
            return primes.slice();
        },
        /** Find the largest prime factor of an integer. */
        largestPrimeFactor(n) {
            if (n % 1 !== 0)
                return 1;
            let primes = Util.primesUpTo(n);
            for (let i = primes.length - 1; i >= 0; i--) {
                if (n % primes[i] == 0)
                    return primes[i];
            }
            return 1;
        },
        // ====== Array Utils ======
        /** Get all possible unordered pairs (2-combinations) of an array. */
        getPairs(arr) {
            let result = [];
            for (let i = 0; i < arr.length; i++) {
                for (let j = i + 1; j < arr.length; j++) {
                    result.push([arr[i], arr[j]]);
                }
            }
            return result;
        },
        /**
         * Find the minimum element in an array.
         *
         * @param lessThan Custom callback for comparing non-numeric types.
         *
         * @returns The minimum value and its index, wrapped in an object `{index, value}`.
         */
        getMin(arr, lessThan) {
            lessThan = (a, b) => a < b;
            let minIndex = 0, minValue = arr[0];
            for (let i = 0; i < arr.length; i++) {
                if (lessThan(arr[i], minValue)) {
                    minIndex = i;
                    minValue = arr[i];
                }
            }
            return { index: minIndex, value: minValue };
        },
        /** Check whether `index` is an integer in the interval `[0, length)`. */
        isValidIndex: (index, length) => (index >= 0) && (Util.mod(index, 1) == 0) && (index < length),
    };

    class PitchedObj {
        constructor() {
            this.__name__ = "";
        }
        /** Checks if two `PitchedObj`'s are the same size. */
        equals(other) {
            return this.cents() == other.cents();
        }
        toString() {
            return this.name;
        }
    }

    class Note extends PitchedObj {
        constructor() {
            super(...arguments);
            this.isStructural = false; // structural notes are not played back and exist purely to give structure to the pitch tree
        }
        /**
         * Returns a function that checks whether a `Note` is within a frequency range, inclusive.
         * The returned function can be passed to `Array.prototype.filter()`.
         */
        static inFreqRange(lo, hi) {
            return function (note) {
                let freq = note.getFrequency();
                return freq >= lo && freq <= hi;
            };
        }
        /**
         * Returns a function that checks whether a `Note` is within a 12ET pitch range, inclusive.
         * The returned function can be passed to `Array.prototype.filter()`.
         */
        static inPitchRange(lo, hi) {
            return function (note) {
                let pitch = note.getETPitch();
                return pitch >= lo && pitch <= hi;
            };
        }
        // not sure about this
        getAllNotes() {
            return [this];
        }
        /**
         * Create an equal division of an `Interval` into `div` parts, place them above the note,
         * and collect the resulting `Notes` in an array.
         *
         * @param interval The interval to divide
         * @param div The number of divisons
         */
        dividedNotesAbove(interval, div) {
            let innerCount = Math.ceil(div) - 1, divided = interval.divide(div), result = [], curr = this;
            // add all divided bits
            for (let i = 0; i < innerCount; i++) {
                curr = curr.noteAbove(divided);
                result.push(curr);
            }
            // add the top note
            result.push(this.noteAbove(interval));
            return result;
        }
        /**
         * Create an equal division of an `Interval` into `div` parts, place them below the note,
         * and collect the resulting `Notes` in an array.
         *
         * @param interval The interval to divide
         * @param div The number of divisons
         */
        dividedNotesBelow(interval, div) {
            return this.dividedNotesAbove(interval.inverse(), div);
        }
        /** Return the `Note` that is a given `Interval` below. */
        noteBelow(interval) {
            return this.noteAbove(interval.inverse());
        }
        /** Return the `FreqRatio` between this `Note` and another. */
        intervalTo(other) {
            return new FreqRatio(other.getFrequency(), this.getFrequency());
        }
        getRoot() { return this; }
        asFrequency() {
            return new Frequency(this.getFrequency());
        }
        asET(base) {
            return new ETPitch(this.getETPitch(base), base);
        }
        errorInET(base = 12, from = new MIDINote(0)) {
            let interval = from.intervalTo(this);
            return interval.errorInET(base);
        }
        cents() {
            return (new ETPitch(0)).intervalTo(this).cents();
        }
        connect(other, by) {
            let result = new TreeComponent(this);
            return result.connect(other, by);
        }
    }

    /**
     * A `Note` with no pitch, used for interval structures without a definite transposition.
     */
    class NullNote extends Note {
        /** Either an empty string or a custom name. */
        get name() {
            return this.__name__;
        }
        set name(val) { this.__name__ = val; }
        /** Does nothing. */
        transposeBy(interval) { }
        /** Returns a new `NullNote`. */
        noteAbove(interval) {
            return new NullNote();
        }
        /** Returns `NaN`. */
        getETPitch(base) {
            return NaN;
        }
        /** Returns `NaN`. */
        getFrequency() {
            return NaN;
        }
        /** Returns `null`. */
        intervalTo(other) {
            return null;
        }
        /** Returns `null`. */
        asFrequency() {
            return null;
        }
        /** Returns `null`. */
        asET() {
            return null;
        }
        /** Returns `NaN`. */
        errorInET(base = 12, from) {
            return NaN;
        }
        /** Returns `NaN`. */
        cents() {
            return NaN;
        }
    }

    class Frequency extends Note {
        constructor(freq) {
            super();
            this.freq = freq;
            if (!(freq > 0))
                throw new RangeError("Frequencies must be greater than zero.");
        }
        /** The frequency of the note, e.g. "500 Hz"  */
        get name() {
            return this.__name__ || this.freq.toFixed() + " Hz";
        }
        /** or a custom name. */
        set name(val) { this.__name__ = val; }
        noteAbove(interval) {
            let copy = new this.constructor(this.freq);
            copy.transposeBy(interval);
            return copy;
        }
        transposeBy(interval) {
            this.freq *= interval.asFrequency().decimal();
        }
        getETPitch(base = 12) {
            return Util.freqToET(this.freq, base);
        }
        getFrequency() {
            return this.freq;
        }
    }

    class ETPitch extends Note {
        constructor(pitch, base = 12) {
            super();
            this.pitch = pitch;
            this.base = base;
            if (isNaN(pitch / base))
                throw new RangeError("ET pitch indices must be numeric.");
            if (base == 0)
                throw new RangeError("Cannot create an equal division of base zero.");
        }
        /** The chromatic note name, e.g. "C#"  */
        get name() {
            return this.__name__ || Util.pitchToChromaticNoteName(this.getETPitch());
        }
        /** or a custom name. */
        set name(val) { this.__name__ = val; }
        noteAbove(interval) {
            let newPitch = this.pitch + interval.asET(this.base).n;
            return new this.constructor(newPitch, this.base);
        }
        transposeBy(interval) {
            this.pitch += interval.asET(this.base).n;
        }
        getETPitch(base = 12) {
            return this.pitch * base / this.base;
        }
        getFrequency() {
            return Util.ETToFreq(this.pitch, this.base);
        }
        intervalTo(other) {
            return new ETInterval(other.getETPitch(this.base) - this.pitch, this.base);
        }
    }
    Note.middleC = new ETPitch(60);

    class MIDINote extends ETPitch {
        constructor(pitch, velocity = 60) {
            super(pitch);
            this.pitch = pitch;
            this.velocity = velocity;
        }
    }

    class AbstractComponent {
        constructor(root) {
            this.root = root;
        }
        getRoot() { return this.root; }
        getAllNotes() { return this.notes; }
        getNoteByName(name) {
            for (let note of this.notes) {
                if (note.name == name)
                    return note;
            }
        }
        transposeBy(interval) {
            for (let note of this.notes)
                note.transposeBy(interval);
        }
        filter(callback) {
            return this.notes.filter(callback);
        }
    }

    class TreeComponent extends AbstractComponent {
        setInterval(a, b, interval) {
            let diff = interval.subtract(a.intervalTo(b)), descendants = this.getSubTree(b, a);
            // transpose b and all its descendants (to preserve other intervals)
            for (let note of descendants)
                note.transposeBy(diff);
        }
        getNeighbors(note) {
            return this.edges.get(note).keys();
        }
        getSubTree(curr = this.getRoot(), parent) {
            let result = [curr];
            // DFS style tree traversal
            for (let note of this.getNeighbors(curr)) {
                if (note != parent)
                    result = result.concat(this.getSubTree(note, curr));
            }
            return result;
        }
        // BFS traversal, may be useful at some point
        /*     transposeTree(interval: Interval, curr: Note = this.root, parent?: Note): void {
                let neighbors: IterableIterator<Note> = this.edges.get(curr).keys();
                for (let note of neighbors) {
                    if (note != parent) {
                        note.transposeBy(interval);
                        this.transposeTree(interval, note, curr);
                    }
                }
            } */
        connect(other, by) {
            let a = this.getRoot(), b = other.getRoot();
            by = by || a.intervalTo(b);
            // copy all edges and notes into this instance
            this.notes = this.notes.concat(other.getAllNotes());
            if (other instanceof TreeComponent) {
                for (let [key, val] of other.edges)
                    this.edges.set(key, val);
            }
            else {
                this.edges.set(b, new Map());
            }
            // connect b and a
            this.edges.get(a).set(b, by);
            this.edges.get(b).set(a, by.inverse());
            // adjust connected bit
            let diff = by.subtract(a.intervalTo(b));
            other.transposeBy(diff);
            return this;
        }
        add() {
            /**
             *
             * do something here
             */
        }
        remove(v) {
            let hasKey = this.edges.delete(v);
            if (hasKey) {
                for (let m of this.edges.values())
                    m.delete(v);
                // reassess roots etc.??
                //
                //
            }
            return hasKey;
        }
    }

    class Fraction {
        constructor(n, d = 1) {
            this.n = n;
            this.d = d;
        }
        toString() {
            return `${this.n}/${this.d}`;
        }
        static dtf(n) {
            let [a, b] = Util.dtf(n);
            return new Fraction(a, b);
        }
        simplified() {
            return null;
        }
        decimal() { return this.n / this.d; }
        plus(other) { return Fraction.dtf(this.decimal() + other.decimal()); }
        minus(other) { return Fraction.dtf(this.decimal() - other.decimal()); }
        times(other) { return Fraction.dtf(this.decimal() * other.decimal()); }
        divide(other) { return Fraction.dtf(this.decimal() / other.decimal()); }
    }

    /**
     * An interval with a size and mathematical operations that work in the pitch/log-frequency domain.
     *
     * Designed to be immutable.
     */
    class Interval extends PitchedObj {
        // ====== static comparison functions for sorting ======
        /**
         * Compare two intervals by size, producing a number.
         * A positive result means `a` is larger, and vice versa.
         *
         * Used for sorting.
         */
        static compareSize(_a, _b) {
            let a = _a.asET(), b = _b.asET();
            return a.n - b.n;
        }
        /**
         * Compare two intervals by complexity of their frequency ratios, producing a number.
         * A positive result means `a` is more complex, and vice versa.
         *
         * Used for sorting.
         */
        static compareComplexity(_a, _b) {
            let a = _a.asFrequency(), b = _b.asFrequency(), x = a.largestPrimeFactor(), y = b.largestPrimeFactor();
            return (x != y) ? x - y : (a.n + a.d) - (b.n + b.d);
        }
        /** Compress it to be an ascending interval less than an octave. */
        normalized() {
            return this.mod(Interval.octave);
        }
        /** Flip the direction of the interval. */
        inverse() {
            return this.multiply(-1);
        }
        /** Subtract the other interval from this interval. */
        subtract(other) {
            return this.add(other.inverse());
        }
        /** Divide the interval by a certain number. */
        divide(n) {
            return this.multiply(1 / n);
        }
        /** Divide the interval by another Interval. */
        divideByInterval(other) {
            return this.cents() / other.cents();
        }
        cents() {
            return Util.round(this.asET().n * 100, 2);
        }
        /** Returns the `ETInterval` closest in size. */
        getNearestET(base = 12) {
            let et = this.asET(base);
            et.n = Math.round(et.n);
            return et;
        }
        errorInET(base = 12) {
            let et = this.getNearestET(base);
            return this.subtract(et).cents();
        }
    }

    /** Any `Interval` type that has an internal `Fraction` representation, whether in pitch or frequency space. */
    class FracInterval extends Interval {
        constructor(n, d = 1) {
            super();
            this.frac = new Fraction(n, d);
        }
        get n() { return this.frac.n; }
        get d() { return this.frac.d; }
        set n(val) { this.frac.n = val; }
        set d(val) { this.frac.d = val; }
    }

    /**
     * An representation of an interval that stores the number of steps in a certain "ET" system.
     *
     * *immutable*
     */
    class ETInterval extends FracInterval {
        constructor(steps, base = 12) {
            super(steps, base);
            this.base = base;
            if (isNaN(steps / base))
                throw new RangeError("ET pitch indices must be numeric.");
            if (base <= 0)
                throw new RangeError("Cannot create an equal division with base <= 0.");
        }
        /** The size in steps (interval class) and base, e.g. "4 [12ET]", */
        get name() {
            return this.__name__ || `${this.n.toFixed(2)} [${this.d}ET]`;
        }
        /** or a custom name. */
        set name(val) { this.__name__ = val; }
        /**
         * Creates a string representation of the interval class, e.g. "4 [12ET]""
         */
        toString() {
            return this.name;
        }
        mod(modulus) {
            let other = modulus.asET(this.base), remainder = Util.mod(this.n, other.n);
            return new this.constructor(remainder, this.d);
        }
        multiply(factor) {
            if (isNaN(factor))
                throw new RangeError("Factors must be numeric.");
            return new this.constructor(this.n * factor, this.d);
        }
        asFrequency() {
            let decimal = Math.pow(2, (this.n / this.base));
            let [a, b] = Util.dtf(decimal);
            return new FreqRatio(a, b);
        }
        asET(base = 12) {
            if (base == this.base)
                return this;
            return new ETInterval(this.frac.decimal() * base, base);
        }
        inverse() {
            return new this.constructor(-this.n, this.d);
        }
        add(other) {
            let _other = other.asET(this.base);
            return new this.constructor(this.n + _other.n, this.base);
        }
    }

    /**
     * An representation of an interval as a frequency ratio.
     *
     * *immutable*
     */
    class FreqRatio extends FracInterval {
        // FreqRatio methods
        constructor(n, d = 1) {
            if (!(n > 0 && d > 0))
                throw new RangeError("Frequency ratios must be positive.");
            // simplify ratio
            if (n % 1 || d % 1) {
                [n, d] = Util.dtf(n / d);
            }
            super(n, d);
        }
        /** The frequency ratio, e.g. "3:2", */
        get name() {
            return this.__name__ || this.n + ":" + this.d;
        }
        /** or a custom name. */
        set name(val) { this.__name__ = val; }
        /** Creates a `FreqRatio` from a `Fraction`. */
        static fromFraction(frac) {
            return new FreqRatio(frac.n, frac.d);
        }
        /** Returns the largest prime number involved in the ratio. */
        largestPrimeFactor() {
            // turn it into a ratio of integers
            let norm = this.normalized();
            return Util.largestPrimeFactor(norm.n * norm.d);
        }
        /** Return the frequency ratio as a decimal. */
        decimal() {
            return this.frac.decimal();
        }
        valueOf() {
            return `${this.n}:${this.d}`;
        }
        mod(modulus) {
            let decimalBase = modulus.asFrequency().decimal(), remainder = Util.powerMod(this.decimal(), decimalBase);
            return new this.constructor(remainder);
        }
        multiply(factor) {
            if (isNaN(factor))
                throw new RangeError("Factors must be numeric.");
            return new this.constructor(Math.pow(this.n, factor), Math.pow(this.d, factor));
        }
        asFrequency() { return this; }
        asET(base = 12) {
            let num = base * Util.log2(this.decimal());
            return new ETInterval(num, base);
        }
        inverse() {
            return new this.constructor(this.d, this.n);
        }
        add(other) {
            let ratio = other.asFrequency(), product = this.frac.times(ratio.frac);
            return FreqRatio.fromFraction(product);
        }
    }
    Interval.octave = new FreqRatio(2);

    class IntervalStructure {
        constructor() {
            this.edges = new Map();
        }
    }

    // seperate class for non-null notes?
    class IntervalTree extends IntervalStructure {
        constructor(root = new NullNote()) {
            super();
            this.root = root;
            this.edges.set(root, new Map());
        }
        /**
         * Generate an ET scale as an `IntervalTree`, connected like a linked list.
         *
         * @param base The number of divisions per octave.
         * @param root The `Note` upon which to start the scale. The default value is a `NullNote`, which creates a purely structural `IntervalTree`.
         */
        static ET(base, root = new NullNote()) {
            let result = (root instanceof NullNote) ? new IntervalTree(root) : new RootedIntervalTree(root);
            let curr = root;
            for (let i = 0; i < base - 1; i++) {
                curr = result.connectAbove(curr, new ETInterval(1, base));
            }
            return result;
        }
        /**
         * Generate a set of partials from the harmonic series.
         *
         * @param range Range of partial numbers, either specified as an upper bound (inclusive) or an array
         * @param fundamental The `Note` to set as the fundamental (root of the tree). The default value is a `NullNote`, which creates a purely structural `IntervalTree`.
         */
        static harmonicSeries(range, fundamental = new NullNote()) {
            let result = (fundamental instanceof NullNote) ? new IntervalTree(fundamental) : new RootedIntervalTree(fundamental);
            fundamental.isStructural = true;
            if (typeof range == "number") {
                // Array of numbers from 1 to range, inclusive
                range = Array.from(Array(range), (_, i) => i + 1);
            }
            for (let i of range) {
                if (i == 1)
                    fundamental.isStructural = false;
                result.connectAbove(result.root, new FreqRatio(i));
            }
            return result;
        }
        getAllNotes() {
            return Array.from(this.edges.keys());
        }
        addEdge(from, by, to) {
            this.edges.get(from).set(to, by);
            this.edges.set(to, new Map());
            this.edges.get(to).set(from, by.inverse());
        }
        /**
         * Check if the `IntervalTree` contains the specified `Note`, either by reference or by frequency value.
         *
         * @param note The `Note` to search for.
         */
        contains(note) {
            // check by reference
            if (this.getAllNotes().indexOf(note) != -1)
                return true;
            // check by frequency value
            for (let n of this.getAllNotes()) {
                if (n.equals(note))
                    return true;
            }
            return false;
        }
        /**
         * Create a new `Note` a certain interval from a note already in the tree, and add it.
         *
         * @param from The `Note` to connect from
         * @param by The `Interval` to connect by
         * @returns The newly created `Note`.
         */
        connectAbove(from, by) {
            if (this.contains(from)) {
                let newNote = from.noteAbove(by);
                this.addEdge(from, by, newNote);
                return newNote;
            }
            else {
                throw new Error("Cannot connect from a note not in tree.");
            }
        }
        connectBelow(from, by) {
            return this.connectAbove(from, by.inverse());
        }
        // doesn't work for pitch collections, only NullNotes
        inverse() {
            let result = new IntervalTree(this.root);
            for (let a of this.edges.keys()) {
                result.edges.set(a, new Map());
                let map = this.edges.get(a);
                let resultMap = result.edges.get(a);
                for (let b of map.keys()) {
                    resultMap.set(b, map.get(b).inverse());
                }
            }
            return result;
        }
        getNeighbors(note) {
            return this.edges.get(note).keys();
        }
        getInterval(from, to) {
            return this.edges.get(from).get(to);
        }
        withRoot(root) {
            let result = new RootedIntervalTree(root), thisQueue = [this.root], resultQueue = [root], visited = new Map();
            for (let note of this.getAllNotes())
                visited.set(note, false);
            while (thisQueue.length) {
                let c1 = thisQueue.pop(), c2 = resultQueue.pop();
                visited.set(c1, true);
                for (let neighbor of this.getNeighbors(c1)) {
                    if (!visited.get(neighbor)) {
                        // add the current interval to get the next note
                        let currInterval = this.getInterval(c1, neighbor);
                        let next = result.connectAbove(c2, currInterval);
                        thisQueue.unshift(neighbor);
                        resultQueue.unshift(next);
                    }
                }
            }
            return result;
        }
    }

    class RootedIntervalTree extends IntervalTree {
        inverse() {
            return super.inverse().withRoot(this.root);
        }
        constructor(root) {
            super(root);
        }
    }

    /**
     * Higher level functions for dealing with equal-tempered collections.
     */
    const ET = {
        /**
         * Generate the equally divided (n-ET) scale that best approximates the given `Interval` or `Notes`.
         * `Notes` are compared to a fixed scale beginning on C, `MIDIPitch(0)`.
         *
         * @param pitched `Note(s)` or `Interval(s)`
         * @param maxBase The maximum number of divisions of the octave. Defaults to 53.
         *
         * @return The ET base whose scale best approximates the given pitch(es).
         */
        bestFitET(pitched, maxBase = 53) {
            if (!(pitched instanceof Array))
                pitched = [pitched];
            let best = 0, minError = Infinity;
            for (let base = 1; base <= maxBase; base++) {
                let error = ET.errorInET(pitched, base);
                if (error < minError) {
                    best = base;
                    minError = error;
                }
            }
            return best;
        },
        /**
         * Generate the equally divided (n-ET) scales that best approximate the given `Interval` or `Notes`.
         * `Notes` are compared to a fixed scale beginning on C, `MIDIPitch(0)`.
         *
         * @param pitched `Note(s)` or `Interval(s)`
         * @param maxBase The maximum number of divisions of the octave. Defaults to 53.
         * @param howMany How many bases to return.
         *
         * @return An array of ET bases, sorted by the degree to which they fit the input.
         */
        bestFitETs(pitched, maxBase = 53, howMany = 10) {
            if (!(pitched instanceof Array))
                pitched = [pitched];
            if (howMany < 1)
                howMany = maxBase;
            let errorArr = [];
            for (let base = 1; base <= maxBase; base++) {
                let error = ET.errorInET(pitched, base);
                errorArr.push([base, error]);
            }
            // sort by ascending error, or base if error is equal
            let sorted = errorArr.sort((a, b) => (a[1] === b[1]) ? a[0] - b[0] : a[1] - b[1]);
            return sorted.map((pair) => pair[0]).slice(0, howMany);
        },
        /**
         * Calculate the mean error of a set of pitches compared to `base`-ET.
         * `Notes` are compared to a fixed scale beginning on C, `MIDIPitch(0)`.
         * @param pitched `Note(s)` or `Interval(s)`
         * @param base Number of divisions for the equally divided scaled. Defaults to 12.
         * @param metric Error measure, either `rms` (Root Mean Square Error) or `abs` (Mean Absolute Error)
         *
         * @returns The mean error in cents.
         */
        errorInET(pitched, base = 12, metric = "rms") {
            if (!(pitched instanceof Array))
                pitched = [pitched];
            let sum = 0;
            metric = metric.toLowerCase();
            if (metric == "rms") {
                for (let pitch of pitched)
                    sum += Math.pow(pitch.errorInET(base), 2);
                sum = Math.sqrt(sum);
            }
            else if (metric == "abs") {
                for (let pitch of pitched)
                    sum += Math.abs(pitch.errorInET(base));
            }
            return sum / pitched.length;
        },
        /**
         * Calculates the step size in cents for an equal division of the octave.
         */
        stepSizeForET(base) {
            return (new ETInterval(1, base)).cents();
        }
    };

    const JI = {
        third: new FreqRatio(5, 4),
        fifth: new FreqRatio(3, 2),
        seventh: new FreqRatio(7, 4),
        eleventh: new FreqRatio(11, 8)
    };

    /** Namespace for methods that perform various types of adaptive tuning operations. */
    const AdaptiveTuning = {
        /*
        // ====== Timbre-based Analysis ======
        currTimbre: null,

        calculateDissonance(notes: Note[]) {
            // assuming it's practical to implement sethares's algorithm
        },
        */
        /**
         * Find the subset of the harmonic series that most closely matches the provided pitch collection.
         *
         * @param notes The pitches to be analyzed.
         * @param error Allowable rounding error (in semitones).
         *
         * @returns An object containing calculated partial numbers of the input array as well as the fundamental frequency in Hertz.
         */
        bestFitPartials(notes, error = 0.5) {
            let freqs = notes.map(n => n.getFrequency());
            return AdaptiveTuning.bestFitPartialsFromFreq(freqs, error);
        },
        /**
         * Find the subset of the harmonic series that most closely matches the provided pitch collection.
         *
         * @param freqs An array of pitches to be analyzed, expressed in Hertz.
         * @param error Allowable rounding error (in semitones).
         *
         * @returns An object containing calculated partial numbers of the input array as well as the fundamental frequency in Hertz.
         */
        bestFitPartialsFromFreq(freqs, error = 0.5) {
            let min = Util.getMin(freqs).value, ratios = freqs.map(n => n / min), partials = Array(freqs.length), i = 1;
            for (;; i++) {
                let j;
                for (j = 0; j < freqs.length; j++) {
                    let partial = ratios[j] * i, freqError = partial / Math.round(partial), pitchError = 12 * Util.log2(freqError);
                    if (Math.abs(pitchError) < error)
                        partials[j] = Math.round(partial);
                    else
                        break;
                }
                if (j == freqs.length)
                    break;
            }
            let fundamental = min / i;
            return {
                partials,
                fundamental,
                asTree() {
                    return IntervalTree.harmonicSeries(partials, new Frequency(fundamental));
                }
            };
        }
    };

    /**
     * Maps integers (MIDI pitches) to `Notes` according a musical scale.
     * Intervals of repetition may be set for both the input (`notesPerOctave`) and the output (`octaveSize`).
     *
     * Scales are modified by passing `set()` a sample input and a `Note` or `Interval` from the root to map it to.
     *
     * Alternatively, they can be modified by passing `setByIndex()` a scale index and an `Interval` relative to the root.
     *
     * Examples:
     * - `new Scale(19)` creates an octave-repeating 19 note scale which may be mapped to any intervals (defaults to 19TET).
     * - `new Scale(12, JI.fifth)` creates a 12-note scale that repeats at a fifth and whose 12 indices
     *    may be remapped to any interval smaller than a fifth (defaults to equal division).
     */
    class Scale {
        constructor(notesPerOctave = 12, octaveSize = Interval.octave, middleCPitch = Note.middleC.asET(notesPerOctave)) {
            /**
             * The input note at which to begin the scale.
             * Any integer equivalent mod `notesPerOctave` will produce the same result.
             */
            this.root = 60;
            /**
             * `Scale.fixedInput` and `Scale.fixedOutput` create the link between the input `number`
             *   and the output `Note` and determine the pitch level of the output.
             */
            this.fixedInput = 60;
            if (!Number.isInteger(notesPerOctave))
                throw new Error("Number of notes per octave must be an integer.");
            this.octaveSize = octaveSize;
            this.notesPerOctave = notesPerOctave;
            this.map = new Array(notesPerOctave);
            this.equallyDivide(); // default to `notesPerOctave`-ET
            this.setRoot(60);
            this.setFixedMapping(60, middleCPitch);
        }
        /**
         * Retrieve a `Note` from the input `number` using the `Scale`'s predefined mapping.
         *
         * @param input The `number` whose corresponding `Note` should be retrieved.
         * @return The corresponding `Note`.
         */
        get(input) {
            if (!Number.isInteger(input))
                throw new Error("Scale inputs must be integers.");
            let diff = input - this.root, [numOctaves, index] = Util.divide(diff, this.notesPerOctave), interval = this.getIntervalByScaleIndex(index), rootNote = this.getRootNote(), scaledInterval = interval.add(this.octaveSize.multiply(numOctaves));
            return rootNote.noteAbove(scaledInterval);
        }
        /**
         * Map an input `number` to a certain `Note`.
         * Modifies the octave-repeating scale.
         *
         * @param input An integer (MIDI pitch) that will map to `value`.
         * @param value May either be specified as an `Interval` above the root or as a `Note`, whose difference from middle C is used.
         * @return `this`
         */
        set(input, value) {
            if (!Number.isInteger(input))
                throw new Error("Scale inputs must be integers.");
            // get index within input scale
            let modIndex = Util.mod(input - this.root, this.notesPerOctave), 
            // create interval from the root note (if not already an interval)
            interval = (value instanceof Note) ? this.getRootNote().intervalTo(value) : value;
            if (modIndex == 0)
                throw new Error("Can't change the root of a mapping");
            // resize interval to be within scale range and set value
            this.map[modIndex] = interval.mod(this.octaveSize);
            return this;
        }
        /**
         * Change the `Interval`, from the root, of a certain `Note` in the scale.
         * Modifies the octave-repeating scale.
         *
         * @param index The scale index to change, an integer from 0 to `Scale.notesPerOctave`-1
         * @param value The `Interval` above the root to set it to. Values larger than `Scale.octaveSize` will be transposed.
         * @return `this`
         */
        setByIndex(index, value) {
            if (!Util.isValidIndex(index, this.notesPerOctave))
                throw new RangeError("Scale indices must be integers in the range [0, notesPerOctave).");
            this.map[index] = value.mod(this.octaveSize);
            return this;
        }
        /**
         * Transpose the entire scale to map `input` directly to `output`.
         * In contrast to `set()`, this does NOT alter the scale's interval content.
         *
         * @param input The input number
         * @param output The sounding `Note` `input` should map to.
         */
        setFixedMapping(input, output) {
            // Transpose `input` and `output` until `input` is an index in the scale range
            let [numOctaves, index] = Util.divide(input, this.notesPerOctave);
            // set these as the Scale's reference input and output
            this.fixedInput = index;
            this.fixedOutput = output.noteBelow(this.octaveSize.multiply(numOctaves));
            return this;
        }
        /**
         * Set the input index at which to begin the scale.
         * Essentially changes the "key" of the scale.
         * Any integer congruent mod `notesPerOctave` will produce the same result.
         */
        setRoot(root) {
            if (!Number.isInteger(root))
                throw new RangeError("Input values must be integers.");
            this.root = Util.mod(root, this.notesPerOctave);
            return this;
        }
        /** Set the scale indices to be entirely equal-tempered `Intervals` according to `Scale.notesPerOctave`. */
        equallyDivide() {
            let base = this.notesPerOctave, step = this.octaveSize.equals(Interval.octave) ? new ETInterval(1, base) : this.octaveSize.divide(base).asET(base);
            for (let i = 0; i < base; i++)
                this.map[i] = step.multiply(i);
        }
        /** Retrieves the `Interval` by an index with validation. */
        getIntervalByScaleIndex(index) {
            let valid = Util.isValidIndex(index, this.notesPerOctave);
            if (valid)
                return this.map[index];
            else
                throw new RangeError("Index out of range. This should not happen unless notesPerOctave was modified.");
        }
        /** Retrieve the root as a `Note`.*/
        getRootNote() {
            let diff = this.fixedInput - this.root, [numOctaves, index] = Util.divide(diff, this.notesPerOctave), fixedInterval = this.getIntervalByScaleIndex(index);
            return this.fixedOutput.noteBelow(fixedInterval.add(this.octaveSize.multiply(numOctaves)));
        }
        /** Display the Scale as a set of `Intervals` */
        toString() {
            return this.map.toString();
        }
    }

    /** Namespace for static code, to avoid problems due to module loading order. */
    {
        // create a chromatic just scale
        let chromatic = new IntervalTree();
        let c, g, d, f;
        c = chromatic.root;
        g = chromatic.connectAbove(c, JI.fifth);
        d = chromatic.connectAbove(g, JI.fifth);
        f = chromatic.connectBelow(c, JI.fifth);
        chromatic.connectAbove(f, JI.third); // a
        chromatic.connectAbove(c, JI.third); // e
        chromatic.connectAbove(g, JI.third); // b
        chromatic.connectAbove(d, JI.third); // f#
        chromatic.connectBelow(f, JI.third); // db
        chromatic.connectBelow(c, JI.third); // ab
        chromatic.connectBelow(g, JI.third); // eb
        chromatic.connectBelow(d, JI.third); // bb
        IntervalTree.chromaticFiveLimit = chromatic;
        // create a diatonic just scale
        let diatonic = new IntervalTree();
        c = diatonic.root;
        g = diatonic.connectAbove(c, JI.fifth);
        d = diatonic.connectAbove(g, JI.fifth);
        f = diatonic.connectBelow(c, JI.fifth);
        diatonic.connectAbove(f, JI.third);
        diatonic.connectAbove(c, JI.third);
        diatonic.connectAbove(g, JI.third);
        IntervalTree.diatonicFiveLimit = diatonic;
    }

    const tune = {
        // classes
        ETPitch: callableClass(ETPitch),
        MIDINote: callableClass(MIDINote),
        Frequency: callableClass(Frequency),
        NullNote: callableClass(NullNote),
        IntervalTree: callableClass(IntervalTree),
        Note: callableClass(Note),
        Scale: callableClass(Scale),
        ETInterval: callableClass(ETInterval),
        FreqRatio: callableClass(FreqRatio),
        // namespaces
        JI: JI,
        Util: Util,
        ET: ET,
        AdaptiveTuning: AdaptiveTuning,
    };
    /**
     * Makes the `new` keyword optional for a class.
     */
    function callableClass(MyClass) {
        return new Proxy(MyClass, {
            apply: (target, thisArg, argumentsList) => new target(...argumentsList)
        });
    }

    return tune;

})));
