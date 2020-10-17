import playback from "./playbackData.js";

/* No dependencies please */
/* Controled by playbackdata? */

const audio = {
    notes: Array(128),
    playingNotes: [],
    initAudio() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.context.createGain();
        this.gainNode.gain.setValueAtTime(0.2, this.context.currentTime);
        this.gainNode.connect(this.context.destination); // connect to output
    },
    get now() {
        return this.context.currentTime
    },
    pause() {
        for (let note of this.playingNotes) note.stop()
        this.playingNotes = []
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

        a.start(this.now + relativeStart)
        a.stop(this.now + relativeEnd)
        oscGain.gain.value = note.velocity / 128
        a.connect(oscGain).connect(this.gainNode)

        this.playingNotes.push(a)
    },
    playNotes(notes) {
        for (let note of notes) {
            this.playNote(
                note,
                playback.MIDITimeToSeconds(note.start), 
                playback.MIDITimeToSeconds(note.end))
        }
    },
    noteOn(pitch) {
        if (!this.context) this.initAudio()

        let a = this.context.createOscillator()
        let oscGain = this.context.createGain()
        a.frequency.value = tune.Util.ETToFreq(pitch)
        a.type = 'sawtooth'

        a.start()
        oscGain.gain.value = 0.4
        a.connect(oscGain).connect(this.gainNode)

        this.notes[pitch] = a;
    },
    noteOff(pitch) {
        this.notes[pitch]?.stop()
        this.notes[pitch] = undefined
    }
}

export default audio