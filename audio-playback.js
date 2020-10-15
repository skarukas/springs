import playback from "./playbackData.js";

/* No dependencies please */
/* Controled by playbackdata? */

const audio = {
    initAudio() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.context.createGain();
        this.gainNode.gain.setValueAtTime(1, this.context.currentTime);
        this.gainNode.connect(this.context.destination); // connect to output
    },
    get now() {
        return this.context.currentTime
    },
    pause() {
        console.log("idk how to pause yet")
    },
    /* Play a note `start` seconds in the future, ending `end` seconds into the future. */
    playNote(note, start=0, end=2.0) {
        if (!this.context) this.initAudio()
        
        let a = this.context.createOscillator()
        let oscGain = this.context.createGain()
        a.frequency.value = note.frequency

        a.start(this.now + start)
        a.stop(this.now + end)
        oscGain.gain.value = 0.2
        a.connect(oscGain).connect(this.gainNode)
    },
    playNotes(notes) {
        for (let note of notes) {
            this.playNote(
                note,
                playback.MIDITimeToSeconds(note.start), 
                playback.MIDITimeToSeconds(note.end))
        }
    }
}

export default audio