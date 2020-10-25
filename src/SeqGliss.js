import { simpleBezierPath } from "./util.js"
import style from "./style.js"
import editor from "./editor.js"

export default class SeqGliss {
    constructor(start, end) {
        this.startNote = start;
        this.endNote = end;
    }
    set selected(val) {
        this._selected = val;
        let strokeColor = val? style.strokeSelected : this.gradient
        this.line.stroke(strokeColor);
    }
    get selected() {
        return this._selected;
    }
    remove() {
        this.line.remove()
        this.startNote.glissOutputs = this.startNote.glissOutputs.filter(e => e != this)
        this.endNote.glissInputs = this.endNote.glissInputs.filter(e => e != this)
    }
    draw(canvas) {
        this.canvas = canvas
        let color, width;
        if (this.startNote.xEnd >= this.endNote.x) {
            /* color = 'red'
            width = 2 */
            throw "BADDADDDADA"
        } else {
            this.gradient = this.canvas.gradient('linear', add => {
                add.stop(0, style.noteFill(this.startNote));
                add.stop(1, style.noteFill(this.endNote));
            });
            color = this.gradient
            width = editor.zoomY
        }
        this.line = canvas.path(simpleBezierPath(
                {x: this.startNote.xEnd, y: this.startNote.y + editor.zoomY / 2}, 
                {x: this.endNote.x, y: this.endNote.y + editor.zoomY / 2}, 'horizontal'))
            .stroke({color, width})
            .fill('none')
            .opacity(0.6)
            .insertAfter(this.startNote.rect)
            .insertAfter(this.endNote.rect);
        editor.assignMouseHandler(this, this.line, "gliss_line")
    }
    updateGraphics() {
        this.gradient.update(add => {
            add.stop(0, style.noteFill(this.startNote));
            add.stop(1, style.noteFill(this.endNote));
        });

        this.redrawPosition()
    }
    redrawPosition() {
        this.line.plot(simpleBezierPath(
                {x: this.startNote.xEnd, y: this.startNote.y + editor.zoomY / 2}, 
                {x: this.endNote.x, y: this.endNote.y + editor.zoomY / 2}, 'horizontal'))
    }
}