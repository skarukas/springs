import { simpleBezierPath } from "./util.js"
import style from "./style.js"

export default class SeqGliss {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
    draw(canvas) {
        this.canvas = canvas
        let color, width;
        if (this.start.xEnd >= this.end.x) {
            color = 'red'
            width = 2
        } else {
            color = this.canvas.gradient('linear', add => {
                add.stop(0, style.noteFill(this.start));
                add.stop(1, style.noteFill(this.end));
            });
            width = editor.zoomY
        }
        this.path = canvas.path(simpleBezierPath(
                {x: this.start.xEnd, y: this.start.y + editor.zoomY / 2}, 
                {x: this.end.x, y: this.end.y + editor.zoomY / 2}, 'horizontal'))
            .stroke({color, width})
            .fill('none')
            .opacity(0.6)
            .insertAfter(this.start.rect)
            .insertAfter(this.end.rect);
    }
    updateGraphics() {
        this.redrawPosition()
    }
    redrawPosition() {
        let color, width;
        if (this.start.xEnd >= this.end.x) {
            color = 'red'
            width = 2
        } else {
            color = this.canvas.gradient('linear', add => {
                add.stop(0, style.noteFill(this.start));
                add.stop(1, style.noteFill(this.end));
            });
            width = editor.zoomY
        }
        this.path.plot(simpleBezierPath(
                {x: this.start.xEnd, y: this.start.y + editor.zoomY / 2}, 
                {x: this.end.x, y: this.end.y + editor.zoomY / 2}, 'horizontal'))
            .stroke({color, width});
    }
}