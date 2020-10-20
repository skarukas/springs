Number.prototype.clamp = function(lo, hi) {
    return Math.max(lo, Math.min(this, hi))
}

export function disableMouseEvents(svgElement) {
    svgElement.css({'pointer-events':'none','user-select': 'none'})
}

export function mousePosn(e) {
    return {
        x: e.offsetX,
        y: e.offsetY
    }
}

export function simpleBezierPath(start, end, orientation) {
    // 0.01 is added b/c beziers can't be completely straight
    if (orientation == 'vertical') {
        let ctrlPtOffset = (end.y - start.y) / 4;
        return`M ${start.x} ${start.y} 
               C ${start.x + .01} ${start.y + ctrlPtOffset}
                 ${end.x + .01} ${end.y - ctrlPtOffset} 
                 ${end.x} ${end.y}`;
    } else {
        let ctrlPtOffset = (end.x - start.x) / 4;
        return `M ${start.x} ${start.y} 
                C ${start.x + ctrlPtOffset} ${start.y + .01}
                  ${end.x - ctrlPtOffset} ${end.y + .01} 
                  ${end.x} ${end.y}`;
    }
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

export function guessJIInterval(lo, hi) {
    if (lo > hi) [hi, lo] = [lo, hi]
        
    let idx = (((hi - lo) % 12) + 12) % 12;
    let octaves = Math.floor((hi - lo) / 12);
    let ji = fiveLimitScale[idx];
    let interval = ji

    return interval.add(tune.ETInterval.octave.multiply(octaves));
}

export function addMessage(text, color='black') {
    let a = $(document.createElement('p'))
        .text(text)
        .addClass('warning')
        .css({color})
        .appendTo($('.warn-container'))
    a.delay(1000).fadeOut(2000, () => a.remove())
}

export function addButton(text, parent=$('#controls-container')) {
    return $(document.createElement('button'))
        .text(text)
        .appendTo(parent)
}

export function pitchName(pitch, includeOctave=false) {
    const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let result = pitchNames[tune.Util.mod(Math.round(pitch),12)]
    if (includeOctave) result += Math.floor(pitch / 12) - 1
    return result
}

export function parseIntervalText(text) {
    let ratioPattern = /^(?<num>[\d\.]+)\s?[:/]\s?(?<den>[\d\.]+)\s*$/
    let etPattern = /^(?<num>-?[\d\.]+)\s?#\s?(?<den>[\d\.]+)\s*$/
    let centPatttern = /^(?<cents>-?[\d\.]+)\s*c$/


    if (ratioPattern.test(text)) {
        let g = ratioPattern.exec(text).groups
        return tune.FreqRatio(parseFloat(g.num), parseFloat(g.den))
    } else if (etPattern.test(text)) {
        let g = etPattern.exec(text).groups
        return tune.ETInterval(parseFloat(g.num), parseFloat(g.den))
    } else if (centPatttern.test(text)) {
        let cents = centPatttern.exec(text).groups.cents
        return cents
    }
    return false
}