import audio from "./audio-playback.js";
import editor from "./editor.js"
import grid from "./grid.js";
import style from "./style.js"
import { disableMouseEvents, pitchName } from "./util.js";

class PianoKey {

    static keyYVals = [1, 1.1, 2, 2.4, 3, 4, 4.1, 5, 5.3, 6, 6.5, 7];

    constructor(pitch) {
        this.pitchClass = pitch % 12;
        this.isNatural = ![1, 3, 6, 8, 10].includes(this.pitchClass);
        this.displayOptions = this.isNatural? style.keyDisplay.white : style.keyDisplay.black;
        this.pitch = pitch;
        this.pitchName = pitchName(this.pitch)
    }
    get x() {
        return 0;
    }
    get textX() {
        return this.x + this.width - this.text.length() - 2
    }
    get textY() {
        return this.y + this.height - this.textSize - 2
    }
    get textSize() {
        return 8
    }
    get y() {
        let relativeY = PianoKey.keyYVals[this.pitchClass] * 12/7
        let unscaledY = (relativeY + Math.floor(this.pitch/12) * 12)
        return (editor.numKeys - unscaledY) * editor.zoomY * keyboard.scaleVal;
    }
    get width() {
        return this.displayOptions.width;
    }
    get whiteKeyHeight() {
        return (12/7) * editor.zoomY * keyboard.scaleVal;
    }
    get height() {
        return this.isNatural? this.whiteKeyHeight : this.whiteKeyHeight * 0.6;
    }
    updateGraphics(animateDuration) {
        if (!this.canvas) return;
        this.keyRect.size(this.width, this.height)
            .move(this.x, this.y);
        if (this.text) {
            if (this.height < this.textSize*1.3) {
                this.text.hide()
            } else {
                this.text.font({size: this.textSize})
                    .x(this.textX)
                    .y(this.textY)
                    .show()
            }
        }
    }
    draw(canvas) {
        this.canvas = canvas;
        this.keyRect = canvas.rect(this.width, this.height)
            .radius(2)
            .stroke({color: 'grey', width: 1})
            .fill(this.displayOptions.color)
            .move(this.x, this.y)
            .mouseover(() => {
                this.keyRect.fill(this.displayOptions.hoverColor);
            })
            .mouseout(ø => this.noteOff())
            .mousedown(ø => this.noteOn())
            .mouseup(ø => this.noteOff());

        if (!this.isNatural) this.keyRect.front();
        else this.keyRect.back();

        if (this.pitchName == 'C') {
            this.text = this.canvas.text(pitchName(this.pitch, true))
                .font(style.editorText)
            this.text
                .font({size: this.textSize})
                .x(this.textX)
                .y(this.textY)
                
            disableMouseEvents(this.text)
        }
    }
    noteOn() {
        this.keyRect.fill(this.displayOptions.clickColor);
        grid.highlightPitch(this.pitch, true, this.displayOptions);
        audio.noteOn(this.pitch)
    }
    noteOff() {
        this.keyRect.fill(this.displayOptions.color);
        grid.highlightPitch(this.pitch, false, this.displayOptions);
        audio.noteOff(this.pitch)
    }
}

const keyboard = {
    draw() {
        this.canvas = SVG()
            .addTo('#roll-keyboard')
            .size(style.keyDisplay.width, editor.zoomY * editor.numKeys);
        this.svg = this.canvas
        for (let i = 0; i < editor.numKeys; i++) {
            let key = new PianoKey(i);
            key.draw(this.canvas);
            this.keys.push(key);
        }
    },
    zoom(xZoom, yZoom) {
        this.canvas.size(style.keyDisplay.width, yZoom * editor.numKeys);
        for (let key of this.keys) key.updateGraphics(0);
    },
    scale(val) {
        this.scaleVal = val;
        this.canvas.size(style.keyDisplay.width, val * editor.height);
        for (let key of this.keys) key.updateGraphics(0);
    },
    scaleVal: 1,
    noteOn(pitch) {
        this.keys[pitch].noteOn()
    },
    noteOff(pitch) {
        this.keys[pitch].noteOff()
    },
    keys: [],
    get width() {
        return style.keyDisplay.width;
    },
    scroll(x, y) {
        let $keyboard = $('.piano-container');
        $keyboard.css('overflow', 'scroll');
        $keyboard.scrollTop(y);
        $keyboard.css('overflow', 'hidden')
    }
}

export default keyboard