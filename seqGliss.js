import { simpleBezierPath } from "./util.js"
import style from "./style.js"

export default class SeqGliss {
    constructor(start, end) {
        this.startNote = start;
        this.endNote = end;
    }
    draw(canvas) {
        this.canvas = canvas
        let color, width;
        if (this.startNote.xEnd >= this.endNote.x) {
            color = 'red'
            width = 2
        } else {
            color = this.canvas.gradient('linear', add => {
                add.stop(0, style.noteFill(this.startNote));
                add.stop(1, style.noteFill(this.endNote));
            });
            width = editor.zoomY
        }
        this.path = canvas.path(simpleBezierPath(
                {x: this.startNote.xEnd, y: this.startNote.y + editor.zoomY / 2}, 
                {x: this.endNote.x, y: this.endNote.y + editor.zoomY / 2}, 'horizontal'))
            .stroke({color, width})
            .fill('none')
            .opacity(0.6)
            .insertAfter(this.startNote.rect)
            .insertAfter(this.endNote.rect);
    }
    updateGraphics() {
        this.redrawPosition()
    }
    redrawPosition() {
        let color, width;
        if (this.startNote.xEnd >= this.endNote.x) {
            color = 'red'
            width = 2
        } else {
            color = this.canvas.gradient('linear', add => {
                add.stop(0, style.noteFill(this.startNote));
                add.stop(1, style.noteFill(this.endNote));
            });
            width = editor.zoomY
        }
        this.path.plot(simpleBezierPath(
                {x: this.startNote.xEnd, y: this.startNote.y + editor.zoomY / 2}, 
                {x: this.endNote.x, y: this.endNote.y + editor.zoomY / 2}, 'horizontal'))
            .stroke({color, width});
    }
}