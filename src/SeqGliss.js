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
    /**
     * This function is called when the user
     * directly deletes this object. The effects may propagate
     * to connected objects.
     */
    delete() {
        if (!this.removed) {
            this.remove()
            this.startNote.glissOutputs = this.startNote.glissOutputs.filter(e => e != this)
            this.endNote.glissInputs = this.endNote.glissInputs.filter(e => e != this)
        }
    }
    /**
     * This function is called when the object
     * is removed by a connected object. It
     * does not propagate.
     */
    remove() {
        if (!this.removed) {
            this.line.remove()
            this.removed = true
        }
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
        this.redrawColor()
        this.redrawPosition()
    }
    redrawColor() {
        this.gradient.update(add => {
            add.stop(0, style.noteFill(this.startNote));
            add.stop(1, style.noteFill(this.endNote));
        });
    }
    redrawPosition() {
        this.line.plot(simpleBezierPath(
                {x: this.startNote.xEnd, y: this.startNote.y + editor.zoomY / 2}, 
                {x: this.endNote.x, y: this.endNote.y + editor.zoomY / 2}, 'horizontal'))
    }
}