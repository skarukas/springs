import { pitchName } from "./util.js"
import userPreferences from "./userPreferences.js"
import keyboard from "./keyboard.js";
const MIDI = JZZ.MIDI

const midi = {
    /** The input MIDI device. */
    port: undefined,
    /**
     * @async 
     * Return a `Promise` that 
     * resolves with an array of 
     * connected MIDI input devices. 
     * */
    getInputDevices() {
        return new Promise((resolve, reject) => {
            JZZ({sysex: true}).and(function() {
                resolve(this.info().inputs)
            })
        })
    },
    /**
     * Change the input MIDI device. The input
     * should be the name of the device or an element of
     * the array returned by `this.getInputDevices()`
     */
    setInputDevice(device) {
        this.port?.close()
        this.port = JZZ().openMidiIn(device)
        this.port.connect(midi.handleInputMessage)
    },
    /** Perform the action encoded in a MIDI message. */
    handleInputMessage(mid) {
        if (mid.isNoteOn()) {
            let pitch = mid.getNote()
            let velocity = mid.getVelocity()
            keyboard.noteOn(pitch, velocity)
        } else if (mid.isNoteOff()) {
            let pitch = mid.getNote()
            keyboard.noteOff(pitch)
        }
    },
    /**
     * Write the selected notes to a MIDI file.
     * 
     * @param { SeqNote[] } notes 
     * @param { string } fileName 
     * @param { {releaseTime: number } } options 
     * An object with preferences for the export.
     */
    writeToFile(notes, fileName, options) {
        // Construct multitrack midi data
        let smf = MIDI.SMF()
        let tracks = this.partitionIntoTracks(notes, options)
        for (let i = 0; i < tracks.length; i++) {
            let mtrk = MIDI.SMF.MTrk()
            smf.push(mtrk)
            tracks[i].forEach(note => this.addNoteToTrack(note, mtrk))
        }

        // Create and download .mid file
        let str = smf.dump()
        let b64 = JZZ.lib.toBase64(str)
        var uri = 'data:audio/midi;base64,' + b64;
        let a = document.createElement('a')
        a.href= uri
        a.download = (fileName || "untitled") + ".mid";
        a.click();
    },
    /** Partition `notes` into a number of arrays without pitch bend conflict. */
    partitionIntoTracks(notes, options={}) {
        options.releaseTime = options.releaseTime || 0;

        /* Need some logic here to handle glisses... */
    
        notes = notes.sort((a, b) => a.start - b.start);
        // keep track of the notes in each track
        let tracks = [[]];
        
        outer: for (let note of notes) {
            for (let i = 0; i < tracks.length; i++) {
                let track = tracks[i];
                if (!track.length || track[track.length-1].end + options.releaseTime <= note.start) {
                    track.push(note)
                    continue outer;
                }
            }
            // Have to add a new track if loop is unsuccessful
            tracks.push([note])
        }
    
        return tracks;
    },
    /** Convert the note to MIDI and add all necessary events. */
    addNoteToTrack(note, track) {
        let tick = note.start * 32
        let endTick = note.end * 32
        let pitch = pitchName(note.pitch, true)
        let velocity = note.velocity
        let bend = scale14bits(note.bend / userPreferences.pitchBendWidth)
        track.add(tick, MIDI.noteOn(0, pitch, velocity))
            .add(tick, MIDI.pitchBend(0, bend))
            .add(endTick, MIDI.noteOff(0, pitch))
    },
    /** 
     * @async
     * Read a MIDI file and return an array of `SeqNote`s.
     * */
    readFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) return reject()

            view.showLoader(`loading ${file.name}...`, ø => {
                let reader = new FileReader();
                reader.readAsBinaryString(file)
                reader.onload = ø => {
                    let smf = MIDI.SMF(reader.result)
                    let notesOn = []
                    let notes = [] 
                    let bends = []
                    for (let mtrk of smf) {
                        for (let mid of mtrk) {
                            if (mid.isNoteOn()) {
                                let pitch = mid.getNote()
                                notesOn[pitch] = {
                                    start: mid.tt / 32,
                                    velocity: mid.getVelocity(),
                                    pitch
                                }
                            } else if (mid.isNoteOff()) {
                                let pitch = mid.getNote()
                                let note = notesOn[pitch]
                                delete notesOn[pitch]
                                if (note) {
                                    note.duration = mid.tt / 32 - note.start
                                    notes.push(note)
                                }
                            } else if (mid[0] >= 224 && mid[0] < 240) {
                                // pitch bend
                                // right now only works for one channel
                                let bend = (mid[2] << 7) | mid[1]
                                bend = (bend / 16384) * 2 - 1
                                bend *= userPreferences.pitchBendWidth
                                bends.push({
                                    time: mid.tt / 32,
                                    bend
                                })
                            }
                        }
                    }
                    bends = bends.sort((a, b) => a.time - b.time)
                    notes = notes.sort((a, b) => a.start - b.start)
                    let i = 0;
                    let currBend = 0;
                    for (let note of notes) {
                        if (note.start >= bends[i].time) currBend = bends[i++].bend
                        note.bend = currBend
                    }
                    view.hideLoader()
                    resolve(notes);
                }
            })
        })
    }
}

export default midi 

// scale from [-1, 1) to [0, 16384)
const scale14bits = (val) => {
    let result = Math.floor( 16384 * ( val + 1 ) / 2 );
    if (result > 16383) throw new RangeError("Pitch bend values are too large to be represented in the given pitch bend range. Increase 'pitch bend width' in Preferences (and on your digital instrument) to fix this.")
    return result
}