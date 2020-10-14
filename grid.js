import editor from  "./editor.js"
import style from "./style.js"

const grid = {
    draw() {
        let canvas = editor.canvas.group();

        // draw horizontal lines
        let xLines = Array(128).fill(0).map((_, i) => {
            if ([1, 3, 6, 8, 10].includes(i % 12)) {
                // accidental
                return canvas.rect(editor.width * editor.zoomX, editor.zoomY)
                    .move(0, (editor.numKeys-(i+1)) * editor.zoomY)
                    .fill(style.keyDisplay.black.seqFillUnselected);
            } else {
                return canvas.rect(editor.width * editor.zoomX, editor.zoomY)
                    .move(0, (editor.numKeys-(i+1)) * editor.zoomY)
                    .fill(style.keyDisplay.white.seqFillUnselected);
            }
        });
        // draw vertical lines
        let yLines = Array(editor.width).fill(0).map((_, i) => {
            let width = (!(i % 2) + !(i % 4) + !(i % 8) + !(i % 16) + 1) / 2;
            let color = style.darkGrey
            return canvas.line(i * editor.zoomX, 0, i * editor.zoomX, editor.numKeys * editor.zoomY)
                        .stroke({width, color})
                        .opacity(0.3);
        });
        this.xLines = xLines;
        this.yLines = yLines;
        this.canvas = canvas;
        this.canvas.mouseup(() => {
            editor.selectObject()
        });
    },
    zoom(xZoom, yZoom) {
        if (this.canvas) {
            for (let i = 0; i < this.xLines.length; i++) {
                this.xLines[i]?.size(editor.width * xZoom, yZoom)
                    .move(0, (editor.numKeys-(i+1)) * yZoom);
            }
            for (let i = 0; i < this.yLines.length; i++) {
                this.yLines[i].plot(i * xZoom, 0, i * xZoom, editor.numKeys * yZoom);
            }
        }
    },
    highlightPitch(pitch, play=true, options) {
        if (this.canvas) {
            let horizontalBar = this.xLines[pitch];
            if (!horizontalBar) return;
            let fillColor = play? options.seqFillSelected : options.seqFillUnselected;
            horizontalBar.fill(fillColor);
        }
    }
}
export default grid;