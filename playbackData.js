import editor from "./editor.js";
import ruler from "./ruler.js"

const $scroller = $('.right-container');
const $ruler = $('.ruler-container');

const playback = {
    draw() {
        this.line = editor.canvas.line().stroke({ width: 2, color: 'red'}).hide().front()
        this.carrot = ruler.canvas.circle(10).fill('red').y(ruler.height / 2).hide().front()
    },
    intervalIndex: -1,
    _position: 0,
    bpm: 120,
    set position(val) {
        playback._position = val;
        playback.line.plot(val, 0, val, editor.numKeys * editor.zoomY).show();
        playback.carrot.cx(val).show()
    },
    get position() {
        return playback._position;
    },
    get playing() {
        return playback.intervalIndex != -1;
    },
    play(startPosition = playback.position) {
        let start = Date.now();
        playback.pause();
        playback.position = startPosition || playback.position;
        let measureLengthMs = (60000 * 4) / playback.bpm;
        let measureWidth = 16 * editor.zoomX;
        let fps = 29;
        playback.line.show().front()
        playback.carrot.show().front()

        playback.intervalIndex = setInterval(() => {
            let now = Date.now();
            let deltaMs = now - start;
            let measureCount = deltaMs / measureLengthMs;
            let posn = startPosition + measureWidth * measureCount;
            let screenPosn = Math.max(posn - 100, 0);
            $scroller.get()[0].scroll(screenPosn, $scroller.scrollTop());
            $ruler.get()[0].scroll(screenPosn, $ruler.scrollTop());

            playback.position = posn;
            if (posn >= editor.width * editor.zoomX) playback.stop();
        }, 1000 / fps);
    },
    pause() {
        clearInterval(playback.intervalIndex);
        playback.intervalIndex = -1;
    },
    stop() {
        playback.pause();
        playback.position = 0;
        playback.line.hide();
        playback.carrot.hide();
    }
}

export default playback

window.start = playback.start;
window.stop = playback.stop;
window.pause = playback.pause;