import { simpleBezierPath, addTooltip } from "./util.js"
import style from "./style.js"
import editor from "./editor.js"
import userPreferences from "./userPreferences.js";
const bezier = require("bezier-easing")

export default class SeqGliss {
    constructor(start, end) {
        this.startNote = start;
        this.endNote = end;
        this.easing = userPreferences.glissEasing
    }
    set selected(val) {
        this._selected = val;
        let strokeColor = val? style.strokeSelected : this.gradient
        this.line.stroke(strokeColor);
    }
    get selected() {
        return this._selected;
    }
    get duration() {
        return (this.endNote.start - this.startNote.end).clamp(0, Infinity)
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
            throw "Forbidden gliss."
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
                {x: this.endNote.x, y: this.endNote.y + editor.zoomY / 2}, 
                'horizontal',
                this.easing))
            .stroke({color, width})
            .fill('none')
            .opacity(0.6)
            .insertBefore(this.startNote.group)
            .insertBefore(this.endNote.group);

        addTooltip(this.line.node, "Drag to adjust easing")

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
                {x: this.endNote.x, y: this.endNote.y + editor.zoomY / 2}, 
                'horizontal',
                this.easing))
    }
    getFreqCurve() {
        const glissEasing = bezier(this.easing, 0, 1-this.easing, 1)
        const glissPoints = []
        const n = this.duration
        for (let i = 0; i < n; i++) glissPoints.push(glissEasing(i/(n-1)))

        let f1 = this.startNote.frequency
        let f2 = this.endNote.frequency
        let dFreq = f2 - f1
        let freqCurve = glissPoints
            .map(n => 2**n - 1) // make exponential (pitch)
            .map(n => n * dFreq + f1)
        return new Float32Array(freqCurve)
    }
}