# springs
*A "piano roll" music editor for intuitive voice-independent tuning within the browser.*

### why
One of the limitations of MIDI editing in DAW's (Digital Audio Workstations) is their handling of "pitch bend" information:
- pitch bend acts globally on an instrument/channel, meaning retuning one note will affect all notes. Some workarounds include mapping the piano keys to retuned samples from the software instrument or creating separate channels for each voice, neither of which are very friendly or flexible.
- changing frequency over time must be accomplished with pitch bend automation, AKA manipulation of a separate pointwise function with arbitrary measurements.

### what
In contrast, this environment allows voice-specific tuning changes, pitch bends between notes, and a completely fluid tuning ecosystem, meaning microtonal effects like "comma pumps" or pitch shifts can be easily accomplished. Notes may optionally be connected by intervals, which lock them together and allow them to respond dynamically to each other's tuning changes.

Projects may be exported as MIDI files to be used in DAWs. During exporting, springs automatically partitions simultaneous pitch bends into different tracks so that the resulting MIDI file will include all tuning adjustments (these partitions may be arbitrary). There are (limited) MIDI importing capabilites.

This project is still in development, but you can [check out the latest working version here.](https://skarukas.github.io/springs/)

![](assets/springs_demo.gif)

Built with jQuery, JZZ.js, and SVG.js.
