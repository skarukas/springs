import playback from "./playbackData.js"; /* Try to remove playback as a dependency */
import { addMessage } from "./util.js";

/**
 * Namespace for functions interacting with the WebAudio API
 */
const audio = {
    notes: Array(128),       // map of midi notes -> osc
    playingNotes: new Set(), // all oscillators
    initAudio() {
        if (window.AudioContext || window.webkitAudioContext) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.context.createGain();
            this.gainNode.gain.setValueAtTime(0.2, this.context.currentTime);
            this.gainNode.connect(this.context.destination); // connect to output
        } else {
            addMessage("Unable to play audio. This browser does not support the WebAudio API.")
        }
    },
    get now() {
        return this.context.currentTime
    },
    /* Reset playback data */
    pause() {
        for (let [n, g] of this.playingNotes) {
            g.gain.value = 0
            g.gain.cancelScheduledValues(0)
        }
        this.playingNotes = new Set()
    },
    /* Play a note `start` seconds in the future, ending `end` seconds into the future. */
    playNote(note, start=0, end=2.0) {
        let time = playback.position / editor.zoomX
        let offset = playback.MIDITimeToSeconds(time)
        let relativeStart = Math.max(0, start - offset)
        let relativeEnd = end - offset
        if (relativeEnd < 0) return;

        if (!this.context) this.initAudio()
        
        let a = this.context.createOscillator()
        let oscGain = this.context.createGain()
        a.frequency.value = note.frequency
        a.type = 'sawtooth'

        let crossFadeDur = 0.1
        a.start(this.now + relativeStart)
        a.stop(this.now + relativeEnd + crossFadeDur) 
        a.onended = ø => void this.playingNotes.delete(a)

        // Fade in
        oscGain.gain.setValueAtTime(
            0,
            this.now + relativeStart)
        oscGain.gain.linearRampToValueAtTime(
            note.velocity / 128,
            this.now + relativeStart + crossFadeDur)
        // hold
        oscGain.gain.setValueAtTime(
            note.velocity / 128,
            this.now + relativeEnd)
        // Fade out
        oscGain.gain.linearRampToValueAtTime(0.01,
            this.now + relativeEnd + crossFadeDur)


        a.connect(oscGain).connect(this.gainNode)

        this.playingNotes.add([a, oscGain])

        for (let gliss of note.glissOutputs) {
            this.playGliss(gliss, end,
                playback.MIDITimeToSeconds(gliss.endNote.start))
        }
    },
    /* Play back a gliss starting at a certain time */
    playGliss(gliss, start=0, end=2.0) {
        let time = playback.position / editor.zoomX
        let offset = playback.MIDITimeToSeconds(time)
        let relativeStart = Math.max(0, start - offset)
        let relativeEnd = end - offset
        if (relativeEnd < 0) return;

        let relativeStartVelocity = 1 / (gliss.startNote.glissOutputs.length)**0.5
        let relativeEndVelocity = 1 / (gliss.endNote.glissInputs.length)**0.5

        if (!this.context) this.initAudio()

        let a = this.context.createOscillator()
        let oscGain = this.context.createGain()

        // use provided easing
        a.frequency.value = gliss.startNote.frequency
        a.frequency.setValueCurveAtTime(
            gliss.getFreqCurve(),
            this.now + relativeStart,
            end-start
        )
        a.type = 'sawtooth'

        let crossFadeDur = 0.1
        a.start(this.now + relativeStart)
        a.stop(this.now + relativeEnd + crossFadeDur)

        // Fade in
        oscGain.gain.setValueAtTime(
            0,
            this.now + relativeStart)
        oscGain.gain.linearRampToValueAtTime(
            relativeStartVelocity * gliss.startNote.velocity / 128,
            this.now + relativeStart + crossFadeDur)

        oscGain.gain.exponentialRampToValueAtTime(
            relativeEndVelocity * gliss.endNote.velocity / 128,
            this.now + relativeEnd)
        // Fade out
        oscGain.gain.linearRampToValueAtTime(0.01,
            this.now + relativeEnd + crossFadeDur)
        
        a.connect(oscGain).connect(this.gainNode)

        this.playingNotes.add([a, oscGain])
    },
    /* Playback a set of notes */
    playNotes(notes) {
        for (let note of notes) {
            this.playNote(
                note,
                playback.MIDITimeToSeconds(note.start), 
                playback.MIDITimeToSeconds(note.end))
        }
    },
    /* Start a note playing */
    noteOn(pitch, velocity=60) {
        if (this.notes[pitch]) return

        if (!this.context) this.initAudio()

        let a = this.context.createOscillator()
        let oscGain = this.context.createGain()
        a.frequency.value = tune.Util.ETToFreq(pitch)
        a.type = 'sawtooth'

        a.start()
        oscGain.gain.value = velocity/127
        a.connect(oscGain).connect(this.gainNode)

        this.notes[pitch] = a;
    },
    /* End a note playing */
    noteOff(pitch) {
        this.notes[pitch]?.stop(0)
        this.notes[pitch] = undefined
    }
}

export default audio