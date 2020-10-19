import {disableMouseEvents} from "./util.js"
import editor from "./editor.js"
import playback from "./playbackData.js"
import style from "./style.js"

//const rulerHeight = 20;
//const rulerSVG = SVG().addTo('#ruler').size(editor.zoomX * editor.width, rulerHeight);

const ruler = {
    height: 20,
    scaleVal: 1,
    draw() {
        ruler.canvas = SVG()
            .addTo('#ruler')
            .size(editor.width, ruler.height)
            .mousemove(e => {
                if (!playback.playing && e.buttons == 1) playback.position = editor.canvas.point(e.x, e.y).x;
            }).mousedown(e => {
                if (!playback.playing) playback.position = editor.canvas.point(e.x, e.y).x;
                editor.deselectAllObjects()
            });
        this.svg = this.canvas

        ruler.ticks = Array(editor.widthInTime).fill(0).map((_, i) => {
            if (i % 16 == 0) {
                let g = ruler.canvas.group();
                g.line(i * editor.zoomX, 0, i * editor.zoomX, 20)
                    .stroke({width: 1})
                    .stroke('black');
                let measureNumber = g.text("" + Math.ceil((i+1) / 16))
                    .font(style.editorText)
                    .center((i+1) * editor.zoomX, 10);
                disableMouseEvents(measureNumber);
                return g;
            }
        });
        ruler.barNumbers = null
    },
    zoom(zoomX, zoomY) {
        for (let i = 0; i < ruler.ticks.length; i++) {
            ruler.ticks[i]?.move(i * zoomX, 0);
        }
    },
    scale(val) {
        for (let i = 0; i < ruler.ticks.length; i++) {
            ruler.ticks[i]?.move(i * val * editor.zoomX, 0);
        }
        this.scaleVal = val
    }, 
    scroll(x, y) {
        let $ruler = $('.ruler-container')
        $ruler.css('overflow', 'scroll');
        $ruler.scrollLeft(x);
        $ruler.css('overflow', 'hidden')
    }
}

export default ruler