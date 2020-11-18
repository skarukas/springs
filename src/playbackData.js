import editor from "./editor.js";
import ruler from "./ruler.js";
import style from "./style.js"

/**
 * Handles playback display and data,
 * doesn't interact with the WebAudio API
 */
const playback = {
    draw() {
        this.line = editor.canvas.line()
            .stroke({ width: 2, color: 'red'})
            .opacity(0.6)
            .hide()
            .front()
        let d = 8
        //this.caret = ruler.canvas.polygon(`0, 0 ${w}, 0  ${w/2+1}, ${h} ${w/2-1}, ${h}`)
        this.caret = ruler.canvas.circle(d)
            .y(ruler.height - d)
            .fill('red')
            .opacity(0.6)
            .hide()
            .front()
    }, 
    intervalIndex: -1,
    _position: 0,
    bpm: 120,
    ticksPerBeat: 4,    // 16th division
    beatsPerMeasure: 4, // in 4/4
    scaleVal: 1,
    scale(val) {
        this.scaleVal = val
    },
    set position(val) {
        playback._position = val;
        playback.line.plot(val, 0, val, editor.numKeys * editor.zoomY).show();
        playback.caret.cx(val * this.scaleVal).show()
    },
    get position() {
        return playback._position;
    },
    get playing() {
        return playback.intervalIndex != -1;
    },
    /* Play from the current position of the playback line or a specified point */
    play(startPosition = playback.position) {
        let start = Date.now();
        playback.pause();
        playback.position = startPosition || playback.position;
        let measureLengthMs = (60000 * this.beatsPerMeasure) / playback.bpm;
        let measureWidth = this.ticksPerBeat * this.beatsPerMeasure * editor.zoomX;
        let fps = 29;
        playback.line.show().front()
        playback.caret.show().front()

        playback.intervalIndex = setInterval(() => {
            let now = Date.now();
            let deltaMs = now - start;
            let measureCount = deltaMs / measureLengthMs;
            let posn = startPosition + measureWidth * measureCount;

            playback.position = posn;
            if (posn >= editor.width) playback.stop();
        }, 1000 / fps);
    },
    /* Pause playback */
    pause() {
        clearInterval(playback.intervalIndex);
        playback.intervalIndex = -1;
    },
    /* Stop playback */
    stop() {
        playback.pause();
        playback.position = 0;
        playback.line.hide();
        playback.caret.hide();
    },
    /* Convert the number of ticks to seconds */
    MIDITimeToSeconds(ticks) {
        return (60 * ticks) / (this.bpm * this.ticksPerBeat)
    }
}

export default playback