import editor from "./editor.js";
import grid from "./grid.js";
import keyboard from "./keyboard.js";
import playback from "./playbackData.js";
import ruler from "./ruler.js";
import view from "./view.js";
import { addMessage } from "./util.js";
import userPreferences from "./userPreferences.js"

$(ø => {
    view.init();
    editor.draw();
    ruler.draw();
    grid.draw();
    keyboard.draw();
    playback.draw();
    editor.loadEditorFromLocalStorage()

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
            } else if (e.key == 'r') {
                e.preventDefault();
                editor.applyToSelection(editor.resetBend);
            } else if (e.key == 'v') {
                e.preventDefault();
                editor.paste(e)
            } else if (+e.key) {
                /* check for digits */
                e.preventDefault()
                let n = +e.key;
                if (n > 1) editor.applyToSelection(editor.equallyDivide, n)
            } else if (e.key == 's') {
                // save
                editor.updateLocalStorage()
                e.preventDefault()
                addMessage(`Saved at ${(new Date()).toUTCString()}`, 'green')
            } else if (e.key == 'o') {
                $filePick.trigger('click')
                e.preventDefault()
            } else if (e.key == 'ArrowDown') {
                editor.applyToSelection(editor.transposeByOctaves, -1)
                e.preventDefault()
            } else if (e.key == 'ArrowUp') {
                editor.applyToSelection(editor.transposeByOctaves, 1)
                e.preventDefault()
            }
        } else if (e.shiftKey) {
            if (e.key == " ") {
                e.preventDefault();
                editor.togglePlaybackSelection();
            }
        } else if (e.key == 'Shift') {
            editor.setCursorStyle("grab")
        } else if (e.key == " ") {
            e.preventDefault();
            editor.togglePlayback()
        } else if (e.key == 'Backspace') {
            addMessage('Deleting selection')
            editor.applyToSelection(editor.delete, e)
    /*     } else if (e.key == 'p') {
            editor.applyToSelection(editor.play); */
        } else if (e.key == 'Enter') {
            editor.applyToSelection(editor.typeEdit)
        }
    }).on("keyup", e => {
        if ("awsedftgyhujkolp;".includes(e.key)) {
            let pitch = "awsedftgyhujkolp;".indexOf(e.key)
            keyboard.noteOff(pitch + octaveTransposition)
        } else if (e.key == 'Shift') {
            editor.setCursorStyle("default")
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
    document.addEventListener('wheel', e => {
        // catches multi-touch on laptops
        if (e.ctrlKey) {
            let dy = e.deltaY
            editor.scale(editor.zoomXY * (1-dy*0.01))
            e.preventDefault()
        } else {
            e.preventDefault()
            editor.deltaScroll(e.deltaX, e.deltaY)
        }
    }, { passive: false })

    window.onbeforeunload = e => {
        editor.updateLocalStorage()
        e.preventDefault()
    }

    // show controls for new users
    if (!localStorage.getItem("editor")) {
        $('.control-screen').delay(500).fadeIn(500)
    } 

    view.hideLoader()
})

window.prefs = userPreferences
window.view = view
window.editor = editor