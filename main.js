import audio from "./audio-playback.js";
import editor from "./editor.js";
import grid from "./grid.js";
import "./jquery-3.5.1.js";
import keyboard from "./keyboard.js";
import playback from "./playbackData.js";
import ruler from "./ruler.js";
import { addButton, addMessage } from "./util.js";

const $scroller = $('.right-container');
const $keyboard = $('.piano-container');
const $ruler = $('.ruler-container');

$(document.createElement('div'))
    .css({
        position: 'absolute',
        bottom: 20,
        right: 20,
    })
    .addClass("warn-container")
    .appendTo('body')

addButton("Say Peee Peeee")
    .on('click', ø => addMessage("PEE PEEEEE", 'blue'));

addButton("Fit to Harmonic Series!")
    .on('click', ø => editor.applyToSelection(editor.tuneAsPartials));

let $eqButton = addButton('Equally Divide')
    .on('click', ø => editor.applyToSelection(editor.equallyDivide, $divisions.val()));

const $divisions = $(document.createElement('input'))
    .attr({
        type: 'number',
        min: 2,
        max: 20,
        value: 2
    })
    .on('keydown', e => {
        if (e.key == 'Enter') {
            $eqButton.trigger('click')
            e.stopPropagation()
        }
    })
    .appendTo('#controls-container')


const $xRange = $(document.createElement('input'))
    .attr({
        id:'x-zoom',
        type: "range",
        min: 4,
        max: 16,
        step: 0.1
    })
    .css({
        position: 'absolute',
        right: 20,
        bottom: 10
    })
    .appendTo($('.seq'))
const $yRange = $(document.createElement('input'))
    .attr({
        id:'y-zoom',
        type: "range",
        min: "4",
        max: "16",
        orient: 'vertical',
        step: 0.1
    })
    .css({
        position: 'absolute',
        right: 10,
        bottom: 20
    })
    .appendTo($('.seq'))

editor.draw();
ruler.draw();
grid.draw();
keyboard.draw();
playback.draw();


let octaveTransposition = 60;
// handle computer keyboard input
// have to use keydown instead of keypress
// to catch cmd+number before the browser default
$(document).on("keydown", function(e) {
    if (e.metaKey) {
        /* Cmd + ... shortcuts */
        if (e.key == 'a') {
            e.preventDefault();
            editor.selectAll();
        } else if (e.key == 'c') {
            e.preventDefault();
            editor.copySelection()
        } else if (e.key == 'v') {
            e.preventDefault();
            editor.paste(e)
        } else if (+e.key) {
            /* check for digits */
            e.preventDefault()
            let n = +e.key;
            if (n > 1) editor.applyToSelection(editor.equallyDivide, n)
        }
    } else if (e.key == " ") {
        e.preventDefault();
        editor.togglePlayback()
    } else if (e.key == 'Backspace') {
        addMessage('Deleting selection')
        editor.applyToSelection(editor.delete, e)
/*     } else if (e.key == 'p') {
        editor.applyToSelection(editor.play); */
    } else if (e.key == 'r') {
        editor.applyToSelection(editor.resetBend);
    } else if (e.key == 'Enter') {
        editor.applyToSelection(editor.typeEdit)
    }
}).on("keyup", e => {
    if ("awsedftgyhujkolp;".includes(e.key)) {
        let pitch = "awsedftgyhujkolp;".indexOf(e.key)
        keyboard.noteOff(pitch + octaveTransposition)
    }
}).on("keypress", e => {
    if ("awsedftgyhujkolp;".includes(e.key)) {
        let pitch = "awsedftgyhujkolp;".indexOf(e.key)
        keyboard.noteOn(pitch + octaveTransposition)
    } else if (e.key == 'z') {
        octaveTransposition = (octaveTransposition-12).clamp(0, 108);
    } else if (e.key == 'x') {
        octaveTransposition = (octaveTransposition+12).clamp(0, 108)
    }
})


// a litte hacky, but it works
$scroller.on('scroll', e => {
    $keyboard.css('overflow', 'scroll');
    $keyboard.scrollTop($scroller.scrollTop());
    $keyboard.css('overflow', 'hidden')

    $ruler.css('overflow', 'scroll');
    $ruler.scrollLeft($scroller.scrollLeft());
    $ruler.css('overflow', 'hidden')
});

$yRange.on('input', ø => editor.zoom(editor.zoomX, +$yRange.val()));
$xRange.on('input', ø => editor.zoom(+$xRange.val(), editor.zoomY));





/* Just adding some demo notes */
editor.addNote(60, 60, 20, 10);
editor.addNote(64, 128, 25, 15);
editor.addNote(67,60,10,20)

/* for (let i = 0; i < 20; i++) {
    //let pitch = Math.floor(Math.random() * 60) + 60;
    let pitch = Math.floor(Math.random() * 128);
    let velocity = Math.floor(Math.random() * 128);
    //let start = Math.floor(Math.random() * 40);
    let start = i + 2 + Math.random() * 4;
    let duration = Math.floor(Math.random() * 40) + 1;
    editor.addNote(pitch, velocity, start, duration);
} */