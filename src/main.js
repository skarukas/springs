import editor from "./editor.js";
import grid from "./grid.js";
import keyboard from "./keyboard.js";
import playback from "./playbackData.js";
import ruler from "./ruler.js";
import view from "./view.js";
import { addMessage, simpleBezierPath } from "./util.js";
import userPreferences from "./userPreferences.js"
import { undo, redo } from "./undo-redo.js";
import midi from "./midi.js";
import style from "./style.js";

// onload
$(ø => {
    try {
        init()
    } catch (e) {
        view.hideLoader(() => {
            addMessage("An error occured when loading. Some features may not work correctly.", "red")
            addMessage(e, "red")
            addMessage("For a copy of this error, open your browser console.", "red")
            console.error(e)
        })
    }
})

function init() {
    view.init();
    editor.draw();
    ruler.draw();
    grid.draw();
    keyboard.draw();
    playback.draw();
    editor.loadEditorFromLocalStorage();

    let octaveTransposition = 60;
   /**
    * handle computer keyboard input
    * have to use keydown instead of keypress
    * to catch cmd+number before the browser default
   */
    $(document).on("keydown", function(e) {
        if (e.metaKey) {
            /* Cmd + ... shortcuts */
            switch (e.key) {
                case 'a':
                    /* Select all */
                    e.preventDefault();
                    editor.selectAll();
                    break;
                case 'c':
                    /* Copy */
                    e.preventDefault();
                    editor.copySelection()
                    break;
                case 'v':
                    /* Paste */
                    e.preventDefault();
                    editor.paste()
                    break;
                case 'z':
                    /* Undo/Redo */
                    if (e.shiftKey) redo()
                    else undo()
                    e.preventDefault();
                    break;
                case 'y':
                    /* Redo */
                    redo()
                    e.preventDefault();
                    break;
                case 'r':
                    /* Reset Bend */
                    e.preventDefault();
                    editor.applyToSelection(editor.resetBend);
                    break;
                case 's':
                    /* Save to browser storage */
                    e.preventDefault()
                    if (editor.updateLocalStorage()) view.showSaveMessage()
                    else addMessage('Unable to save to browser storage', 'red')
                    break;
                case 'o':
                    /* Open file from computer */
                    $filePick.trigger('click')
                    e.preventDefault()
                    break;
                case 'ArrowDown':
                    /* Transpose note down */
                    editor.applyToSelection(editor.transposeByOctaves, -1)
                    e.preventDefault()
                    break;
                case 'ArrowUp':
                    /* Transpose note up */
                    editor.applyToSelection(editor.transposeByOctaves, 1)
                    e.preventDefault()
                    break;
            }
            if (+e.key) {
                /* Equally divide intervals */
                e.preventDefault()
                let n = +e.key;
                // check for digits
                if (n > 1) editor.applyToSelection(editor.equallyDivide, n)
            }
        } else if (e.shiftKey) {
            /* Shift + ... commands */
            if (e.key == " ") {
                /* Playback only selection */
                e.preventDefault();
                editor.togglePlaybackSelection();
            }
        } else if (e.key == 'Shift') {
            /* Navigate around editor */
            editor.setCursorStyle("grab")
        } else if (e.key == " ") {
            /* Playback from current position */
            e.preventDefault();
            editor.togglePlayback()
        } else if (e.key == 'Backspace') {
            /* Delete */
            editor.applyToSelection(editor.delete, e)
        } else if (e.key == 'Enter') {
            /* Edit intervals/velocities */
            editor.applyToSelection(editor.typeEdit)
        }
    }).on("keyup", e => {
        if ("awsedftgyhujkolp;".includes(e.key)) {
            /* End playback of note */
            let pitch = "awsedftgyhujkolp;".indexOf(e.key)
            keyboard.noteOff(pitch + octaveTransposition)
        } else if (e.key == 'Shift') {
            editor.setCursorStyle("default")
        }
    }).on("keypress", e => {
        if ("awsedftgyhujkolp;".includes(e.key)) {
            /* Playback note from computer keyboard */
            let pitch = "awsedftgyhujkolp;".indexOf(e.key)
            keyboard.noteOn(pitch + octaveTransposition)
        } else if (e.key == 'z') {
            /* Transpose computer keyboard down */
            octaveTransposition = (octaveTransposition-12).clamp(0, 108);
        } else if (e.key == 'x') {
            /* Transpose computer keyboard up */
            octaveTransposition = (octaveTransposition+12).clamp(0, 108)
        }
    })
    document.addEventListener('wheel', e => {
        // `wheel` event catches multi-touch on laptops too
        if (e.ctrlKey) {
            /* Zoom in and out of the editor, fixed aspect ratio */
            let dy = e.deltaY
            editor.scale(editor.zoomXY * (1-dy*0.01))
            e.preventDefault()
        } else {
            /* Navigate around the editor */
            e.preventDefault()
            editor.deltaScroll(e.deltaX, e.deltaY)
        }
    }, { passive: false })

    window.onbeforeunload = e => {
        /* Autosave to local storage when the user closes/refreshes the page */
        editor.updateLocalStorage()
        e.preventDefault()
    }

    // show controls for new users
    if (!localStorage.getItem("editor")) {
        $('.control-screen').delay(500).fadeIn(500)
    } 

    /* Define jQueryUI tooltip (uses title attr) */
    $(document).tooltip({
        items: ".has-tooltip",
        show: { delay: 1000, effect: "fadeIn", duration: 300 },
        /* Remove jQueryUI tooltip memory leak from invisible divs */
        close: function () { $(".ui-helper-hidden-accessible > *:not(:last)").remove(); }
    })


    /* Settings menu */
    $('.setting-screen').dialog({
        autoOpen: false,
        width: 400,
        title: "Settings",
    })
    $('.ui-widget-overlay').on('click', () => {
        console.log("exit")
        $('.setting-screen').dialog('close')
    })

    // show easing demo
    let demoCanvas = SVG()
        .addTo('#easing-demo')
        .size(75, 50)
    demoCanvas.rect(75, 50)
        .fill(style.lightGrey)
    let width = 10
    let path = demoCanvas.path(simpleBezierPath(
        {x: 0, y: width / 2}, 
        {x: 75, y: 50 - width/2},
        'horizontal',
        userPreferences.glissEasing))
        .stroke({
            color: 'lightblue',
            width
        })
        .fill('none')
        .opacity(0.8)

    $('#easing-range').val(userPreferences.glissEasing)
    $('#show-edges').attr('checked', userPreferences.alwaysShowEdges)
    $('#prop-bend').attr('checked', userPreferences.propagateBendAfterDeletion)

    $('#easing-range').on('input', event => {
        path.plot(simpleBezierPath(
            {x: 0, y: width / 2}, 
            {x: 75, y: 50 - width/2},
            'horizontal',
            event.target.value))
        userPreferences.glissEasing = event.target.value
    })

    $('#show-edges').on('change', event => {
        userPreferences.alwaysShowEdges = event.target.checked
        if (event.target.checked){
            for (let edge of editor.edges) edge.text.opacity(1)
        } else {
            for (let edge of editor.edges) edge.text.opacity(0)
        }
    }).trigger('change')

    $('#prop-bend').on('change', event => {
        userPreferences.propagateBendAfterDeletion = event.target.checked
    })


    /* MIDI export menu */
    $('.midi-export').dialog({
        autoOpen: false,
        width: 400,
        title: "Export MIDI",
    })

    $('#bend-range').on('input', event => {
        let val = (Math.round(event.target.value * 10) / 10).clamp(0, 128)
        event.target.value = val
        userPreferences.pitchBendWidth = val
        midi.fileName = `${editor.fileName} [PB=${val}]`
        $('#midi-filename').val(midi.fileName)
    }).val(userPreferences.pitchBendWidth)
    $('#midi-filename').on('change', event => {
        midi.fileName = event.target.value
    }).on('keypress', e => e.stopPropagation())

    $("#midi-export-button").on('click', () => { $('.midi-export').dialog('close'); editor.exportMIDI() })
    $("#midi-export-cancel").on('click', () => $('.midi-export').dialog('close'))

    /* contexmenus */
    $.contextMenu({
        selector: ".has-contextmenu, .has-tooltip",
        items: {
            copy: {
                name: "Copy (Ctrl+C)",
                callback: () => editor.copySelection()
            },
            paste: {
                name: "Paste (Ctrl+V)",
                callback: () => editor.paste()     
            },
            sep1: "---------",
            createNote: {
                name: "Create note here (Ctrl+Drag)",
                callback: () => {
                    /* Create note */
                    let e = editor.mousePosn;
                    let n = editor.addNote(
                        editor.mousePosnToPitch(e),
                        64,
                        editor.mousePosnToTime(e),
                        4 * editor.timeGridSize);
                    editor.selectObject(n)
                }
            },
            resetBend: {
                name: "Reset Bend (Ctrl+R)",
                callback: () => editor.applyToSelection(editor.resetBend)
            },
            tuneAsPartials: {
                name: "Fit to harmonic series",
                callback: () => editor.applyToSelection(editor.tuneAsPartials) 
            },
            sep2: "---------",
            edit: {
                name: "Edit... (Enter)", 
                callback: () => editor.applyToSelection(editor.typeEdit)
            },
        }
    })
    /* Prevent editor form interpreting context menu action as a drag */
    $(document).on("contextmenu:hide", () => editor.canvas.fire("mouseup"))

    view.hideLoader()

    /* Connect to MIDI keyboard */
    midi.getInputDevices().then((inputs) => {
        midi.setInputDevice(inputs[0])
        console.log(inputs)
    })
}

window.prefs = userPreferences
window.view = view
window.editor = editor