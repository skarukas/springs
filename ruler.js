import {disableMouseEvents} from "./util.js"
import editor from "./editor.js"
import playback from "./playbackData.js"
import style from "./style.js"

//const rulerHeight = 20;
//const rulerSVG = SVG().addTo('#ruler').size(editor.zoomX * editor.width, rulerHeight);

const ruler = {
    height: 20,
    draw() {
        ruler.canvas = SVG()
            .addTo('#ruler')
            .size(editor.zoomX * editor.width, ruler.height)
            .mousemove(e => {
                if (!playback.playing && e.buttons == 1) playback.position = e.offsetX;
            }).mousedown(e => {
                if (!playback.playing) playback.position = e.offsetX;
                editor.deselectAllObjects()
            });

        ruler.ticks = Array(editor.width).fill(0).map((_, i) => {
            if (i % 16 == 0) {
                let g = ruler.canvas.group();
                g.line(i * editor.zoomX, 0, i * editor.zoomX, 20)
                    .stroke({width: 1})
                    .stroke('black');
                let mm = g.text("" + Math.ceil((i+1) / 16))
                    .font(style.editorText)
                    .center((i+1) * editor.zoomX, 10);
                disableMouseEvents(mm);
                return g;
            }
        });
        ruler.barNumbers = null
    },
    zoom(zoomX, zoomY) {
        for (let i = 0; i < ruler.ticks.length; i++) {
            let height = (!(i % 2) + !(i % 4) + !(i % 8) + !(i % 16) + 1) * ruler.height/6;
            ruler.ticks[i]?.move(i * zoomX, 0);
        }
    }
}

export default ruler