Number.prototype.clamp = function(lo, hi) {
    return Math.max(lo, Math.min(this, hi))
}

/**
 * Add a graphical tooltip to the given 
 * element (either a jQuery object, svg element, DOM node, or selector)
 */
export function addTooltip(elem, text) {
    $(elem).attr("title", text).addClass("has-tooltip")
}

/**
 * Create a cubic bezier path between two 
 * points, returned as a string.
 * 
 * @param { {x: number, y: number} } start The start position
 * @param { {x: number, y: number} } end The end position
 * @param { "horizontal" | "vertical" } orientation 
 * @param { number } easingFactor How "curvy" to make the path
 */
export function simpleBezierPath(start, end, orientation, easingFactor=0.25) {
    // 0.01 is added b/c beziers disappear when they're completely straight
    if (orientation == 'vertical') {
        let ctrlPtOffset = (end.y - start.y) * easingFactor;
        return`M ${start.x} ${start.y} 
               C ${start.x + .01} ${start.y + ctrlPtOffset}
                 ${end.x + .01} ${end.y - ctrlPtOffset} 
                 ${end.x} ${end.y}`;
    } else {
        let ctrlPtOffset = (end.x - start.x) * easingFactor;
        return `M ${start.x} ${start.y} 
                C ${start.x + ctrlPtOffset} ${start.y + .01}
                  ${end.x - ctrlPtOffset} ${end.y + .01} 
                  ${end.x} ${end.y}`;
    }
}

/** Return the "ruler" tool's bracket-like path, as a string. */
export function rulerPath(start, end) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}
            M ${start.x - 5} ${start.y} L ${start.x + 5} ${start.y}
            M ${end.x - 5} ${end.y} L ${end.x + 5} ${end.y}`
}

export function normAscendingInterval(interval) {
    /* if (interval.cents() < 0) interval = interval.inverse(); */
    return interval.normalized();
}

// quick-and dirty default 5 limit intervals
const fiveLimitScale = [
    tune.FreqRatio(1, 1),
    tune.FreqRatio(16, 15),
    tune.FreqRatio(9, 8),
    tune.FreqRatio(6, 5),
    tune.FreqRatio(5, 4),
    tune.FreqRatio(4, 3),
    tune.FreqRatio(45, 32),
    tune.FreqRatio(3, 2),
    tune.FreqRatio(8, 5),
    tune.FreqRatio(5, 3),
    tune.FreqRatio(16, 9),
    tune.FreqRatio(15, 8)
];

/** Return a JI adjustment of the 
 * interval between two MIDI numbers, `lo` and `hi`.
 * */
export function guessJIInterval(lo, hi) {
    if (lo > hi) [hi, lo] = [lo, hi]
        
    let idx = (((hi - lo) % 12) + 12) % 12;
    let octaves = Math.floor((hi - lo) / 12);
    let ji = fiveLimitScale[idx];
    let interval = ji

    return interval.add(tune.ETInterval.octave.multiply(octaves));
}

/** Display a message to the user with a certain `color`. */
export function addMessage(text, color='black') {
    let a = $(document.createElement('p'))
        .text(text)
        .addClass('warning')
        .css({color})
        .appendTo($('.warn-container'))
    a.delay(3000).fadeOut(2000, () => a.remove())
}

/** Get the pitch name of a MIDI pitch, optionally including the octave number. */
export function pitchName(pitch, includeOctave=false) {
    const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let result = pitchNames[tune.Util.mod(Math.round(pitch),12)]
    if (includeOctave) result += Math.floor(pitch / 12)
    return result
}

/** Turn a string into an interval.
 * 
 *  Valid formats of `text`:
 *   - `"n#d"` = `tune.ETInterval(n, d)`
 *   - `"n:d"` = `tune.FreqRatio(n, d)`
 *   - `"n c"` = `tune.Cents(n)` **NOT YET SUPPORTED
*/
export function parseIntervalText(text) {
    let ratioPattern = /^(?<num>[\d\.]+)\s?[:/]\s?(?<den>[\d\.]+)\s*$/
    let etPattern = /^(?<num>-?[\d\.]+)\s?#\s?(?<den>[\d\.]+)\s*$/
    let centPattern = /^(?<cents>-?[\d\.]+)\s*c$/

    if (ratioPattern.test(text)) {
        let g = ratioPattern.exec(text).groups
        return tune.FreqRatio(parseFloat(g.num), parseFloat(g.den))
    } else if (etPattern.test(text)) {
        let g = etPattern.exec(text).groups
        return tune.ETInterval(parseFloat(g.num), parseFloat(g.den))
    } else if (centPattern.test(text)) {
        // cents not yet supported
        let cents = centPattern.exec(text).groups.cents
        return false
    }
    return false
}