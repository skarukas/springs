(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function () {
    'use strict';

    const style = {};
    style.lightGrey = "rgb(240, 240, 240)";
    style.grey = "rgb(220, 220, 220)";
    style.darkGrey = "rgb(140, 140, 140)";
    /* Editor Connectors (Gliss / JI Connections) */

    style.editorText = {
      family: 'Arial',
      fill: 'grey',
      size: 10
    };
    style.editorLine = {
      width: 2,
      color: style.darkGrey,
      linecap: 'round'
    };
    /* Keyboard Display */

    let w = 50;
    style.keyDisplay = {
      gap: 2,
      height: 20,
      width: w,
      black: {
        width: w * 2 / 3,
        color: 'black',
        hoverColor: style.darkGrey,
        clickColor: 'lightblue',
        seqFillUnselected: style.grey,
        seqFillSelected: 'lightblue'
      },
      white: {
        width: w,
        color: 'white',
        hoverColor: style.lightGrey,
        clickColor: 'lightblue',
        seqFillUnselected: style.lightGrey,
        seqFillSelected: 'lightblue'
      }
    };
    /* Piano Roll Note Display Options */

    style.noteFill = function (note) {
      let bValue = Math.floor(note.velocity * 2);
      return new SVG.Color(`rgb(0, 128, ${bValue})`);
    };

    style.noteShadowFill = function (note) {
      let bValue = Math.floor(note.velocity * 2);
      return new SVG.Color(`rgb(0, 255, ${bValue})`);
    };

    style.noteShadowStroke = 'rgb(60, 60, 60)';
    style.strokeSelected = 'red';

    const ruler = {
      height: 20,
      scaleVal: 1,

      /** Create SVG ruler. Only called once. */
      draw() {
        ruler.canvas = SVG().addTo('#ruler').size(editor$1.width, ruler.height).mousemove(e => {
          if (!playback.playing && e.buttons == 1) playback.position = editor$1.canvas.point(e.x, e.y).x;
        }).mousedown(e => {
          if (!playback.playing) playback.position = editor$1.canvas.point(e.x, e.y).x;
          editor$1.deselectAllObjects();
        });
        this.svg = this.canvas;
        /* Draw tick mark and measure number */

        ruler.ticks = Array(editor$1.widthInTime).fill(0).map((_, i) => {
          if (i % 16 == 0) {
            let g = ruler.canvas.group();
            g.line(i * editor$1.zoomX, 0, i * editor$1.zoomX, 20).stroke({
              width: 1
            }).stroke('black');
            let measureNumber = g.text("" + Math.ceil((i + 1) / 16)).font(style.editorText).center((i + 1) * editor$1.zoomX, 10).addClass("mouse-disabled");
            return g;
          }
        });
      },

      /** Adjust the ruler to a new aspect ratio. */
      zoom(zoomX, zoomY) {
        for (let i = 0; i < ruler.ticks.length; i++) {
          ruler.ticks[i]?.move(i * zoomX, 0);
        }
      },

      /** Scale the ruler, preserving aspect ratio. */
      scale(val) {
        for (let i = 0; i < ruler.ticks.length; i++) {
          ruler.ticks[i]?.move(i * val * editor$1.zoomX, 0);
        }

        this.scaleVal = val;
        playback.caret.cx(playback.position * val);
      },

      /** Scroll to specific coordinates. */
      scroll(x, y) {
        let $ruler = $('.ruler-container');
        $ruler.css('overflow', 'scroll');
        $ruler.scrollLeft(x);
        $ruler.css('overflow', 'hidden');
      }

    };

    /**
     * Handles playback display and data,
     * doesn't interact with the WebAudio API
     */

    const playback = {
      draw() {
        this.line = editor$1.canvas.line().stroke({
          width: 2,
          color: 'red'
        }).opacity(0.6).hide().front();
        let d = 8; //this.caret = ruler.canvas.polygon(`0, 0 ${w}, 0  ${w/2+1}, ${h} ${w/2-1}, ${h}`)

        this.caret = ruler.canvas.circle(d).y(ruler.height - d).fill('red').opacity(0.6).hide().front();
      },

      intervalIndex: -1,
      _position: 0,
      bpm: 120,
      ticksPerBeat: 4,
      // 16th division
      beatsPerMeasure: 4,
      // in 4/4
      scaleVal: 1,

      scale(val) {
        this.scaleVal = val;
      },

      set position(val) {
        playback._position = val;
        playback.line.plot(val, 0, val, editor$1.numKeys * editor$1.zoomY).show();
        playback.caret.cx(val * this.scaleVal).show();
      },

      get position() {
        return playback._position;
      },

      get playing() {
        return playback.intervalIndex != -1;
      },

      /* Play from the current position of the playback line or a specified point */
      play(startPosition = playback.position) {
        let start = Date.now();
        playback.pause();
        playback.position = startPosition || playback.position;
        let measureLengthMs = 60000 * this.beatsPerMeasure / playback.bpm;
        let measureWidth = this.ticksPerBeat * this.beatsPerMeasure * editor$1.zoomX;
        let fps = 29;
        playback.line.show().front();
        playback.caret.show().front();
        playback.intervalIndex = setInterval(() => {
          let now = Date.now();
          let deltaMs = now - start;
          let measureCount = deltaMs / measureLengthMs;
          let posn = startPosition + measureWidth * measureCount;
          playback.position = posn;
          if (posn >= editor$1.width) playback.stop();
        }, 1000 / fps);
      },

      /* Pause playback */
      pause() {
        clearInterval(playback.intervalIndex);
        playback.intervalIndex = -1;
      },

      /* Stop playback */
      stop() {
        playback.pause();
        playback.position = 0;
        playback.line.hide();
        playback.caret.hide();
      },

      /* Convert the number of ticks to seconds */
      MIDITimeToSeconds(ticks) {
        return 60 * ticks / (this.bpm * this.ticksPerBeat);
      }

    };

    Number.prototype.clamp = function (lo, hi) {
      return Math.max(lo, Math.min(this, hi));
    };
    /**
     * Add a graphical tooltip to the given 
     * element (either a jQuery object, svg element, DOM node, or selector)
     */


    function addTooltip(elem, text) {
      $(elem).attr("title", text).addClass("has-tooltip");
    }
    /**
     * Create a cubic bezier path between two 
     * points, returned as a string.
     * 
     * @param { {x: number, y: number} } start The start position
     * @param { {x: number, y: number} } end The end position
     * @param { "horizontal" | "vertical" } orientation 
     * @param { number } easingFactor How "curvy" to make the path
     */

    function simpleBezierPath(start, end, orientation, easingFactor = 0.25) {
      // 0.01 is added b/c beziers disappear when they're completely straight
      if (orientation == 'vertical') {
        let ctrlPtOffset = (end.y - start.y) * easingFactor;
        return `M ${start.x} ${start.y} 
               C ${start.x + .01} ${start.y + ctrlPtOffset}
                 ${end.x + .01} ${end.y - ctrlPtOffset} 
                 ${end.x} ${end.y}`;
      } else {
        let ctrlPtOffset = (end.x - start.x) * easingFactor;
        return `M ${start.x} ${start.y} 
                C ${start.x + ctrlPtOffset} ${start.y + .01}
                  ${end.x - ctrlPtOffset} ${end.y + .01} 
                  ${end.x} ${end.y}`;
      }
    }
    /** Return the "ruler" tool's bracket-like path, as a string. */

    function rulerPath(start, end) {
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}
            M ${start.x - 5} ${start.y} L ${start.x + 5} ${start.y}
            M ${end.x - 5} ${end.y} L ${end.x + 5} ${end.y}`;
    }
    function normAscendingInterval(interval) {
      /* if (interval.cents() < 0) interval = interval.inverse(); */
      return interval.normalized();
    } // quick-and dirty default 5 limit intervals

    const fiveLimitScale = [tune.FreqRatio(1, 1), tune.FreqRatio(16, 15), tune.FreqRatio(9, 8), tune.FreqRatio(6, 5), tune.FreqRatio(5, 4), tune.FreqRatio(4, 3), tune.FreqRatio(45, 32), tune.FreqRatio(3, 2), tune.FreqRatio(8, 5), tune.FreqRatio(5, 3), tune.FreqRatio(16, 9), tune.FreqRatio(15, 8)];
    /** Return a JI adjustment of the 
     * interval between two MIDI numbers, `lo` and `hi`.
     * */

    function guessJIInterval(lo, hi) {
      if (lo > hi) [hi, lo] = [lo, hi];
      let idx = ((hi - lo) % 12 + 12) % 12;
      let octaves = Math.floor((hi - lo) / 12);
      let ji = fiveLimitScale[idx];
      let interval = ji;
      return interval.add(tune.ETInterval.octave.multiply(octaves));
    }
    /** Display a message to the user with a certain `color`. */

    function addMessage(text, color = 'black') {
      let a = $(document.createElement('p')).text(text).addClass('warning').css({
        color
      }).appendTo($('.warn-container'));
      a.delay(3000).fadeOut(2000, () => a.remove());
    }
    /** Get the pitch name of a MIDI pitch, optionally including the octave number. */

    function pitchName(pitch, includeOctave = false) {
      const pitchNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      let result = pitchNames[tune.Util.mod(Math.round(pitch), 12)];
      if (includeOctave) result += Math.floor(pitch / 12);
      return result;
    }
    /** Turn a string into an interval.
     * 
     *  Valid formats of `text`:
     *   - `"n#d"` = `tune.ETInterval(n, d)`
     *   - `"n:d"` = `tune.FreqRatio(n, d)`
     *   - `"n c"` = `tune.Cents(n)` **NOT YET SUPPORTED
    */

    function parseIntervalText(text) {
      let ratioPattern = /^(?<num>[\d\.]+)\s?[:/]\s?(?<den>[\d\.]+)\s*$/;
      let etPattern = /^(?<num>-?[\d\.]+)\s?#\s?(?<den>[\d\.]+)\s*$/;
      let centPattern = /^(?<cents>-?[\d\.]+)\s*c$/;

      if (ratioPattern.test(text)) {
        let g = ratioPattern.exec(text).groups;
        return tune.FreqRatio(parseFloat(g.num), parseFloat(g.den));
      } else if (etPattern.test(text)) {
        let g = etPattern.exec(text).groups;
        return tune.ETInterval(parseFloat(g.num), parseFloat(g.den));
      } else if (centPattern.test(text)) {
        // cents not yet supported
        let cents = centPattern.exec(text).groups.cents;
        return false;
      }

      return false;
    }

    /**
     * Namespace for functions interacting with the WebAudio API
     */

    const audio = {
      notes: Array(128),
      // map of midi notes -> osc
      playingNotes: new Set(),

      // all oscillators
      initAudio() {
        if (window.AudioContext || window.webkitAudioContext) {
          this.context = new (window.AudioContext || window.webkitAudioContext)();
          this.gainNode = this.context.createGain();
          this.gainNode.gain.setValueAtTime(0.2, this.context.currentTime);
          this.gainNode.connect(this.context.destination); // connect to output
        } else {
          addMessage("Unable to play audio. This browser does not support the WebAudio API.");
        }
      },

      get now() {
        return this.context.currentTime;
      },

      /* Reset playback data */
      pause() {
        for (let [n, g] of this.playingNotes) {
          g.gain.value = 0;
          g.gain.cancelScheduledValues(0);
        }

        this.playingNotes = new Set();
      },

      /* Play a note `start` seconds in the future, ending `end` seconds into the future. */
      playNote(note, start = 0, end = 2.0) {
        let time = playback.position / editor.zoomX;
        let offset = playback.MIDITimeToSeconds(time);
        let relativeStart = Math.max(0, start - offset);
        let relativeEnd = end - offset;
        if (relativeEnd < 0) return;
        if (!this.context) this.initAudio();
        let a = this.context.createOscillator();
        let oscGain = this.context.createGain();
        a.frequency.value = note.frequency;
        a.type = 'sawtooth';
        let crossFadeDur = 0.1;
        a.start(this.now + relativeStart);
        a.stop(this.now + relativeEnd + crossFadeDur);

        a.onended = ø => void this.playingNotes.delete(a); // Fade in


        oscGain.gain.setValueAtTime(0, this.now + relativeStart);
        oscGain.gain.linearRampToValueAtTime(note.velocity / 128, this.now + relativeStart + crossFadeDur); // hold

        oscGain.gain.setValueAtTime(note.velocity / 128, this.now + relativeEnd); // Fade out

        oscGain.gain.linearRampToValueAtTime(0.01, this.now + relativeEnd + crossFadeDur);
        a.connect(oscGain).connect(this.gainNode);
        this.playingNotes.add([a, oscGain]);

        for (let gliss of note.glissOutputs) {
          this.playGliss(gliss, end, playback.MIDITimeToSeconds(gliss.endNote.start));
        }
      },

      /* Play back a gliss starting at a certain time */
      playGliss(gliss, start = 0, end = 2.0) {
        let time = playback.position / editor.zoomX;
        let offset = playback.MIDITimeToSeconds(time);
        let relativeStart = Math.max(0, start - offset);
        let relativeEnd = end - offset;
        if (relativeEnd < 0) return;
        let relativeStartVelocity = 1 / gliss.startNote.glissOutputs.length ** 0.5;
        let relativeEndVelocity = 1 / gliss.endNote.glissInputs.length ** 0.5;
        if (!this.context) this.initAudio();
        let a = this.context.createOscillator();
        let oscGain = this.context.createGain(); // use provided easing

        a.frequency.value = gliss.startNote.frequency;
        a.frequency.setValueCurveAtTime(gliss.getFreqCurve(), this.now + relativeStart, end - start);
        a.type = 'sawtooth';
        let crossFadeDur = 0.1;
        a.start(this.now + relativeStart);
        a.stop(this.now + relativeEnd + crossFadeDur); // Fade in

        oscGain.gain.setValueAtTime(0, this.now + relativeStart);
        oscGain.gain.linearRampToValueAtTime(relativeStartVelocity * gliss.startNote.velocity / 128, this.now + relativeStart + crossFadeDur);
        oscGain.gain.exponentialRampToValueAtTime(relativeEndVelocity * gliss.endNote.velocity / 128, this.now + relativeEnd); // Fade out

        oscGain.gain.linearRampToValueAtTime(0.01, this.now + relativeEnd + crossFadeDur);
        a.connect(oscGain).connect(this.gainNode);
        this.playingNotes.add([a, oscGain]);
      },

      /* Playback a set of notes */
      playNotes(notes) {
        for (let note of notes) {
          this.playNote(note, playback.MIDITimeToSeconds(note.start), playback.MIDITimeToSeconds(note.end));
        }
      },

      /* Start a note playing */
      noteOn(pitch, velocity = 60) {
        if (this.notes[pitch]) return;
        if (!this.context) this.initAudio();
        let a = this.context.createOscillator();
        let oscGain = this.context.createGain();
        a.frequency.value = tune.Util.ETToFreq(pitch);
        a.type = 'sawtooth';
        a.start();
        oscGain.gain.value = velocity / 127;
        a.connect(oscGain).connect(this.gainNode);
        this.notes[pitch] = a;
      },

      /* End a note playing */
      noteOff(pitch) {
        this.notes[pitch]?.stop(0);
        this.notes[pitch] = undefined;
      }

    };

    const grid = {
      /** Create the time/pitch grid using HTML Canvas. */
      draw() {
        let div = $(document.createElement('div')).addClass("grid").attr({
          width: editor$1.width,
          height: editor$1.height
        }).css({
          width: editor$1.width,
          height: editor$1.height,
          position: 'absolute',
          left: 0,
          top: 0,
          zIndex: -5,
          overflow: 'scroll'
        }).appendTo('.right-container');
        let c = $(document.createElement('canvas')).attr({
          width: editor$1.width,
          height: editor$1.height
        }).css({
          position: 'absolute',
          left: 0,
          top: 0,
          zIndex: 1,
          display: 'block'
        }).appendTo(div).on("mouseup", ø => {
          // clear selection
          editor$1.selectObject();
        }).text("Grid");
        let ctx = c.get()[0].getContext("2d");
        ctx.beginPath();
        ctx.fillStyle = style.keyDisplay.black.seqFillUnselected; // draw horizontal lines

        for (let i = 0; i < editor$1.numKeys; i++) {
          if ([1, 3, 6, 8, 10].includes(i % 12)) {
            // accidental
            ctx.rect(0, (editor$1.numKeys - (i + 1)) * editor$1.zoomY, editor$1.width, editor$1.zoomY);
          }
        }

        ctx.fill(); // draw vertical lines / tick marks corresponding to 4/4

        ctx.beginPath();

        for (let i = 0; i < editor$1.widthInTime; i++) {
          let width = (!(i % 2) + !(i % 4) + !(i % 8) + !(i % 16) + 1) / 2;
          ctx.rect(i * editor$1.zoomX, 0, width, editor$1.height);
        }

        ctx.fillStyle = style.darkGrey;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        this.$div = div;
        this.$canvas = c;
      },

      /** Adjust the zoom to the editor's aspect ratio. */
      zoom(xZoom, yZoom) {
        this.$canvas.width(editor$1.width);
        this.$canvas.height(editor$1.height);
      },

      /** Set the zoom/scale amount, preserving aspect ratio. */
      scale(val) {
        this.$canvas.css('zoom', val);
      },

      /** Move the grid to specified coordinates. */
      scroll(x, y) {
        let top = -(y - this.$div.offset().top);
        let left = -(x - style.keyDisplay.width);
        this.$canvas.offset({
          top: top / editor$1.zoomXY,
          left: left / editor$1.zoomXY
        });
      },

      /** Create a rectangle to display over the grid. */
      highlightPitch(pitch, play = true, options) {
        let rect;

        if (!this.highlightRectangles[pitch]) {
          rect = editor$1.canvas.rect(editor$1.width, editor$1.zoomY).move(0, (editor$1.numKeys - (pitch + 1)) * editor$1.zoomY).fill(options.seqFillSelected).opacity(0.5).back();
          this.highlightRectangles[pitch] = rect;
        } else {
          rect = this.highlightRectangles[pitch];
        }

        if (play) rect.show();else rect.hide();
      },

      /** The displayed SVG highlight rectangles. */
      highlightRectangles: []
    };

    /** A key in the displayed sideways keyboard. */

    class PianoKey {
      constructor(pitch) {
        this.pitchClass = pitch % 12;
        this.isNatural = ![1, 3, 6, 8, 10].includes(this.pitchClass);
        this.displayOptions = this.isNatural ? style.keyDisplay.white : style.keyDisplay.black;
        this.pitch = pitch;
        this.pitchName = pitchName(this.pitch);
      }

      get x() {
        return 0;
      }

      get textX() {
        return this.x + this.width - this.text.length() - 2;
      }

      get textY() {
        return this.y + this.height - this.textSize - 2;
      }

      get textSize() {
        return 8;
      }

      get y() {
        let relativeY = PianoKey.keyYVals[this.pitchClass] * 12 / 7;
        let unscaledY = relativeY + Math.floor(this.pitch / 12) * 12;
        return (editor$1.numKeys - unscaledY) * editor$1.zoomY * keyboard.scaleVal;
      }

      get width() {
        return this.displayOptions.width;
      }

      get whiteKeyHeight() {
        return 12 / 7 * editor$1.zoomY * keyboard.scaleVal;
      }

      get height() {
        return this.isNatural ? this.whiteKeyHeight : this.whiteKeyHeight * 0.6;
      }
      /** Redraw the position, size, and text of the graphics. */


      updateGraphics(animateDuration) {
        if (!this.canvas) return;
        this.keyRect.size(this.width, this.height).move(this.x, this.y);

        if (this.text) {
          if (this.height < this.textSize * 1.3) {
            this.text.hide();
          } else {
            this.text.font({
              size: this.textSize
            }).x(this.textX).y(this.textY).show();
          }
        }
      }
      /** Draw the key as a rectangle on `canvas`. Only called upon creation. */


      draw(canvas) {
        this.canvas = canvas;
        this.keyRect = canvas.rect(this.width, this.height).radius(2).stroke({
          color: 'grey',
          width: 1
        }).fill(this.displayOptions.color).move(this.x, this.y).mouseover(() => {
          this.keyRect.fill(this.displayOptions.hoverColor);
        }).mouseout(ø => this.noteOff()).mousedown(ø => this.noteOn()).mouseup(ø => this.noteOff());
        if (!this.isNatural) this.keyRect.front();else this.keyRect.back();

        if (this.pitchName == 'C') {
          this.text = this.canvas.text(pitchName(this.pitch, true)).font(style.editorText);
          this.text.font({
            size: this.textSize
          }).x(this.textX).y(this.textY).addClass("mouse-disabled");
        }
      }
      /** Display the note as pressed and play back audio of the pitch */


      noteOn(velocity = 60) {
        this.keyRect.fill(this.displayOptions.clickColor);
        grid.highlightPitch(this.pitch, true, this.displayOptions);
        audio.noteOn(this.pitch, velocity);
      }
      /** Display the note as released and stop audio of the pitch */


      noteOff() {
        this.keyRect.fill(this.displayOptions.color);
        grid.highlightPitch(this.pitch, false, this.displayOptions);
        audio.noteOff(this.pitch);
      }

    }
    /** Relative spacing between start of key rectangles. */


    PianoKey.keyYVals = [1, 1.1, 2, 2.4, 3, 4, 4.1, 5, 5.3, 6, 6.5, 7];
    const keyboard = {
      /** Create SVG element and draw all piano keys. */
      draw() {
        this.canvas = SVG().addTo('#roll-keyboard').size(style.keyDisplay.width, editor$1.zoomY * editor$1.numKeys);
        this.svg = this.canvas;

        for (let i = 0; i < editor$1.numKeys; i++) {
          let key = new PianoKey(i);
          key.draw(this.canvas);
          this.keys.push(key);
        }
      },

      zoom(xZoom, yZoom) {
        this.canvas.size(style.keyDisplay.width, yZoom * editor$1.numKeys);

        for (let key of this.keys) key.updateGraphics(0);
      },

      scale(val) {
        this.scaleVal = val;
        this.canvas.size(style.keyDisplay.width, val * editor$1.height);

        for (let key of this.keys) key.updateGraphics(0);
      },

      scaleVal: 1,

      /** Trigger note on for the given pitch */
      noteOn(pitch, velocity = 60) {
        this.keys[pitch].noteOn(velocity);
      },

      /** Trigger note off for the given pitch */
      noteOff(pitch) {
        this.keys[pitch].noteOff();
      },

      keys: [],

      get width() {
        return style.keyDisplay.width;
      },

      /** Move to the given scrolled coordinates. */
      scroll(x, y) {
        let $keyboard = $('.piano-container');
        $keyboard.css('overflow', 'scroll');
        $keyboard.scrollTop(y);
        $keyboard.css('overflow', 'hidden');
      }

    };

    const userPreferences = {
      /**
       * If `true`, reset notes after the interval between
       *   them is deleted.
       */
      propagateBendAfterDeletion: true,

      /**
       * If `true` always display the sizes of intervals.
       *   If `false` only display the sizes of intervals when
       *   hovering over edges.
       * 
       */
      alwaysShowEdges: false,

      /**
       * The pitch bend width (in semitones) of the MIDI instrument
       *  the user is importing from / exporting to.
       */
      pitchBendWidth: 1,

      /**
       * The default amount of easing for created glisses.
       */
      glissEasing: 0.5
    };

    class SeqEdge {
      /**
       * A connection of an interval between two `SeqNote`s.
       *   The interval is always assigned in the same direction
       *   as the existing interval between `a` and `b`.
       * 
       * @param { SeqNote } a The start note
       * @param { SeqNote } b The end note
       * @param { tune.Interval } interval The interval to connect by
       */
      constructor(a, b, interval) {
        this.a = a;
        this.b = b;

        if (this.a.soundingPitch > this.b.soundingPitch) {
          this.maxNote = this.a;
          this.minNote = this.b;
        } else {
          this.maxNote = this.b;
          this.minNote = this.a;
        }

        this._interval = interval;
      }
      /** Redraw the line and interval text. */


      updateGraphics(animateDuration = 300) {
        if (this.line) {
          this.text.text(normAscendingInterval(this.interval).toString());
          let line = animateDuration ? this.line.animate(animateDuration) : this.line;
          let text = animateDuration ? this.text.animate(animateDuration) : this.text;
          let dist = Math.abs(this.a.start - this.b.start);
          let width = 4 * (1 - Math.tanh(dist / 64)) + 1;
          let path = simpleBezierPath({
            x: this.x1,
            y: this.y1
          }, {
            x: this.x2,
            y: this.y2
          }, 'vertical');
          line.plot(path).stroke({
            width
          });
          text.center(this.midX, this.midY);
        }
      }
      /** Midpoint x of the line. */


      get midX() {
        return (this.x1 + this.x2) / 2;
      }
      /** Midpoint y of the line. */


      get midY() {
        return (this.y1 + this.y2) / 2;
      }

      get x1() {
        return this.minNote.handleX;
      }

      get x2() {
        return this.maxNote.handleX;
      }

      get y1() {
        return this.minNote.handleY;
      }

      get y2() {
        return this.maxNote.handleY;
      }

      set selected(val) {
        this._selected = val;
        let strokeColor = val ? style.strokeSelected : style.editorLine.color;
        this.line.stroke(strokeColor);
      }

      get selected() {
        return this._selected;
      }
      /** Draw the edge as a path on `canvas`. Only called upon creation. */


      draw(canvas) {
        let path = simpleBezierPath({
          x: this.x1,
          y: this.y1
        }, {
          x: this.x2,
          y: this.y2
        }, 'vertical');
        let dist = Math.abs(this.a.start - this.b.start);
        let width = 4 * (1 - Math.tanh(dist / 64)) + 1;
        this.line = canvas.path(path).stroke(style.editorLine).opacity(0.7).fill('none');
        this.line.stroke({
          width
        });
        addTooltip(this.line.node, "Press Enter to edit interval size");
        editor$1.assignMouseHandler(this, this.line, "edge_line");
        let intervalLabel = normAscendingInterval(this.interval).toString();
        this.text = canvas.text(intervalLabel).font(style.editorText).center(this.midX, this.midY).addClass("mouse-disabled");
        if (!userPreferences.alwaysShowEdges) this.text.opacity(0);
      }
      /** Hide the edge in the editor */


      hide() {
        this.text.hide();
        this.line.hide();
      }
      /** Show the edge in the editor */


      show() {
        this.line.show();
        this.text.show();
      }
      /**
       * This function is called when the user
       * directly deletes this object. The effects may propagate
       * to connected objects.
       */


      delete() {
        if (!this.removed) {
          this.remove();

          if (userPreferences.propagateBendAfterDeletion) {
            /* Retune the higher note */
            this.maxNote.propagateBend(0, 300, [this.minNote]);
          }
        }
      }
      /**
       * This function is called when the object
       * is removed by a connected object. It
       * does not propagate.
       */


      remove() {
        if (!this.removed) {
          this.line.remove();
          this.text.remove();
          SeqNote.graph.get(this.a)?.delete(this.b);
          SeqNote.graph.get(this.b)?.delete(this.a);
          this.removed = true;
        }
      }

      get interval() {
        return this._interval;
      }
      /** The interval represented by the edge. 
       * It will always go in the same direction 
       * as the existing interval between `a` and `b`.
       * */


      set interval(val) {
        /* Ensure the intervals go in the same direction */
        if (this._interval.cents() * val.cents() > 0) {
          this._interval = val;
        } else {
          this._interval = val.inverse();
        }

        if (this.a.soundingPitch > this.b.soundingPitch) {
          this.maxNote = this.a;
          this.minNote = this.b;
        } else {
          this.maxNote = this.b;
          this.minNote = this.a;
        }

        this.updateGraphics(0);
      }
      /** Return the difference between the edge interval
       *    and the ET interval between `a` and `b`.
       * */


      getBend() {
        let etDistance = tune.ETInterval(this.maxNote.pitch - this.minNote.pitch);
        return this.interval.abs().subtract(etDistance).cents() / 100;
      }

    } // define missing abs() in tune.Interval

    const abs = function () {
      return this.cents() > 0 ? this : this.inverse();
    };

    tune.ETInterval.prototype.abs = abs;
    tune.FreqRatio.prototype.abs = abs;

    class SeqNote {
      constructor(pitch, velocity, start, duration) {
        this._pitch = pitch;
        this._velocity = velocity;
        this._start = start;
        this._end = start + duration;
        this.glissInputs = [];
        this.glissOutputs = [];
        this._bend = 0;
        SeqNote.graph.set(this, new Map());
      }
      /* Update display and set velocity. Valid range = [0, 128) */


      set velocity(val) {
        this._velocity = val.clamp(0, 128);
        this.shadowRect.fill(style.noteShadowFill(this));
        this.rect.fill(style.noteFill(this));

        for (let g of this.glissOutputs) g.redrawColor();

        for (let g of this.glissInputs) g.redrawColor();
      }

      get velocity() {
        return this._velocity;
      }

      get pitch() {
        return this._pitch;
      }
      /* Update display and set pitch. Valid range = [0, 128) */


      set pitch(val) {
        this._pitch = Math.floor(val.clamp(0, 128));
        this.redrawPosition(0);
      }
      /** 
       * Change bend and update the display. If the bend is 
       * outside the range [-0.5, 0.5), change the pitch as well. 
       * */


      set bend(val) {
        let steps = Math.round(Math.abs(val));

        if (val >= 0.5) {
          this.pitch += steps;
          this._bend = val - steps;
        } else if (val < -0.5) {
          this.pitch += -steps;
          this._bend = val + steps;
        } else {
          this._bend = val;
        }

        this.updateGraphics(0);
        this.redrawInputs(0);
        this.redrawOutputs(0);
      }

      get bend() {
        return this._bend;
      }

      set start(val) {
        this._start = val.clamp(0, Infinity);
        this.updateGraphics(0);
        this.redrawInputs(0);
      }

      get start() {
        return this._start;
      }

      set end(val) {
        this._end = val.clamp(1, Infinity);
        this.updateGraphics(0);
        this.redrawOutputs(0);
      }

      get end() {
        return this._end;
      }
      /* Set start while keeping duration */


      set startMove(val) {
        let d = this.duration;
        this._start = val;
        this._end = val + d;
        this.redrawPosition(0);
      }

      get soundingPitch() {
        return this.bend + this.pitch;
      }

      get frequency() {
        return tune.Util.ETToFreq(this.soundingPitch);
      }

      get duration() {
        return this.end - this.start;
      }

      get x() {
        return this.start * this.seq.zoomX;
      }

      get xEnd() {
        return this.end * this.seq.zoomX;
      }

      get y() {
        return (this.seq.numKeys - (this.pitch + 1 + this._bend)) * this.seq.zoomY;
      }

      get yET() {
        return (this.seq.numKeys - (this.pitch + 1)) * this.seq.zoomY;
      }

      get width() {
        return this.duration * this.seq.zoomX;
      }

      get height() {
        return this.seq.zoomY;
      }

      get handleX() {
        return this.x + 0.5 * this.height;
      }

      get handleY() {
        return this.y + 0.5 * this.height;
      }

      get neighbors() {
        return SeqNote.graph.get(this).entries();
      }

      get asNote() {
        return tune.ETPitch(this.soundingPitch);
      }

      set selected(val) {
        this._selected = val;
        let strokeColor = val ? style.strokeSelected : style.noteFill(this);
        this.rect.stroke(strokeColor);
      }

      get selected() {
        return this._selected;
      }
      /** Redraw the position of the graphics and propagate this change. */


      redrawPosition() {
        this.rect.move(this.x, this.y);
        this.shadowRect.move(this.x, this.yET);
        this.handle.center(this.handleX, this.handleY);
        this.indicator.center(this.handleX - this.height * 0.8, this.handleY);
        this.centDisplay.x(this.handleX - this.height - this.centDisplay.length() - 5).cy(this.handleY);
        this.resizeRight.move(this.xEnd - 4, this.y);
        this.redrawOutputs(0);
        this.redrawInputs(0);
      }
      /** Propagate position change to the input glisses and connected edges. */


      redrawInputs(animateDuration = 300) {
        for (let g of this.glissInputs) g.redrawPosition();

        for (let [_, edge] of this.neighbors) edge.updateGraphics(animateDuration);
      }
      /** Propagate position change to the output glisses. */


      redrawOutputs() {
        for (let g of this.glissOutputs) g.redrawPosition();
      }
      /** Update the position, size, and color of the display. */


      updateGraphics(animateDuration = 300) {
        let rect = this.rect,
            shadowRect = this.shadowRect,
            handle = this.handle,
            indicator = this.indicator,
            centDisplay = this.centDisplay,
            resizeRight = this.resizeRight;

        if (animateDuration) {
          rect = rect.animate(animateDuration);
          shadowRect = shadowRect.animate(animateDuration);
          handle = handle.animate(animateDuration);
          indicator = indicator.animate(animateDuration);
          centDisplay = centDisplay.animate(animateDuration);
          resizeRight = resizeRight.animate(animateDuration);
        } // non-animated changes


        this.centDisplay.text(this.bendText); // possibly animated changes

        rect.move(this.x, this.y).size(this.width, this.height);
        shadowRect.move(this.x, this.yET).size(this.width, this.height);
        handle.size(this.height, this.height).center(this.handleX, this.handleY);
        indicator.size(this.height / 4, this.height / 2).center(this.handleX - this.height * 0.8, this.handleY);
        centDisplay.x(this.handleX - this.height - this.centDisplay.length() - 5).cy(this.handleY);
        resizeRight.size(4, this.height).move(this.xEnd - 4, this.y);
        if (Math.abs(this.bend) < 1e-2) this.indicator.fill('grey'); // shows when < 1c
        else if (this.bend < 0) this.indicator.fill('blue');else this.indicator.fill('red');
      }
      /** Hide the note in the editor */


      hide() {
        this.rect.hide();
        this.handle.hide();
        this.indicator.hide();
      }
      /** Show the note in the editor */


      show() {
        this.rect.show();
        this.handle.show();
        this.indicator.show();
      }
      /** Move the note up or down octaves, adjusting the edge interval sizes. */


      transposeByOctaves(n) {
        let pitch = this.pitch;
        this.pitch += 12 * n;

        for (let [note, edge] of this.neighbors) {
          let octaves = tune.FreqRatio(2, 1).multiply(n);

          if (note.pitch > pitch) {
            edge.interval = edge.interval.subtract(octaves);
          } else {
            edge.interval = edge.interval.add(octaves);
          } //console.log("interval:", edge.interval.toString())


          edge.updateGraphics(0);
        }

        this.redrawPosition(0);
      }
      /** Draw the note as a rectangle on `canvas`. Only called upon creation. */


      draw(canvas) {
        // shadow rectangle, shows equal tempered pitch
        this.shadowRect = canvas.rect(this.width, this.height).stroke(style.noteShadowStroke).fill(style.noteShadowFill(this)).opacity(0.3).radius(2).move(this.x, this.yET);
        let fillColor = style.noteFill(this); // main rectangle, shows adjusted pitch

        this.rect = canvas.rect(this.width, this.height).fill(fillColor).stroke(fillColor).radius(2).move(this.x, this.y);
        this.handle = canvas.group();
        this.handle.circle(this.height / 2).center(this.handleX, this.handleY).fill("white"); // invisible, but catches mouse events

        this.handle.rect(this.height, this.height).center(this.handleX, this.handleY).front().stroke('black').fill('white').radius(2).opacity(0.2);
        this.indicator = canvas.rect(this.height / 4, this.height / 2).center(this.handleX - this.height * 0.8, this.handleY).radius(2);
        this.centDisplay = canvas.text(this.bendText).font(style.editorText).opacity(0);
        this.centDisplay.x(this.handleX - this.height - this.centDisplay.length() - 5).cy(this.handleY).addClass("mouse-disabled");
        this.resizeRight = canvas.rect(4, this.height).move(this.xEnd - 4, this.y).radius(2).stroke('black').opacity(0.3).fill('black');
        addTooltip(this.handle.node, "Drag to attach notes by an interval");
        addTooltip(this.rect.node, "Shift+Drag to adjust pitch bend");
        addTooltip(this.resizeRight.node, "Drag to resize; Shift+Drag to create a gliss");
        addTooltip(this.indicator.node, "Drag to resize");
        this.group = canvas.group();
        this.rect.addTo(this.group);
        this.handle.addTo(this.group);
        this.indicator.addTo(this.group);
        this.centDisplay.addTo(this.group);
        this.resizeRight.addTo(this.group);
        editor$1.assignMouseHandler(this, this.rect, "note_body");
        editor$1.assignMouseHandler(this, this.indicator, "note_left_handle");
        editor$1.assignMouseHandler(this, this.handle, "note_attach"); // originally was the handle.rect

        editor$1.assignMouseHandler(this, this.resizeRight, "note_right_handle");
        editor$1.assignMouseHandler(this, this.group, "note_group");
        this.updateGraphics(0);
        return [this.rect, this.shadowRect];
      }
      /** The number of cents of bend, as a string. */


      get bendText() {
        let str = Math.round(this.bend * 100 * 100) / 100 + "c";
        if (this.bend >= 0) str = "+" + str;
        return str;
      }
      /**
       * StoreVals := [...]
       * 
       * initialStore : [...StoreVals]
       * predicate : [Edge, Note] -> Boolean
       * combine: Edge, Note, ...StoreVals -> [...StoreVals]
       * successVal : Edge, Note, ...StoreVals -> S
       * failureVal : () -> S
       * */


      BFS(options) {
        options.noVisit = options.noVisit || [];
        options.initialStore = options.initialStore || [null];

        options.combine = options.combine || ((edge, child) => []);

        options.successVal = options.successVal || ((edge, child) => child);

        options.failureVal = options.failureVal || (ø => null);

        let visited = new Set(options.noVisit);
        let fringe = [[this, ...options.initialStore]];

        while (fringe.length) {
          let [node, ...storeVals] = fringe.pop();
          visited.add(node);

          for (let [child, edge] of node.neighbors) {
            if (!visited.has(child)) {
              let newStore = options.combine(edge, child, ...storeVals);

              if (options.predicate(edge, child)) {
                return options.successVal(edge, child, ...storeVals);
              } else {
                fringe.unshift([child, ...newStore]);
              }
            }
          }
        }

        if (options.returnAll) return [...visited];
        return options.failureVal();
      }
      /**
       * Calculate the interval from `this` to `other`. 
       * If they are in the same component, accumulate the 
       * interval along the path. Otherwise, calculate the 
       * difference as an ET interval. 
       */


      getIntervalTo(other) {
        return this.BFS({
          initialStore: [tune.ETInterval(0)],
          predicate: (edge, child) => child == other,
          combine: (edge, child, interval) => {
            if (edge.maxNote == child) return [edge.interval.add(interval)];else return [edge.interval.inverse().add(interval)];
          },
          successVal: (edge, child, interval) => {
            if (edge.maxNote == child) return edge.interval.add(interval);else return edge.interval.inverse().add(interval);
          },
          failureVal: () => tune.ETInterval(other.soundingPitch - this.soundingPitch)
        });
      }
      /**
       * Connect to another note by an interval, returning the newly created `SeqEdge`.
       * 
       * @param { SeqNote } other 
       * @param { tune.Interval } by 
       * @param { number } animateDuration 
       */


      connectTo(other, by = guessJIInterval(this.pitch, other.pitch), animateDuration = 300) {
        if (this.isConnectedTo(other)) return null;
        let edge = new SeqEdge(this, other, by);
        let oldNeighbors = [...SeqNote.graph.get(this).keys()];
        SeqNote.graph.get(this).set(other, edge);
        SeqNote.graph.get(other).set(this, edge);
        this.propagateBend(this.bend, animateDuration, oldNeighbors);
        return edge;
      }
      /**
       * If the `this` and `other` are in the same component, 
       *  remove the last edge on the path to `other`.
       */


      disconnectFrom(other) {
        return this.BFS({
          predicate: (edge, child) => child == other,
          successVal: (edge, child) => {
            edge.remove();
            return edge;
          },
          failureVal: ø => false
        });
      }
      /**
       * Returns true if `other` is in the same component as `this`.
       */


      isConnectedTo(other) {
        return this.BFS({
          predicate: (edge, child) => child == other,
          successVal: ø => true,
          failureVal: ø => false
        });
      }
      /**
       * Returns all notes in the component, not including `this`.
       */


      getAllConnected() {
        return this.BFS({
          predicate: () => false,
          returnAll: true
        });
      }
      /** 
       * Adjust the pitch bend of `this`
       * and propagate the effect along the graph
      */


      propagateBend(bend = this.bend, animateDuration = 300, awayFrom = []) {
        this.bend = bend;
        this.BFS({
          noVisit: awayFrom,
          initialStore: [bend],
          predicate: () => false,
          combine: (edge, child, bend) => {
            let edgeBend = edge.maxNote == child ? edge.getBend() : -edge.getBend();
            let newBend = edgeBend + bend;
            child.bend = newBend;
            return [child.bend];
          }
        });
      }
      /**
       * This function is called when the user
       * directly deletes this object. The effects may propagate
       * to connected objects.
       */


      delete() {
        if (!this.removed) {
          for (let [_, edge] of this.neighbors) edge.delete();

          for (let g of this.glissInputs) g.remove();

          for (let g of this.glissOutputs) g.remove();

          let removed = this.glissInputs.concat(this.glissOutputs).concat([...this.neighbors].map(e => e[1]));
          editor$1.removeReferences(removed);
          this.remove();
        }
      }
      /**
       * This function is called when the object
       * is removed by a connected object. It
       * does not propagate.
       */


      remove() {
        if (!this.removed) {
          this.group.remove();
          this.shadowRect.remove();
          SeqNote.graph.delete(this);

          for (let map of SeqNote.graph.values()) map.delete(this);

          this.removed = true;
        }
      }

    }
    /** 
     * The adjacency data structure for all notes in the editor. 
     * Structure: `Map<SeqNote a, Map<SeqNote b, SeqEdge edge>>`.
     *  `edge` is the edge from `a` to `b`. 
     * */
    // The edges are undirected, but
    //  I don't think it's possible to index by a pair of objects
    //  so each edge is stored as both (a, b) and (b, a).

    SeqNote.graph = new Map();

    const bezier = require("bezier-easing");

    class SeqGliss {
      constructor(start, end) {
        this.startNote = start;
        this.endNote = end;
        this.easing = userPreferences.glissEasing;
      }

      set selected(val) {
        this._selected = val;
        let strokeColor = val ? style.strokeSelected : this.gradient;
        this.line.stroke(strokeColor);
      }

      get selected() {
        return this._selected;
      }

      get duration() {
        return (this.endNote.start - this.startNote.end).clamp(0, Infinity);
      }
      /**
       * This function is called when the user
       * directly deletes this object. The effects may propagate
       * to connected objects.
       */


      delete() {
        if (!this.removed) {
          this.remove();
          this.startNote.glissOutputs = this.startNote.glissOutputs.filter(e => e != this);
          this.endNote.glissInputs = this.endNote.glissInputs.filter(e => e != this);
        }
      }
      /**
       * This function is called when the object
       * is removed by a connected object. It
       * does not propagate.
       */


      remove() {
        if (!this.removed) {
          this.line.remove();
          this.removed = true;
        }
      }

      draw(canvas) {
        this.canvas = canvas;
        let color, width;

        if (this.startNote.xEnd >= this.endNote.x) {
          throw "Forbidden gliss.";
        } else {
          this.gradient = this.canvas.gradient('linear', add => {
            add.stop(0, style.noteFill(this.startNote));
            add.stop(1, style.noteFill(this.endNote));
          });
          color = this.gradient;
          width = editor$1.zoomY;
        }

        this.line = canvas.path(simpleBezierPath({
          x: this.startNote.xEnd,
          y: this.startNote.y + editor$1.zoomY / 2
        }, {
          x: this.endNote.x,
          y: this.endNote.y + editor$1.zoomY / 2
        }, 'horizontal', this.easing)).stroke({
          color,
          width
        }).fill('none').opacity(0.6).insertBefore(this.startNote.group).insertBefore(this.endNote.group);
        addTooltip(this.line.node, "Drag to adjust easing");
        editor$1.assignMouseHandler(this, this.line, "gliss_line");
      }

      updateGraphics() {
        this.redrawColor();
        this.redrawPosition();
      }

      redrawColor() {
        this.gradient.update(add => {
          add.stop(0, style.noteFill(this.startNote));
          add.stop(1, style.noteFill(this.endNote));
        });
      }

      redrawPosition() {
        this.line.plot(simpleBezierPath({
          x: this.startNote.xEnd,
          y: this.startNote.y + editor$1.zoomY / 2
        }, {
          x: this.endNote.x,
          y: this.endNote.y + editor$1.zoomY / 2
        }, 'horizontal', this.easing));
      }

      getFreqCurve() {
        const glissEasing = bezier(this.easing, 0, 1 - this.easing, 1);
        const glissPoints = [];
        const n = this.duration;

        for (let i = 0; i < n; i++) glissPoints.push(glissEasing(i / (n - 1)));

        let f1 = this.startNote.frequency;
        let f2 = this.endNote.frequency;
        let dFreq = f2 - f1;
        let freqCurve = glissPoints.map(n => 2 ** n - 1) // make exponential (pitch)
        .map(n => n * dFreq + f1);
        return new Float32Array(freqCurve);
      }

    }

    const MIDI = JZZ.MIDI;
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
          JZZ({
            sysex: true
          }).and(function () {
            resolve(this.info().inputs);
          });
        });
      },

      /**
       * Change the input MIDI device. The input
       * should be the name of the device or an element of
       * the array returned by `this.getInputDevices()`
       */
      setInputDevice(device) {
        this.port?.close();
        this.port = JZZ().openMidiIn(device);
        this.port.connect(midi.handleInputMessage);
      },

      /** Perform the action encoded in a MIDI message. */
      handleInputMessage(mid) {
        if (mid.isNoteOn()) {
          let pitch = mid.getNote();
          let velocity = mid.getVelocity();
          keyboard.noteOn(pitch, velocity);
        } else if (mid.isNoteOff()) {
          let pitch = mid.getNote();
          keyboard.noteOff(pitch);
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
        let smf = MIDI.SMF();
        let tracks = this.partitionIntoTracks(notes, options);

        for (let i = 0; i < tracks.length; i++) {
          let mtrk = MIDI.SMF.MTrk();
          smf.push(mtrk);
          tracks[i].forEach(note => this.addNoteToTrack(note, mtrk));
        } // Create and download .mid file


        let str = smf.dump();
        let b64 = JZZ.lib.toBase64(str);
        var uri = 'data:audio/midi;base64,' + b64;
        let a = document.createElement('a');
        a.href = uri;
        a.download = (fileName || "untitled") + ".mid";
        a.click();
      },

      /** Partition `notes` into a number of arrays without pitch bend conflict. */
      partitionIntoTracks(notes, options = {}) {
        options.releaseTime = options.releaseTime || 0;
        /* Need some logic here to handle glisses... */

        notes = notes.sort((a, b) => a.start - b.start); // keep track of the notes in each track

        let tracks = [[]];

        outer: for (let note of notes) {
          for (let i = 0; i < tracks.length; i++) {
            let track = tracks[i];

            if (!track.length || track[track.length - 1].end + options.releaseTime <= note.start) {
              track.push(note);
              continue outer;
            }
          } // Have to add a new track if loop is unsuccessful


          tracks.push([note]);
        }

        return tracks;
      },

      /** Convert the note to MIDI and add all necessary events. */
      addNoteToTrack(note, track) {
        let tick = note.start * 32;
        let endTick = note.end * 32;
        let pitch = pitchName(note.pitch, true);
        let velocity = note.velocity;
        let bend = scale14bits(note.bend / userPreferences.pitchBendWidth);
        track.add(tick, MIDI.noteOn(0, pitch, velocity)).add(tick, MIDI.pitchBend(0, bend)).add(endTick, MIDI.noteOff(0, pitch));
      },

      /** 
       * @async
       * Read a MIDI file and return an array of `SeqNote`s.
       * */
      readFromFile(file) {
        return new Promise((resolve, reject) => {
          if (!file) return reject();
          view.showLoader(`loading ${file.name}...`, ø => {
            let reader = new FileReader();
            reader.readAsBinaryString(file);

            reader.onload = ø => {
              let smf = MIDI.SMF(reader.result);
              let notesOn = [];
              let notes = [];
              let bends = [];

              for (let mtrk of smf) {
                for (let mid of mtrk) {
                  if (mid.isNoteOn()) {
                    let pitch = mid.getNote();
                    notesOn[pitch] = {
                      start: mid.tt / 32,
                      velocity: mid.getVelocity(),
                      pitch
                    };
                  } else if (mid.isNoteOff()) {
                    let pitch = mid.getNote();
                    let note = notesOn[pitch];
                    delete notesOn[pitch];

                    if (note) {
                      note.duration = mid.tt / 32 - note.start;
                      notes.push(note);
                    }
                  } else if (mid[0] >= 224 && mid[0] < 240) {
                    // pitch bend
                    // right now only works for one channel
                    let bend = mid[2] << 7 | mid[1];
                    bend = bend / 16384 * 2 - 1;
                    bend *= userPreferences.pitchBendWidth;
                    bends.push({
                      time: mid.tt / 32,
                      bend
                    });
                  }
                }
              }

              bends = bends.sort((a, b) => a.time - b.time);
              notes = notes.sort((a, b) => a.start - b.start);
              let i = 0;
              let currBend = 0;

              for (let note of notes) {
                if (note.start >= bends[i].time) currBend = bends[i++].bend;
                note.bend = currBend;
              }

              view.hideLoader();
              resolve(notes);
            };
          });
        });
      }

    };

    const scale14bits = val => {
      let result = Math.floor(16384 * (val + 1) / 2);
      if (result > 16383) throw new RangeError("Pitch bend values are too large to be represented in the given pitch bend range. Increase 'pitch bend width' in Preferences (and on your digital instrument) to fix this.");
      return result;
    };

    let undoStack = [];
    let redoStack = []; // basically a decorator that saves the action to the stack
    // while the process is being completed, the subprocesses
    // are saved to a substack so that they can be undone all 
    // at once or individually

    function mutator(func, name = "unknown") {
      return function (...args) {
        redoStack = [];
        let action = addAction(func, name, ...args); // child process adds its actions to substack

        let temp = undoStack;
        undoStack = action.stack;
        let result = action.do();
        undoStack = temp;
        return result;
      };
    }
    let tempStack;
    let tempAction; // a function to be called when a sequence of calls to `func`
    //  is about to take place

    const macroActionStart = function (func, name = "unknown") {
      redoStack = [];
      name = "macro_" + name;
      let action = {
        name,
        undo: macroUndo(name),
        stack: []
      };
      undoStack.push(action);
      tempStack = undoStack;
      tempAction = action;
      undoStack = action.stack;
      console.log("start macro");
    };

    function macroUndo(name) {
      let notes = editor$1.selection.filter(e => e instanceof SeqNote);
      let pairs;

      switch (name) {
        case "macro_resizeRight":
          pairs = notes.map(e => [e, e.end]);
          return () => {
            for (let [note, end] of pairs) note.end = end;
          };

        case "macro_resizeLeft":
          pairs = notes.map(e => [e, e.start]);
          return () => {
            for (let [note, start] of pairs) note.start = start;
          };

        case "macro_move":
          notes = editor$1.selectionForest.concat(notes);
          pairs = notes.map(e => [e, e.start, e.pitch]);
          return () => {
            for (let [note, start, pitch] of pairs) {
              note.startMove = start;
              note.pitch = pitch;
            }
          };

        case "macro_bend":
          pairs = notes.map(e => [e, e.pitch, e.bend]);
          return () => {
            for (let [note, pitch, bend] of pairs) {
              note.pitch = pitch;
              note.bend = bend;
            }
          };
      }
    }

    const macroActionEnd = function () {
      if (tempStack) {
        undoStack = tempStack;
        tempStack = undefined;
        tempAction.do = macroUndo(tempAction.name);
      }
    };

    function addAction(func, name, ...args) {
      let action = {
        name,
        do: () => func(...args),
        stack: []
      };
      action.undo = getUndo(action, ...args), undoStack.push(action);
      return action;
    }

    function getUndo(action, ...args) {
      let notes;
      let pairs;

      switch (action.name) {
        case "resetBend":
          notes = args.filter(e => e instanceof SeqNote);
          pairs = notes.map(e => [e, e.pitch, e.bend]);
          return () => {
            for (let [note, pitch, bend] of pairs) {
              note.pitch = pitch;
              note.bend = bend;
            }
          };

        case "disconnect":
          let interval = args[0].getIntervalTo(args[1]);
          return () => {
            editor$1.connect(args[0], args[1], interval);
            undoStack.pop();
          };

        case "connect":
          notes = args.filter(e => e instanceof SeqNote);
          pairs = notes.map(e => [e, e.pitch, e.bend]);
          return () => {
            editor$1.disconnect(args[0], args[1]);

            for (let [note, pitch, bend] of pairs) {
              note.pitch = pitch;
              note.bend = bend;
            }

            undoStack.pop();
          };

        case "tuneAsPartials":
          return () => action.stack.map(a => a.undo());

        case "delete":
        case "addNote":
        case "addGliss":
        case "divide":
        case "pasteJSON":
        case "paste":
        case "clearAllData":
        case "addCompressedData":
        case "transpose":
        default:
          return () => {
            addMessage("Unable to undo", 'orange');
          };
      }
    }

    function undo() {
      /* Disabled for now */
      return addMessage("Undo disabled", "orange");
    }
    function redo() {
      /* Disabled for now */
      return addMessage("Redo disabled", "orange");
    }
    window.undo = undo;
    window.redo = redo;
    window.stack = undoStack;
    window.redoStack = redoStack;

    const handlers = {};
    /* 
        Each handler may include the following methods:
            - exited(e, obj)
            - entered(e, obj)
            - hovered(e, obj)
            - clicked(e, obj)
            - doubleClicked(e, obj)
        Each method is passed the mouse event `e` and the object to modify.
    */

    let display = false;
    handlers["note_group"] = {
      exited(e, note) {
        /* hide number of cents */
        if (display && editor$1.action != editor$1.bend) {
          note.centDisplay.opacity(0);
          display = false;
        }
      },

      hovered(e, note) {
        /* show number of cents */
        if (editor$1.action != editor$1.bend) {
          note.centDisplay.opacity(1);
          display = true;
        } // make note a destination for connection


        if (editor$1.seqConnector.source && note != editor$1.seqConnector.source) {
          editor$1.seqConnector.destination = note;

          if (editor$1.action == editor$1.connector) {
            let intervalText;

            if (note.isConnectedTo(editor$1.seqConnector.source)) {
              /* No cycles allowed */
              editor$1.setCursorStyle("not-allowed");
            } else {
              /* Display the potential new interval */
              let defaultInterval = guessJIInterval(editor$1.seqConnector.source.pitch, note.pitch);
              intervalText = normAscendingInterval(defaultInterval).toString();
              let {
                x,
                y
              } = editor$1.canvas.point(e.x, e.y);
              editor$1.seqText.text(intervalText).center(x, y - 15).front().show();
            }
          } else if (editor$1.action == editor$1.measurer) {
            /* Measure the distance between the two notes */
            let text = editor$1.seqConnector.source.getIntervalTo(note).toString();
            let {
              x,
              y
            } = editor$1.canvas.point(e.x, e.y);
            editor$1.seqText.text(text).center(x, y - 15).front().show();
          }
        }
      },

      clicked(e, note) {
        if (e.metaKey || e.ctrlKey) {
          /* Ctrl-click adds or removes an object from selection */
          editor$1.toggleObjectInSelection(note);
        } else if (editor$1.tool == "ruler") {
          /* Begin measuring with the ruler */
          editor$1.clickStart = editor$1.canvas.point(e.x, e.y);
          editor$1.action = editor$1.measurer;
          editor$1.seqConnector.source = note;
          editor$1.seqConnector.stroke({
            color: 'black',
            width: 3
          }).opacity(0.6).front().show();
          editor$1.measurer(editor$1.seqConnector, e);
        } else {
          if (e.altKey) {
            /* Alt-drag = immediate copy/paste */
            editor$1.copySelection();
            editor$1.paste();
            editor$1.action = editor$1.move;
          } else {
            /* Clicking: just select a note */
            editor$1.selectObject(note);
          }

          let notes = editor$1.selection.filter(e => e instanceof SeqNote);
          editor$1.selectionForest = editor$1.getAllConnected(notes);
        }
      }

    };
    handlers["note_left_handle"] = {
      entered(e, note) {
        editor$1.setCursorStyle("col-resize");
      },

      exited(e, note) {
        if (editor$1.action != editor$1.resizeLeft) editor$1.setCursorStyle("default");
      },

      clicked(e, note) {
        /* Resize */
        editor$1.action = editor$1.resizeLeft;
        editor$1.selectObject(note);
        macroActionStart(editor$1.resizeLeft, "resizeLeft");
      }

    };
    handlers["note_right_handle"] = {
      entered(e, note) {
        if (e.shiftKey) editor$1.setCursorStyle("all-scroll");else editor$1.setCursorStyle("col-resize");
      },

      exited(e, note) {
        if (editor$1.action != editor$1.resizeRight) editor$1.setCursorStyle("default");
      },

      clicked(e, note) {
        if (e.shiftKey) {
          /* Create a gliss from this note */
          editor$1.action = editor$1.glisser;
          editor$1.seqConnector.source = note;
          let color = style.noteFill(note);
          let width = editor$1.zoomY;
          editor$1.seqConnector.stroke({
            color,
            width
          }).opacity(0.6).show();
          editor$1.glisser(editor$1.seqConnector, e);
        } else {
          /* Resize */
          editor$1.action = editor$1.resizeRight;
          editor$1.selectObject(note);
          macroActionStart(editor$1.resizeRight, "resizeRight");
        }
      }

    };
    handlers["note_attach"] = {
      entered(e, note) {
        editor$1.setCursorStyle("crosshair");
      },

      exited(e, note) {
        if (!editor$1.seqConnector.visible()) editor$1.setCursorStyle("default"); // use editor.action
        else editor$1.setCursorStyle("crosshair");
      },

      clicked(e, note) {
        /* Drag to connect to another note */
        let pt = editor$1.canvas.point(e.x, e.y);
        let path = simpleBezierPath({
          x: pt.x,
          y: note.y + 0.5 * note.height
        }, pt, 'vertical');
        editor$1.seqConnector.plot(path).stroke(style.editorLine).opacity(1).show();
        editor$1.seqConnector.source = note;
        editor$1.action = editor$1.connector;
      }

    };
    handlers["note_body"] = {
      exited(e, note) {
        editor$1.seqConnector.destination = null;
        if (editor$1.action != editor$1.bend) editor$1.setCursorStyle("default");
      },

      hovered(e, note) {
        if (e.shiftKey) editor$1.setCursorStyle("ns-resize");else editor$1.setCursorStyle("move");
      },

      clicked(e, note) {
        if (e.shiftKey) {
          /* Shift-drag = bend */
          editor$1.action = editor$1.bend;
          editor$1.selectObject(note);
          macroActionStart(editor$1.bend, "bend");
        } else {
          /* Drag = move */
          editor$1.action = editor$1.move;
          editor$1.selectObject(note);
          macroActionStart(editor$1.move, "move");
        }

        note.centDisplay.opacity(1);
      }

    };
    handlers["edge_line"] = {
      hovered(e, edge) {
        /* Show interval size */
        edge.text.opacity(1);
      },

      exited(e, edge) {
        /* Hide interval size */
        if (!userPreferences.alwaysShowEdges) edge.text.animate(100).opacity(0);
      },

      clicked(e, edge) {
        if (e.metaKey || e.ctrlKey) editor$1.toggleObjectInSelection(edge);else editor$1.selectObject(edge);
        e.stopPropagation();
      },

      doubleClicked(e, edge) {
        editor$1.typeEdit(null, edge);
      }

    };
    handlers["gliss_line"] = {
      hovered(e, gliss) {
        editor$1.setCursorStyle("ns-resize");
      },

      exited(e, gliss) {
        if (editor$1.action != editor$1.glissEasing) editor$1.setCursorStyle("auto");
      },

      clicked(e, gliss) {
        if (e.metaKey || e.ctrlKey) {
          editor$1.toggleObjectInSelection(gliss);
        } else {
          /* Drag = adjust easing */
          editor$1.selectObject(gliss);
          editor$1.action = editor$1.glissEasing;
          macroActionStart(editor$1.glissEasing, "glissEasing");
        }

        e.stopPropagation();
      }

    };

    /* for interaction with the DOM */

    const view$1 = {
      $loader: $('.loader-container'),
      $guiContainer: $('#sequencer'),
      $controls: $('#controls-container'),
      $buttonContainer: $('.file-button-container'),
      $fileName: $('.filename'),

      /* Show the loading animation then perform the callback */
      showLoader(msg, callback) {
        this.$loader.find("p").text(msg || 'loading...');
        this.$loader.fadeIn(1000);
        this.$guiContainer.fadeTo(2000, 0, callback);
      },

      /* Hide the loading animation then perform the callback */
      hideLoader(callback) {
        this.$loader.fadeOut(1000, callback);
        this.$guiContainer.fadeTo(2000, 1);
      },

      /* Message for save to local storage */
      showSaveMessage() {
        $('#save-time').text(`Saved to browser storage at ${new Date().toLocaleTimeString()}`).show().delay(1000).fadeOut(2000);
      },

      /* Update the displayed filename */
      changeFileName(name) {
        this.$fileName.val(name);
      },

      /* Append a button to the controls panel */
      addButton(text, parent = this.$controls) {
        return $(document.createElement('button')).text(text).appendTo(parent);
      },

      /* Append a button with an icon to the controls panel */
      iconButton(imgSrc, callback) {
        let $button = $(document.createElement('button')).on('click', callback).appendTo(this.$buttonContainer).addClass("icon-button has-tooltip");
        $(`<img src="${imgSrc}"/>`).attr({
          height: 15,
          width: 15
        }).appendTo($button);
        return $button;
      },

      /* Append a divider to the controls panel */
      divider() {
        $('<span></span>').appendTo(this.$buttonContainer).css({
          'border-left': "2px solid black",
          'border-radius': 1,
          'opacity': 0.5,
          'padding-top': 4
        });
      },

      /* Create controls panel */
      init() {
        /* Export .spr */
        this.iconButton("assets/download_icon.png", editor$1.saveJSONFile).attr('title', 'Download .spr file');
        /* Export MIDI */

        this.iconButton("assets/midi2_icon.png", editor$1.exportMIDI).attr('title', 'Export .mid file').css({
          paddingRight: 0,
          paddingLeft: 0
        }).children().attr('width', 30);
        /* Open */

        this.iconButton("assets/open_icon.png", ø => $filePick.trigger('click')).attr('title', 'Open .spr or .mid file');
        /* Invisible filepicker */

        let $filePick = $(document.createElement('input')).attr('type', 'file').css({
          display: 'none',
          width: 0,
          opacity: 0
        }).on('change', e => {
          editor$1.openFile(e.target.files[0]);
          $filePick.val("");
        }).appendTo(this.$controls);
        this.divider();
        /* Copy file */

        this.iconButton("assets/copy_icon.png", editor$1.copyJSONToClipboard).attr('title', 'Copy file to clipboard');
        /* Paste file */

        this.iconButton("assets/paste_icon.png", editor$1.pasteJSONFromClipboard).attr('title', 'Load file from clipboard');
        this.divider();
        /* Edit filename */

        let saveName = true;
        const $fileName = $('.filename').on('keydown', e => {
          if (e.key == 'Enter') {
            saveName = true;
            $fileName.blur();
          } else if (e.key == 'Escape') {
            saveName = false;
            $fileName.blur();
          }

          e.stopPropagation();
        }).on('keypress', e => {
          $fileName.trigger('input'), e.stopPropagation();
        }).on("blur", e => {
          /* Only save the filename if edit is confirmed */
          if (saveName) editor$1.fileName = e.target.value;else e.target.value = editor$1.fileName;
          saveName = true;
        });
        /* Retune */

        this.iconButton("assets/wand_icon.png", ø => editor$1.applyToSelection(editor$1.tuneAsPartials)).attr('title', 'Fit selection to the harmonic series');
        /* Equally Divide */

        let $eqButton = this.iconButton("assets/frac_icon.webp", ø => editor$1.applyToSelection(editor$1.equallyDivide, $divisions.val())).attr('title', 'Equally divide').children().attr({
          width: 12,
          height: 15
        });
        this.divider();
        /* Open Settings */

        this.iconButton("assets/setting_icon.png", ø => $('.setting-screen').fadeIn(500)).attr('title', 'Settings');
        /* Show Help */

        this.iconButton("assets/help_icon.png", ø => $('.control-screen').fadeIn(500)).attr('title', 'Show controls');
        this.addButton("Clear all data").on('click', editor$1.clearAllData);
        /* Change number of equal divisions */

        const $divisions = $(document.createElement('input')).attr({
          type: 'number',
          min: 2,
          max: 20,
          value: 2
        }).on('keydown', e => {
          if (e.key == 'Enter') {
            $eqButton.trigger('click');
            e.stopPropagation();
          }
        }).appendTo(this.$controls);
        /* Change tempo */

        $(document.createTextNode('bpm:')).appendTo(this.$controls);
        const $tempo = $(document.createElement('input')).attr({
          type: 'number',
          min: 80,
          max: 200,
          value: 120
        }).on('input', ø => {
          playback.bpm = parseInt($tempo.val());
        }).appendTo(this.$controls);
        /* Zoom for editor */

        const $xRange = $(document.createElement('input')).attr({
          id: 'x-zoom',
          type: "range",
          min: 4,
          max: 32,
          step: 1
        }).css({
          position: 'absolute',
          right: 20,
          bottom: 10
        }).appendTo('body');
        $('.control-screen').on('click', ø => $('.control-screen').fadeOut(500));
        $('.setting-screen').on('click', ø => $('.setting-screen').fadeOut(500));
        $xRange.on('input', ø => editor$1.zoom(+$xRange.val(), editor$1.zoomY));
      }

    };

    /**
     * Experimental!
     * 
     * Model the predicted sequence of JI (or other) 
     *   intervals as a hidden Markov model, with
     *   interval classes as observed variables
     *   and the sequence moving upwards in pitch
     * 
     */
    const instances = {};
    const states = new Set();
    const model = {
      // viterbi algorithm
      // input: interval classes ascending
      predictSequence(observedStates) {
        let v = [];
        let n = observedStates.length;

        for (let t = 0; t < n; t++) {
          v[t] = {};

          for (let state of states) {
            let emission = p(observedStates[t], state);
            console.log(observedStates[t] + " | " + state, emission);
            let best = {
              prob: -1,
              path: []
            };

            if (t == 0) {
              best = {
                prob: p(state),
                path: []
              };
            } else {
              for (let prevState of states) {
                let last = v[t - 1][prevState];
                let prob = last.prob * p(state, prevState);
                console.log(last.prob + " * " + state + " | " + prevState, p(state, prevState));

                if (prob > best.prob) {
                  best = {
                    prob: prob,
                    path: last.path
                  };
                }
              }
            }

            v[t][state] = {
              prob: emission * best.prob,
              path: best.path.concat(state)
            };
          }
        }

        console.log(v);
        let best = {
          prob: -1,
          path: []
        }; // recover max path

        for (let state in v[n - 1]) {
          if (v[n - 1][state].prob > best.prob) best = v[n - 1][state];
        }

        return best.path;
      },

      recordState(observed, state, prevState) {
        model.updateProbability(); // add to universal

        model.updateProbability(state); // Q[i]

        model.updateProbability(observed, state); // O[i] and Q[i])

        if (prevState) model.updateProbability(state, prevState); // Q[i] and Q[i-1]

        states.add(state.toString());
        console.log(instances);
      },

      updateProbability(event = "U", sampleSpace) {
        event = event.toString();
        let key = sampleSpace ? event + " " + sampleSpace.toString() : event;
        instances[key] = (instances[key] ?? 0) + 1;
      }

    }; // conditional or marginal probability

    function p(event, sampleSpace) {
      if (sampleSpace) {
        let jointString = event.toString() + " " + sampleSpace.toString();

        if (instances[jointString] && instances[sampleSpace.toString()]) {
          return instances[jointString] / instances[sampleSpace.toString()];
        } else {
          // hacky way to get tiny conditional scaled by marginal
          return p(event) / instances["U"];
        }
      } else {
        return instances[event.toString()] / instances["U"];
      }
    }

    /**
     * editor.js
     * 
     * The controller for the piano-roll editor. 
     * Most actions are passed through it at some point
     */

    const {
      shape,
      intersect
    } = require('svg-intersections');

    const editor$1 = {
      get width() {
        return editor$1.widthInTime * editor$1.zoomX;
      },

      get height() {
        return editor$1.numKeys * editor$1.zoomY;
      },

      set fileName(val) {
        val = val.split(".")[0];
        view$1.changeFileName(val);
        editor$1._fileName = val;
        document.title = val;
      },

      get fileName() {
        return editor$1._fileName;
      },

      get objects() {
        return editor$1.notes.concat(editor$1.glisses).concat(editor$1.edges);
      }

    };
    let pianoRollElement = document.getElementById('piano-roll');
    editor$1.notes = [];
    editor$1.edges = [];
    editor$1.glisses = [];
    editor$1.selection = [];
    editor$1.selectionForest = [];
    editor$1.action = null;
    editor$1.timeGridSize = 1;
    editor$1.zoomX = 8;
    editor$1.zoomY = 16;
    editor$1.zoomXY = 1;
    editor$1.scrollX = 0;
    editor$1.scrollY = 0;
    editor$1.widthInTime = 1024;
    editor$1.numKeys = 128;
    editor$1.selectedObject = null;
    editor$1.mousePosn = undefined;
    editor$1._fileName = undefined;
    editor$1.canvas = SVG().addTo('#piano-roll').size(editor$1.zoomX * editor$1.widthInTime, editor$1.zoomY * editor$1.numKeys).viewbox(0, 0, editor$1.width, editor$1.height);

    editor$1.scale = function (val) {
      if (val < 0.28) return;
      let width = editor$1.zoomX * editor$1.widthInTime / val;
      let height = editor$1.zoomY * editor$1.numKeys / val;
      editor$1.canvas.viewbox(editor$1.scrollX, editor$1.scrollY, width, height);
      editor$1.zoomXY = val;
      grid.scale(val);
      ruler.scale(val);
      ruler.scroll(editor$1.scrollX * val, editor$1.scrollY * val);
      keyboard.scale(val);
      keyboard.scroll(editor$1.scrollX * val, editor$1.scrollY * val);
      playback.scale(val);
      editor$1.deltaScroll(1, 1);
    };

    editor$1.scroll = function (x, y) {
      let h = $('.right-container').height();
      let w = $('.right-container').width();
      let viewHeight = (editor$1.height - y) * editor$1.zoomXY;
      let viewWidth = (editor$1.width - x) * editor$1.zoomXY;

      if (viewHeight < h) {
        editor$1.scrollY = editor$1.height - h / editor$1.zoomXY;
      } else if (viewWidth < w) {
        editor$1.scrollX = editor$1.width - w / editor$1.zoomXY;
      } else {
        editor$1.scrollX = Math.max(0, x);
        editor$1.scrollY = Math.max(0, y);
      }

      let width = editor$1.zoomX * editor$1.widthInTime / editor$1.zoomXY;
      let height = editor$1.zoomY * editor$1.numKeys / editor$1.zoomXY;
      editor$1.canvas.viewbox(editor$1.scrollX, editor$1.scrollY, width, height);
      let scrollX = editor$1.scrollX * editor$1.zoomXY;
      let scrollY = editor$1.scrollY * editor$1.zoomXY;
      keyboard.scroll(scrollX, scrollY);
      ruler.scroll(scrollX, scrollY);
      grid.scroll(scrollX, scrollY);
    };

    editor$1.deltaScroll = function (dx, dy) {
      editor$1.scroll(editor$1.scrollX + dx, editor$1.scrollY + dy);
    };

    editor$1.drag = function (e) {
      let pt = editor$1.canvas.point(e.x, e.y);
      editor$1.deltaScroll(editor$1.clickStart.x - pt.x, editor$1.clickStart.y - pt.y);
    };

    editor$1.draw = function () {
      editor$1.canvas.mousemove(e => {
        switch (editor$1.action) {
          case editor$1.move:
            editor$1.move(e, editor$1.selection, editor$1.selectionForest);
            break;

          case editor$1.bend:
          case editor$1.glissEasing:
          case editor$1.resizeLeft:
          case editor$1.resizeRight:
            editor$1.applyToSelection(editor$1.action, e);
            break;

          case editor$1.boxSelect:
            editor$1.boxSelect(editor$1.selectBox, e);
            break;

          case editor$1.connector:
          case editor$1.glisser:
          case editor$1.measurer:
            editor$1.action(editor$1.seqConnector, e);
            break;

          case editor$1.drag:
            editor$1.drag(e);
            break;
        }

        editor$1.mousePosn = {
          x: e.x,
          y: e.y
        };
      }).mousedown(e => {
        // just in case you delete an object while its tooltip is showing
        $(".ui-tooltip").fadeOut(function () {
          this.remove();
        });
        editor$1.clickStart = editor$1.canvas.point(e.x, e.y);

        if (!editor$1.action) {
          if (e.metaKey) {
            /* Create note */
            let n = editor$1.addNote(editor$1.mousePosnToPitch(e), 64, editor$1.mousePosnToTime(e), editor$1.timeGridSize);
            editor$1.action = editor$1.resizeRight;
            editor$1.selectObject(n);
          } else if (e.shiftKey) {
            editor$1.setCursorStyle("grabbing");
            editor$1.action = editor$1.drag;
          } else {
            let poly = [[editor$1.clickStart.x, editor$1.clickStart.y], [editor$1.clickStart.x, editor$1.clickStart.y], [editor$1.clickStart.x, editor$1.clickStart.y], [editor$1.clickStart.x, editor$1.clickStart.y]];
            editor$1.selectBox.plot(poly).front().show();
            editor$1.action = editor$1.boxSelect;
          }
        }
      }).mouseup(e => {
        macroActionEnd();

        if (editor$1.action == editor$1.connector) {
          if (editor$1.seqConnector.destination) {
            editor$1.connect(editor$1.seqConnector.source, editor$1.seqConnector.destination);
          }

          editor$1.seqConnector.hide();
          editor$1.seqText.hide();
          editor$1.seqConnector.source = null;
          editor$1.seqConnector.destination = null;
        } else if (editor$1.action == editor$1.glisser) {
          if (editor$1.seqConnector.destination) {
            editor$1.gliss(editor$1.seqConnector.source, editor$1.seqConnector.destination);
          }

          editor$1.seqConnector.hide();
          editor$1.seqText.hide();
          editor$1.seqConnector.source = null;
          editor$1.seqConnector.destination = null;
        } else if (editor$1.action == editor$1.measurer) {
          if (editor$1.seqConnector.destination) {
            editor$1.measure(editor$1.seqConnector.source, editor$1.seqConnector.destination);
          }

          editor$1.seqConnector.hide();
          editor$1.seqText.hide();
          editor$1.seqConnector.source = null;
          editor$1.seqConnector.destination = null;
        } else if (editor$1.action == editor$1.boxSelect) {
          // selector box
          editor$1.selectObjectsInBox(editor$1.selectBox);
          editor$1.selectBox.size(0, 0).hide();
        }

        lastY = null;
        startStarts = undefined;
        startEnds = undefined;
        startPosns = undefined;
        editor$1.setCursorStyle("default");
        editor$1.action = undefined;
      });

      editor$1.mousePosnToTime = function (e) {
        let x = editor$1.canvas.point(e.x, 0).x;
        return Math.floor(x / editor$1.zoomX / editor$1.timeGridSize) * editor$1.timeGridSize;
      };

      editor$1.mousePosnToPitch = function (e) {
        let y = editor$1.canvas.point(0, e.y).y;
        return Math.floor(editor$1.numKeys - y / editor$1.zoomY);
      };

      editor$1.quantizeTime = function (time) {
        return Math.round(time / editor$1.timeGridSize) * editor$1.timeGridSize;
      };

      editor$1.selectBox = editor$1.canvas.polygon().fill('grey').opacity(0.2).stroke('black').hide();
      editor$1.seqConnector = editor$1.canvas.path().stroke(style.editorLine).hide().fill('none').addClass("mouse-disabled");
      editor$1.seqText = editor$1.canvas.text("").font(style.editorText).hide().addClass("mouse-disabled");
    };

    editor$1.copySelection = function () {
      let notes = editor$1.selection.filter(e => e instanceof SeqNote);
      editor$1.clipboard = editor$1.compressData(notes);
    };

    editor$1.exportMIDI = function () {
      midi.writeToFile(editor$1.notes, editor$1.fileName);
    };

    editor$1.getEditorJSON = function () {
      let compressed = editor$1.compressData(editor$1.notes);
      return { ...compressed,
        meta: {
          fileName: editor$1.fileName,
          viewbox: {
            scrollX: editor$1.scrollX,
            scrollY: editor$1.scrollY,
            scale: editor$1.zoomXY
          }
        }
      };
    };

    editor$1.saveJSONFile = function () {
      let json = editor$1.getEditorJSON();
      let jsonString = JSON.stringify(json);
      let file = new Blob([jsonString], {
        type: 'application/x-spr'
      });
      let a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = (editor$1.fileName || "untitled") + ".spr";
      a.click();
      URL.revokeObjectURL(a.href);
    };

    editor$1.openFile = function (file) {
      if (file.name.endsWith(".mid")) editor$1.openMIDIFile(file);else if (file.name.endsWith(".spr")) editor$1.openJSONFile(file);else addMessage("Filetype not recognized.", 'red');
    };

    editor$1.openMIDIFile = function (file) {
      midi.readFromFile(file).then(notes => {
        let compressed = {
          notes,
          edges: [],
          glisses: []
        };
        editor$1.clearAllData();
        editor$1.addCompressedData(compressed);
        let name = file.name.replace(/\..+$/, "");
        $('.filename').val(name);
        editor$1.fileName = name;
        addMessage(`Loaded ${file.name}.`, 'green');
      }).catch(e => {
        addMessage("Unable to parse file.", 'red');
        addMessage(e, 'red');
      });
    };

    editor$1.openJSONFile = function (file) {
      if (file) {
        view$1.showLoader(`loading ${file.name}...`, ø => {
          let reader = new FileReader();
          reader.readAsText(file);

          reader.onload = e => {
            try {
              let json = JSON.parse(reader.result);

              if (json) {
                editor$1.clearAllData();
                editor$1.addCompressedData(json);
                let name = file.name.replace(/\..+$/, "");
                $('.filename').val(name);
                editor$1.fileName = name;
                addMessage(`Loaded ${file.name}.`, 'green');
              } else throw "";
            } catch (e) {
              addMessage("Unable to parse file.", 'red');
              addMessage(e, 'red');
            }

            view$1.hideLoader();
          };
        });
      }
    };

    editor$1.copyJSONToClipboard = function () {
      let json = editor$1.getEditorJSON();
      let jsonString = JSON.stringify(json);
      navigator.clipboard.writeText(jsonString).then(ø => {
        addMessage("Copied file to clipboard.", 'green');
      });
    };

    editor$1.pasteJSONFromClipboard = mutator(function () {
      navigator.clipboard.readText().then(txt => {
        try {
          let json = JSON.parse(txt);

          if (json) {
            editor$1.clearAllData();
            editor$1.addCompressedData(json);
            addMessage("Loaded file from clipboard.", 'green');
          } else throw "";
        } catch (e) {
          addMessage("Unable to parse clipboard.", 'red');
          addMessage(e, 'red');
        }
      });
    }, "pasteJSON");
    /* Automatically stores edges between notes as well */

    editor$1.compressData = function (objs) {
      let compressed = {
        notes: [],
        edges: [],
        glisses: []
      };
      let notes = objs.filter(e => e instanceof SeqNote);
      let edges = [];
      let seen = new Set();
      let adjMat = [];
      /* Add necessary edges (edges between selected notes) */

      for (let note of notes) {
        if (!seen.has(note)) {
          for (let [neigh, edge] of note.neighbors) {
            if (seen.has(neigh)) {
              edges.push(edge);
              seen.add(neigh);
            }
          }

          seen.add(note);
        }

        adjMat.push([]);
      }

      let seenNotes = []; // returns the index of the inserted note
      // and whether or not the note was a new addition

      function addCompressedNote(note) {
        let copy = {
          pitch: note.pitch,
          velocity: note.velocity,
          start: note.start,
          duration: note.duration,
          bend: note.bend
        };
        let idx = -1;

        for (let i = 0; i < compressed.notes.length; i++) {
          if (JSON.stringify(compressed.notes[i]) == JSON.stringify(copy)) {
            idx = i;
            break;
          }
        }

        if (idx == -1) {
          idx = compressed.notes.push(copy) - 1;
          seenNotes.push(note);
        }

        return idx;
      }
      /* Add the ones that are connected */


      for (let edge of edges) {
        let id1 = addCompressedNote(edge.a);
        let id2 = addCompressedNote(edge.b);

        if (!adjMat[id1][id2]) {
          compressed.edges.push({
            id1,
            id2,
            interval: edge.interval.toString()
          });
          adjMat[id1][id2] = true;
          adjMat[id2][id1] = true;
        }
      }
      /* Add the ones that are not connected */


      notes.map(addCompressedNote); // Add necessary glisses (glisses between selected notes)

      for (let i = 0; i < seenNotes.length; i++) {
        for (let gliss of seenNotes[i].glissOutputs) {
          let j = seenNotes.indexOf(gliss.endNote);

          if (j != -1) {
            compressed.glisses.push({
              easing: gliss.easing,
              start: i,
              end: j
            });
          }
        }
      }

      return compressed;
    };

    editor$1.updateLocalStorage = function () {
      let json = editor$1.getEditorJSON();

      try {
        localStorage.setItem("editor", JSON.stringify(json));
        return true;
      } catch {
        return false;
      }
    };

    editor$1.loadEditorFromLocalStorage = mutator(function () {
      let jsonString = localStorage.getItem("editor");
      let json = JSON.parse(jsonString);

      if (json) {
        editor$1.addCompressedData(json);
      } else {
        // load demo
        let demo = {
          "notes": [{
            "pitch": 60,
            "velocity": 64,
            "start": 96,
            "duration": 16,
            "bend": -0.8212
          }, {
            "pitch": 63,
            "velocity": 64,
            "start": 96,
            "duration": 16,
            "bend": -0.6648000000000001
          }, {
            "pitch": 68,
            "velocity": 64,
            "start": 80,
            "duration": 32,
            "bend": -0.6844
          }, {
            "pitch": 68,
            "velocity": 64,
            "start": 32,
            "duration": 32,
            "bend": -0.2738
          }, {
            "pitch": 63,
            "velocity": 64,
            "start": 48,
            "duration": 16,
            "bend": -0.2542
          }, {
            "pitch": 60,
            "velocity": 64,
            "start": 16,
            "duration": 16,
            "bend": 0
          }, {
            "pitch": 64,
            "velocity": 64,
            "start": 16,
            "duration": 32,
            "bend": -0.1369
          }, {
            "pitch": 67,
            "velocity": 64,
            "start": 16,
            "duration": 16,
            "bend": 0.019500000000000017
          }, {
            "pitch": 59,
            "velocity": 64,
            "start": 32,
            "duration": 16,
            "bend": -0.11729999999999999
          }, {
            "pitch": 60,
            "velocity": 64,
            "start": 48,
            "duration": 32,
            "bend": -0.41059999999999997
          }, {
            "pitch": 64,
            "velocity": 64,
            "start": 64,
            "duration": 32,
            "bend": -0.5475
          }, {
            "pitch": 67,
            "velocity": 64,
            "start": 64,
            "duration": 16,
            "bend": -0.3911
          }, {
            "pitch": 59,
            "velocity": 64,
            "start": 80,
            "duration": 16,
            "bend": -0.5279
          }],
          "edges": [{
            "id1": 0,
            "id2": 1,
            "interval": "6:5"
          }, {
            "id1": 1,
            "id2": 2,
            "interval": "4:3"
          }, {
            "id1": 3,
            "id2": 4,
            "interval": "4:3"
          }, {
            "id1": 5,
            "id2": 6,
            "interval": "5:4"
          }, {
            "id1": 6,
            "id2": 7,
            "interval": "6:5"
          }, {
            "id1": 8,
            "id2": 6,
            "interval": "4:3"
          }, {
            "id1": 4,
            "id2": 9,
            "interval": "6:5"
          }, {
            "id1": 10,
            "id2": 2,
            "interval": "5:4"
          }, {
            "id1": 10,
            "id2": 11,
            "interval": "6:5"
          }, {
            "id1": 10,
            "id2": 12,
            "interval": "4:3"
          }],
          "glisses": [],
          meta: {
            "viewbox": {
              "scrollX": 79,
              "scrollY": 709,
              "scale": 0.9
            }
          },
          "fileName": "springs-demo"
        };
        console.log("loaded demo data:", demo);
        editor$1.addCompressedData(demo);
        editor$1.deselectAllObjects();
        editor$1.scroll(70, 700);
        editor$1.scale(0.9);
      }
    }, "load");
    editor$1.clearAllData = mutator(function () {
      editor$1.delete(null, ...editor$1.objects);
    }, "clearAllData");
    editor$1.addCompressedData = mutator(function (compressed, atTime = 0, atPitch = 0) {
      let notes = [];
      let edges = [];
      let glisses = [];
      /* Add notes from compressed version */

      for (let noteObj of compressed.notes) {
        let note = editor$1.addNote(noteObj.pitch + atPitch, noteObj.velocity, noteObj.start + atTime, noteObj.duration);
        note.bend = noteObj.bend;
        notes.push(note);
      }
      /* 
          Create edges, accessing the indices of the
          note array.
      */


      for (let edgeObj of compressed.edges) {
        let interval = parseIntervalText(edgeObj.interval);
        let edge = editor$1.connect(notes[edgeObj.id1], notes[edgeObj.id2], interval);
        edges.push(edge);
      }
      /* 
          Create glisses, accessing the indices of the
          note array.
      */


      for (let glissObj of compressed.glisses) {
        let gliss = editor$1.gliss(notes[glissObj.start], notes[glissObj.end]);
        gliss.easing = glissObj.easing || gliss.easing;
        gliss.updateGraphics(0);
        glisses.push(gliss);
      }
      /* Navigate to saved view */


      let meta = compressed.meta;

      if (meta?.viewbox) {
        editor$1.scroll(meta.viewbox.scrollX, meta.viewbox.scrollY);
        editor$1.scale(meta.viewbox.scale);
      }

      if (meta?.fileName) {
        editor$1.fileName = meta.fileName;
      }

      editor$1.deselectAllObjects();
      return {
        notes,
        edges,
        glisses
      };
    }, "addCompressedData");
    editor$1.transposeByOctaves = mutator(function (n, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);

      for (let note of notes) note.transposeByOctaves(n);
    }, "transpose");
    editor$1.paste = mutator(function () {
      if (!editor$1.clipboard?.notes?.length) return;
      let p = editor$1.mousePosn;
      let time = editor$1.mousePosnToTime(p);
      let pitch = editor$1.mousePosnToPitch(p); // Mouseposn => start of leftmost note, pitch of heighest note

      let minStart = Infinity;
      let maxPitch = 0;

      for (let note of editor$1.clipboard.notes) {
        minStart = Math.min(minStart, note.start);
        maxPitch = Math.max(maxPitch, note.pitch);
      }

      let {
        notes,
        edges
      } = editor$1.addCompressedData(editor$1.clipboard, time - minStart, pitch - maxPitch);

      for (let note of notes) editor$1.toggleObjectInSelection(note);

      for (let edge of edges) editor$1.toggleObjectInSelection(edge);
    }, "paste");

    editor$1.togglePlaybackSelection = function () {
      if (playback.playing) {
        audio.pause();
        playback.pause();
      } else {
        let notes = editor$1.selection.filter(e => e instanceof SeqNote);
        if (!notes.length) return;
        let minX = Infinity;

        for (let note of notes) minX = Math.min(minX, note.x);

        playback.play(minX);
        audio.playNotes(notes);
      }
    };

    editor$1.togglePlayback = function () {
      if (playback.playing) {
        audio.pause();
        playback.pause();
      } else {
        if (editor$1.selection.length) {
          let minX = Infinity;

          for (let obj of editor$1.selection) {
            if (obj instanceof SeqNote) {
              minX = Math.min(minX, obj.x);
            }
          }

          playback.play(minX);
        } else {
          playback.play();
        }

        audio.playNotes(editor$1.notes);
      }
    };

    editor$1.glisser = function (seqConnector, e) {
      let start = {
        x: seqConnector.source.xEnd,
        y: seqConnector.source.y + editor$1.zoomY / 2
      };
      let end = editor$1.canvas.point(e.x, e.y);
      let path = simpleBezierPath(start, end, 'horizontal');
      seqConnector.plot(path).show();
    };

    editor$1.measurer = function (seqConnector, e) {
      let start = {
        x: editor$1.clickStart.x,
        y: seqConnector.source.y + seqConnector.source.height / 2
      };
      let end = editor$1.canvas.point(e.x, e.y);
      let path = rulerPath(start, end);
      seqConnector.plot(path).show();

      if (!seqConnector.destination) {
        editor$1.seqText.hide();
      }

      editor$1.setCursorStyle("context-menu");
    };

    editor$1.boxSelect = function (box, e) {
      let end = editor$1.canvas.point(e.x, e.y);
      let start = editor$1.clickStart;
      let poly = [[start.x, end.y], [end.x, end.y], [end.x, start.y], [start.x, start.y]];
      box.plot(poly);
    };

    editor$1.toggleObjectInSelection = function (obj) {
      if (editor$1.selection.includes(obj)) {
        /* Deselect already selected object */
        editor$1.selection = editor$1.selection.filter(n => n != obj);
        obj.selected = false;
      } else {
        /* Select unselected object */
        editor$1.selection.push(obj);
        obj.selected = true;
      }
    };

    editor$1.selectObjectsInBox = function (selectBox) {
      editor$1.deselectAllObjects();
      let svgElem = $('svg').get(0);
      let rect = selectBox.node.getBBox();
      let rectShape = shape("rect", rect); // change to non-transformed viewbox temporarily
      // a little hacky, but it works

      let vb = editor$1.canvas.viewbox();
      editor$1.canvas.viewbox(0, 0, editor$1.width, editor$1.height);
      let selectedNotes = editor$1.notes.filter(note => {
        return svgElem.checkIntersection(note.rect.node, rect);
      });
      let selectedEdges = editor$1.edges.filter(edge => {
        let pathArr = edge.line.array();
        let paths = pathArr.map(e => e.join(" "));
        let d = paths.join(" ");
        let intersections = intersect(rectShape, shape("path", {
          d
        }));
        return !!intersections.points.length || isInside(rect, edge.line.node.getBBox());
      });
      let selectedGlisses = editor$1.glisses.filter(gliss => {
        let pathArr = gliss.line.array();
        let paths = pathArr.map(e => e.join(" "));
        let d = paths.join(" ");
        let intersections = intersect(rectShape, shape("path", {
          d
        }));
        return !!intersections.points.length || isInside(rect, gliss.line.node.getBBox());
      });

      function isInside(a, b) {
        return !(b.x < a.x || b.y < a.y || b.x + b.width > a.x + a.width || b.y + b.height > a.y + a.height);
      }

      editor$1.canvas.viewbox(vb);
      editor$1.selection = selectedNotes.concat(selectedEdges).concat(selectedGlisses);

      for (let obj of editor$1.selection) obj.selected = true;
    };

    editor$1.deselectAllObjects = function () {
      for (let obj of editor$1.selection) obj.selected = false;

      editor$1.selection = [];
    };

    editor$1.selectAll = function () {
      editor$1.selection = editor$1.objects;

      for (let x of editor$1.selection) x.selected = true;
    };

    editor$1.selectObject = function (obj) {
      if (obj && !editor$1.selection.includes(obj)) {
        editor$1.deselectAllObjects();
        obj.selected = true;
        editor$1.selection = [obj];
      }
    };

    editor$1.play = function (_, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);

      for (let note of notes) audio.playNote(note);
    };

    editor$1.resetBend = mutator(function (_, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);
      /* Find minimum note of each tree in the forest */

      let minimums = new Set(notes);

      for (let note of notes) {
        for (let neighbor of note.getAllConnected()) {
          if (neighbor != note && minimums.has(neighbor)) {
            if (note.soundingPitch < neighbor.soundingPitch) {
              minimums.delete(neighbor);
            } else {
              minimums.delete(note);
            }
          }
        }
      }

      for (let m of minimums) m.propagateBend(0);
    }, "resetBend");
    editor$1.addNote = mutator(function (pitch, velocity, start, duration) {
      let note = new SeqNote(pitch, velocity, start, duration);
      editor$1.notes.push(note);
      note.seq = editor$1;
      note.draw(editor$1.canvas);
      return note;
    }, "addNote");
    editor$1.disconnect = mutator(function (note1, note2) {
      let removedEdge = note1.disconnectFrom(note2);
      if (removedEdge) editor$1.delete(null, removedEdge);
    }, "disconnect");

    editor$1.setCursorStyle = function (val) {
      pianoRollElement.style.cursor = val;
    };

    editor$1.connect = mutator(function (note1, note2, by) {
      let edge = note1.connectTo(note2, by, 0);

      if (edge) {
        editor$1.edges.push(edge);
        edge.draw(editor$1.canvas);
        editor$1.toggleObjectInSelection(edge); // update HMM

        let pitchClass = Math.round(edge.maxNote.soundingPitch - edge.minNote.soundingPitch);
        model.recordState(pitchClass, edge.interval);
      } else {
        addMessage('Cannot connect notes that are already connected.', 'orange');
      }

      return edge;
    }, "connect");
    editor$1.gliss = mutator(function (start, end) {
      let gliss;
      /* Stop from extending to a note before the start point */

      for (let {
        endNote
      } of start.glissOutputs) if (endNote == end) return end;

      if (start.xEnd < end.x) {
        gliss = new SeqGliss(start, end);
        start.glissOutputs.push(gliss);
        end.glissInputs.push(gliss);
        gliss.draw(editor$1.canvas);
        editor$1.glisses.push(gliss);
      }

      return gliss;
    }, "addGliss");

    editor$1.measure = function (start, end) {
      let interval = start.getIntervalTo(end);
      return interval;
    };

    editor$1.getAllConnected = function (notes) {
      return editor$1.getComponents(notes).flat();
    };

    editor$1.getComponents = function (notes) {
      let seen = new Set();
      let forest = [];

      for (let note of notes) {
        if (!seen.has(note)) {
          let tree = note.getAllConnected();

          for (let e of tree) seen.add(e);

          forest.push(tree);
        }
      }

      return forest;
    };

    editor$1.applyToSelection = function (fn, param) {
      fn(param, ...editor$1.selection);
    };
    /* The following functions are meant to be used with applyToSelection() */


    let startPosns;
    let lastDeltas;

    editor$1.move = function (e, objs, forest) {
      if (!forest.length) forest = objs;
      let notes = objs.filter(e => e instanceof SeqNote);
      forest = forest.filter(e => e instanceof SeqNote);
      let posn = editor$1.canvas.point(e.x, e.y);

      if (!startPosns) {
        startPosns = new Map();
        lastDeltas = {
          x: 0,
          y: 0
        };

        for (let note of forest) startPosns.set(note, {
          start: note.start,
          pitch: note.pitch
        });
      }

      let deltaX = (posn.x - editor$1.clickStart.x) / editor$1.zoomX;
      let deltaY = (posn.y - editor$1.clickStart.y) / editor$1.zoomY;

      if (lastDeltas.x != deltaX) {
        for (let note of notes) {
          let n = startPosns.get(note);
          let anustart = Math.max(n.start + deltaX, 0);
          note.startMove = editor$1.quantizeTime(anustart);
        }
      }

      if (lastDeltas.y != deltaY) {
        for (let note of forest) {
          let n = startPosns.get(note);
          let pitch = (n.pitch - deltaY).clamp(0, editor$1.numKeys);
          note.pitch = Math.round(pitch);
        }
      }

      lastDeltas = {
        x: deltaX,
        y: deltaY
      };
    }; // divide moving from note1 to note2


    editor$1.equallyDivide = mutator(function (n, ...objs) {
      if (n < 1) return;
      /* Equally divide every ascending pair (?) */

      let pairs = new Map();
      let notes = objs.filter(e => e instanceof SeqNote);
      let edges = objs.filter(e => e instanceof SeqEdge);

      let notesAscending = (a, b) => a.pitch - b.pitch;

      notes.sort(notesAscending);

      for (let i = 1; i < notes.length; i++) pairs.set(notes[i - 1], notes[i]);

      for (let e of edges) {
        let pair = [e.a, e.b].sort(notesAscending);
        pairs.set(pair[0], pair[1]);
      }

      for (let [a, b] of pairs.entries()) equallyDividePair(a, b);

      function equallyDividePair(note1, note2) {
        if (note1.soundingPitch == note2.soundingPitch) return;
        let interval = note1.getIntervalTo(note2).divide(n);
        if (interval instanceof tune.FreqRatio) interval = interval.asET();

        const incStep = (a, b, steps) => (b - a) / steps;

        let velocityStep = incStep(note1.velocity, note2.velocity, n);
        let startStep = incStep(note1.start, note2.start, n);
        let durationStep = incStep(note1.duration, note2.duration, n);
        editor$1.disconnect(note1, note2);
        let prev = note1;

        for (let i = 1; i < n; i++) {
          let pitch = Math.round(prev.asNote.noteAbove(interval).asET().pitch);
          let curr = editor$1.addNote(pitch, note1.velocity + velocityStep * i, note1.start + startStep * i, note1.duration + durationStep * i);
          editor$1.connect(prev, curr, interval);
          prev = curr;
        }

        editor$1.connect(prev, note2, interval);
      }
    }, "divide");
    editor$1.tuneAsPartials = mutator(function (_, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);

      if (notes.length > 1) {
        notes.sort((a, b) => a.pitch - b.pitch); //// Only for HMM demo:

        let intervalClasses = Array(notes.length - 1);

        for (let i = 0; i < notes.length - 1; i++) {
          intervalClasses[i] = Math.round(notes[i + 1].soundingPitch - notes[i].soundingPitch);
        }

        console.log(intervalClasses);
        console.log(model.predictSequence(intervalClasses)); //// end

        let freqs = notes.map(a => a.asNote.asFrequency());
        let {
          partials,
          fundamental
        } = tune.AdaptiveTuning.bestFitPartials(freqs);

        for (let i = 0; i < partials.length - 1; i++) {
          let a = notes[i];
          let b = notes[i + 1];
          editor$1.connect(a, b, tune.FreqRatio(partials[i + 1], partials[i]));
        }

        let midiF0 = tune.Util.freqToET(fundamental);
        let msg = `Calculated fundamental: ${fundamental.toFixed(2)} Hz (${pitchName(midiF0, true)})`;
        addMessage(msg, 'green');
      }
    }, "tuneAsPartials");
    let startStarts;

    editor$1.resizeLeft = function (e, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);
      e = editor$1.canvas.point(e.x, e.y);

      if (!startStarts) {
        startStarts = new Map();

        for (let note of notes) startStarts.set(note, note.start);
      }

      let deltaX = (e.x - editor$1.clickStart.x) / editor$1.zoomX;

      for (let note of notes) {
        let anustart = (startStarts.get(note) + deltaX).clamp(0, note.end - editor$1.timeGridSize);
        note.start = editor$1.quantizeTime(anustart);
      }
    };

    let startEnds;

    editor$1.resizeRight = function (e, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);
      e = editor$1.canvas.point(e.x, e.y);

      if (!startEnds) {
        startEnds = new Map();

        for (let note of notes) startEnds.set(note, note.end);
      }

      let deltaX = (e.x - editor$1.clickStart.x) / editor$1.zoomX;

      for (let note of notes) {
        let anuend = (startEnds.get(note) + deltaX).clamp(note.start + editor$1.timeGridSize, editor$1.widthInTime);
        note.end = editor$1.quantizeTime(anuend);
      }
    };

    editor$1.delete = mutator(function (e, ...objs) {
      for (let obj of objs) obj.delete();

      editor$1.removeReferences(objs);
    }, "delete");

    editor$1.removeReferences = function (objs) {
      let removed = new Set(objs);

      let notRemoved = e => !removed.has(e);

      editor$1.edges = editor$1.edges.filter(notRemoved);
      editor$1.notes = editor$1.notes.filter(notRemoved);
      editor$1.glisses = editor$1.glisses.filter(notRemoved);
      editor$1.deselectAllObjects();
    };

    let lastBend = {};
    let lastY;
    editor$1.bend = mutator(function (e, ...objs) {
      let notes = objs.filter(e => e instanceof SeqNote);
      notes = editor$1.getComponents(notes).map(a => a[0]);
      lastY = lastY || e.y;
      let deltaY = e.y - lastY;

      for (let note of notes) {
        let newBend = Math.round(note.bend * 100 - deltaY) / 100;
        if (newBend != lastBend[note]) note.propagateBend(newBend, 0);
        lastBend[note] = newBend;
      }

      lastY = e.y;
    }, "bend");
    editor$1.glissEasing = mutator(function (e, ...objs) {
      let glisses = objs.filter(e => e instanceof SeqGliss);
      lastY = lastY || e.y;
      let deltaY = e.y - lastY;

      for (let gliss of glisses) {
        let newBend = Math.round(gliss.easing * 100 - deltaY) / 100;
        newBend = newBend.clamp(0.01, 1);

        if (newBend != lastBend[gliss]) {
          gliss.easing = newBend;
          gliss.updateGraphics(0);
        }

        lastBend[gliss] = newBend;
      }

      lastY = e.y;
    }, "glissEasing");

    editor$1.typeEdit = function (_, ...objs) {
      if (!objs.length) return;
      let edges = objs.filter(e => e instanceof SeqEdge);
      let notes = objs.filter(e => e instanceof SeqNote);
      /* Create an input box for the new interval */

      let foreign = editor$1.canvas.foreignObject(editor$1.width, editor$1.height).css('overflow', 'visible').front();
      let fadeDur = 500;
      let noteBoxes = [];
      let edgeBoxes = [];
      /* Create transparent background */

      let background = $(document.createElement('div')).css({
        position: 'relative',
        width: "100%",
        height: "100%",
        padding: 0,
        margin: 0,
        backgroundColor: 'rgba(255,255,255,0.6)'
      }).on('mousedown', ø => {
        background.fadeOut(fadeDur, ø => {
          foreign.remove();
          instructions.remove();
        });

        for (let note of noteBoxes) note.fadeOut(fadeDur);

        for (let edge of edgeBoxes) edge.fadeOut(fadeDur);

        instructions.fadeOut(fadeDur);
        $('input').fadeIn(500);
      }).on('keydown', e => {
        if (e.key == 'Enter') {
          for (let note of noteBoxes) note.trigger('submit');

          for (let edge of edgeBoxes) edge.trigger('submit');

          background.trigger('mousedown');
        } else if (e.key == 'Tab') {
          for (let note of noteBoxes) {
            if (note.is(":hidden") || !edges.length) {
              note.show().trigger('focus');
            } else note.hide();
          }

          for (let edge of edgeBoxes) {
            if (edge.is(":hidden") || !notes.length) {
              edge.show().trigger('focus');
            } else edge.hide();
          }

          e.preventDefault();
        } else if (e.key == 'Escape') {
          background.trigger('mousedown');
        }

        e.stopPropagation();
      }).hide().fadeIn(fadeDur).appendTo(foreign.node);
      const intervalText = 'Enter the new interval as a frequency ratio or equal-tempered value, e.g. "5:4" or "3.86#12" (3.86 steps in 12TET).';
      const velocityText = 'Enter the new velocity as an integer from 0-127.';
      let instructions = $(document.createElement('p')).text(intervalText).css({
        position: 'absolute',
        textAlign: 'center',
        width: "80%",
        top: 20,
        fontFamily: 'Arial',
        fontSize: 12,
        letterSpacing: 1,
        color: "green",
        left: "10%"
      }).hide().fadeIn(fadeDur).appendTo($('.seq'));

      for (let edge of edges) {
        let box = createEdgeInputBox(edge);
        background.append(box);
        box.on('input', ø => {
          let interval = parseIntervalText(box.val());
          let color = interval ? 'green' : 'red';

          for (let ed of edgeBoxes) {
            ed.css('border-color', color);
            ed.val(box.val());
            ed.attr('size', Math.max(box.val().length, 5));
          }
        }).hide().on('focus', () => instructions.text(intervalText));
        if (!notes.length) box.fadeIn(fadeDur).trigger('focus');
        edgeBoxes.push(box);
      }

      for (let note of notes) {
        let box = createNoteInputBox(note);
        background.append(box);
        box.on('input', ø => {
          let v = parseInt(box.val());
          let color = v < 128 ? 'green' : 'red';

          for (let n of noteBoxes) {
            n.css('border-color', color);
            n.val(box.val());
          }
        }).hide().on('focus', () => instructions.text(velocityText)).fadeIn(fadeDur).trigger('focus');
        box.show();
        noteBoxes.push(box);
      }

      $('input[type=range]').fadeOut(fadeDur);
    };

    function createEdgeInputBox(edge) {
      let oldText = edge.text.text();
      let input = $(document.createElement('input')).attr({
        type: 'text',
        size: oldText.length,
        placeholder: oldText
      }).css({
        left: edge.midX - 10,
        top: edge.midY - 10
      }).on('mousedown', e => {
        e.stopPropagation();
      }).on('submit', ø => {
        let interval = parseIntervalText(input.val());

        if (interval) {
          edge.interval = interval;
          edge.minNote.propagateBend(0); // update HMM

          let pitchClass = Math.round(edge.maxNote.soundingPitch - edge.minNote.soundingPitch);
          model.recordState(pitchClass, interval);
        }
      }).addClass("text-input");
      return input;
    }

    function createNoteInputBox(note) {
      let velocityInput = $(document.createElement('input')).attr({
        type: 'text',
        size: 3,
        maxlength: 3,
        placeholder: note.velocity
      }).on('mousedown', e => {
        e.stopPropagation();
      }).on('submit', ø => {
        note.velocity = parseInt(velocityInput.val()) || note.velocity;
      }).on('keypress', e => {
        if (isNaN(parseInt(e.key))) e.preventDefault();
        e.stopPropagation();
      }).addClass("text-input");
      velocityInput.css({
        left: (note.xEnd + note.x) / 2 - 15,
        top: note.y - 5
      });
      return velocityInput;
    }

    editor$1.connector = function (seqConnector, e) {
      let oldPt = editor$1.clickStart;
      let newPt = editor$1.canvas.point(e.x, e.y);
      seqConnector.plot(simpleBezierPath(oldPt, newPt, 'vertical')).front().show();

      if (!seqConnector.destination) {
        editor$1.seqText.hide();
        editor$1.setCursorStyle("crosshair");
      }
    };

    editor$1.zoom = function (xZoom, yZoom) {
      editor$1.zoomX = xZoom;
      editor$1.zoomY = yZoom;

      for (let obj of editor$1.objects) obj.updateGraphics(0);

      editor$1.canvas.size(editor$1.zoomX * editor$1.widthInTime, editor$1.zoomY * editor$1.numKeys);
      /* right now these rely on editor.zoomX/Y which is problematic--they have to go here */

      grid.zoom(xZoom, yZoom);
      ruler.zoom(xZoom, yZoom);
      keyboard.zoom(xZoom, yZoom);
      editor$1.scale(editor$1.zoomXY);
    };
    /**
     * Assign handler `type` to mouse events caught by `svgNode`.
     * `parent` is passed to the handlers to be modified by
     * the mouse event.
     * 
     * @param { SeqNote | SeqEdge | SeqGliss } parent The object to modify
     * @param { SVG.Element } svgNode 
     * @param { string } type   One of the types in handlers.js
     */


    editor$1.assignMouseHandler = function (parent, svgNode, type) {
      let handler = handlers[type];
      if (handler.entered) svgNode.mouseover(e => handler.entered(e, parent));
      if (handler.exited) svgNode.mouseout(e => handler.exited(e, parent));
      if (handler.clicked) svgNode.mousedown(e => handler.clicked(e, parent));
      if (handler.hovered) svgNode.mousemove(e => handler.hovered(e, parent));
      if (handler.doubleClicked) $(svgNode.node).on('dblclick', e => handler.doubleClicked(e, parent));
    };

    editor$1.show = function (show) {
      if (show) {
        for (let obj of editor$1.objects) obj.show();
      } else {
        for (let obj of editor$1.objects) obj.hide();
      }
    };

    $(ø => {
      try {
        init();
      } catch (e) {
        view$1.hideLoader(() => {
          addMessage("An error occured when loading. Some features may not work correctly.", "red");
          addMessage(e, "red");
          addMessage("For a copy of this error, open your browser console.", "red");
          console.error(e);
        });
      }
    });

    function init() {
      view$1.init();
      editor$1.draw();
      ruler.draw();
      grid.draw();
      keyboard.draw();
      playback.draw();
      editor$1.loadEditorFromLocalStorage();
      let octaveTransposition = 60;
      /**
       * handle computer keyboard input
       * have to use keydown instead of keypress
       * to catch cmd+number before the browser default
      */

      $(document).on("keydown", function (e) {
        if (e.metaKey) {
          /* Cmd + ... shortcuts */
          switch (e.key) {
            case 'a':
              /* Select all */
              e.preventDefault();
              editor$1.selectAll();
              break;

            case 'c':
              /* Copy */
              e.preventDefault();
              editor$1.copySelection();
              break;

            case 'v':
              /* Paste */
              e.preventDefault();
              editor$1.paste();
              break;

            case 'z':
              /* Undo/Redo */
              if (e.shiftKey) redo();else undo();
              e.preventDefault();
              break;

            case 'y':
              /* Redo */
              redo();
              e.preventDefault();
              break;

            case 'r':
              /* Reset Bend */
              e.preventDefault();
              editor$1.applyToSelection(editor$1.resetBend);
              break;

            case 's':
              /* Save to browser storage */
              e.preventDefault();
              if (editor$1.updateLocalStorage()) view$1.showSaveMessage();else addMessage('Unable to save to browser storage', 'red');
              break;

            case 'o':
              /* Open file from computer */
              $filePick.trigger('click');
              e.preventDefault();
              break;

            case 'ArrowDown':
              /* Transpose note down */
              editor$1.applyToSelection(editor$1.transposeByOctaves, -1);
              e.preventDefault();
              break;

            case 'ArrowUp':
              /* Transpose note up */
              editor$1.applyToSelection(editor$1.transposeByOctaves, 1);
              e.preventDefault();
              break;
          }

          if (+e.key) {
            /* Equally divide intervals */
            e.preventDefault();
            let n = +e.key; // check for digits

            if (n > 1) editor$1.applyToSelection(editor$1.equallyDivide, n);
          }
        } else if (e.shiftKey) {
          /* Shift + ... commands */
          if (e.key == " ") {
            /* Playback only selection */
            e.preventDefault();
            editor$1.togglePlaybackSelection();
          }
        } else if (e.key == 'Shift') {
          /* Navigate around editor */
          editor$1.setCursorStyle("grab");
        } else if (e.key == " ") {
          /* Playback from current position */
          e.preventDefault();
          editor$1.togglePlayback();
        } else if (e.key == 'Backspace') {
          /* Delete */
          editor$1.applyToSelection(editor$1.delete, e);
        } else if (e.key == 'Enter') {
          /* Edit intervals/velocities */
          editor$1.applyToSelection(editor$1.typeEdit);
        }
      }).on("keyup", e => {
        if ("awsedftgyhujkolp;".includes(e.key)) {
          /* End playback of note */
          let pitch = "awsedftgyhujkolp;".indexOf(e.key);
          keyboard.noteOff(pitch + octaveTransposition);
        } else if (e.key == 'Shift') {
          editor$1.setCursorStyle("default");
        }
      }).on("keypress", e => {
        if ("awsedftgyhujkolp;".includes(e.key)) {
          /* Playback note from computer keyboard */
          let pitch = "awsedftgyhujkolp;".indexOf(e.key);
          keyboard.noteOn(pitch + octaveTransposition);
        } else if (e.key == 'z') {
          /* Transpose computer keyboard down */
          octaveTransposition = (octaveTransposition - 12).clamp(0, 108);
        } else if (e.key == 'x') {
          /* Transpose computer keyboard up */
          octaveTransposition = (octaveTransposition + 12).clamp(0, 108);
        }
      });
      document.addEventListener('wheel', e => {
        // `wheel` event catches multi-touch on laptops too
        if (e.ctrlKey) {
          /* Zoom in and out of the editor, fixed aspect ratio */
          let dy = e.deltaY;
          editor$1.scale(editor$1.zoomXY * (1 - dy * 0.01));
          e.preventDefault();
        } else {
          /* Navigate around the editor */
          e.preventDefault();
          editor$1.deltaScroll(e.deltaX, e.deltaY);
        }
      }, {
        passive: false
      });

      window.onbeforeunload = e => {
        /* Autosave to local storage when the user closes/refreshes the page */
        editor$1.updateLocalStorage();
        e.preventDefault();
      }; // show controls for new users


      if (!localStorage.getItem("editor")) {
        $('.control-screen').delay(500).fadeIn(500);
      }
      /* Define jQueryUI tooltip (uses title attr) */


      $(document).tooltip({
        items: ".has-tooltip",
        show: {
          delay: 1000,
          effect: "fadeIn",
          duration: 300
        },

        /* Remove jQueryUI tooltip memory leak from invisible divs */
        close: function () {
          $(".ui-helper-hidden-accessible > *:not(:last)").remove();
        }
      });
      $.contextMenu({
        selector: ".has-contextmenu, .has-tooltip",
        items: {
          copy: {
            name: "Copy (Ctrl+C)",
            callback: () => editor$1.copySelection()
          },
          paste: {
            name: "Paste (Ctrl+V)",
            callback: () => editor$1.paste()
          },
          sep1: "---------",
          createNote: {
            name: "Create note here (Ctrl+Drag)",
            callback: () => {
              /* Create note */
              let e = editor$1.mousePosn;
              let n = editor$1.addNote(editor$1.mousePosnToPitch(e), 64, editor$1.mousePosnToTime(e), 4 * editor$1.timeGridSize);
              editor$1.selectObject(n);
            }
          },
          resetBend: {
            name: "Reset Bend (Ctrl+R)",
            callback: () => editor$1.applyToSelection(editor$1.resetBend)
          },
          tuneAsPartials: {
            name: "Fit to harmonic series",
            callback: () => editor$1.applyToSelection(editor$1.tuneAsPartials)
          },
          sep2: "---------",
          edit: {
            name: "Edit... (Enter)",
            callback: () => editor$1.applyToSelection(editor$1.typeEdit)
          }
        }
      });
      /* Prevent editor form interpreting context menu action as a drag */

      $(document).on("contextmenu:hide", () => editor$1.canvas.fire("mouseup"));
      view$1.hideLoader();
      /* Connect to MIDI keyboard */

      midi.getInputDevices().then(inputs => {
        midi.setInputDevice(inputs[0]);
        console.log(inputs);
      });
    }

    window.prefs = userPreferences;
    window.view = view$1;
    window.editor = editor$1;

}());

},{"bezier-easing":2,"svg-intersections":10}],2:[function(require,module,exports){
/**
 * https://github.com/gre/bezier-easing
 * BezierEasing - use bezier curve for transition easing function
 * by Gaëtan Renaudeau 2014 - 2015 – MIT License
 */

// These values are established by empiricism with tests (tradeoff: performance VS precision)
var NEWTON_ITERATIONS = 4;
var NEWTON_MIN_SLOPE = 0.001;
var SUBDIVISION_PRECISION = 0.0000001;
var SUBDIVISION_MAX_ITERATIONS = 10;

var kSplineTableSize = 11;
var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

var float32ArraySupported = typeof Float32Array === 'function';

function A (aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
function B (aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
function C (aA1)      { return 3.0 * aA1; }

// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
function calcBezier (aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT; }

// Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
function getSlope (aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1); }

function binarySubdivide (aX, aA, aB, mX1, mX2) {
  var currentX, currentT, i = 0;
  do {
    currentT = aA + (aB - aA) / 2.0;
    currentX = calcBezier(currentT, mX1, mX2) - aX;
    if (currentX > 0.0) {
      aB = currentT;
    } else {
      aA = currentT;
    }
  } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
  return currentT;
}

function newtonRaphsonIterate (aX, aGuessT, mX1, mX2) {
 for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
   var currentSlope = getSlope(aGuessT, mX1, mX2);
   if (currentSlope === 0.0) {
     return aGuessT;
   }
   var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
   aGuessT -= currentX / currentSlope;
 }
 return aGuessT;
}

function LinearEasing (x) {
  return x;
}

module.exports = function bezier (mX1, mY1, mX2, mY2) {
  if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
    throw new Error('bezier x values must be in [0, 1] range');
  }

  if (mX1 === mY1 && mX2 === mY2) {
    return LinearEasing;
  }

  // Precompute samples table
  var sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
  for (var i = 0; i < kSplineTableSize; ++i) {
    sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
  }

  function getTForX (aX) {
    var intervalStart = 0.0;
    var currentSample = 1;
    var lastSample = kSplineTableSize - 1;

    for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
      intervalStart += kSampleStepSize;
    }
    --currentSample;

    // Interpolate to provide an initial guess for t
    var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    var guessForT = intervalStart + dist * kSampleStepSize;

    var initialSlope = getSlope(guessForT, mX1, mX2);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
      return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
    } else if (initialSlope === 0.0) {
      return guessForT;
    } else {
      return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
    }
  }

  return function BezierEasing (x) {
    // Because JavaScript number are imprecise, we should guarantee the extremes are right.
    if (x === 0) {
      return 0;
    }
    if (x === 1) {
      return 1;
    }
    return calcBezier(getTForX(x), mY1, mY2);
  };
};

},{}],3:[function(require,module,exports){
// expose classes

exports.Point2D = require('./lib/Point2D');
exports.Vector2D = require('./lib/Vector2D');
exports.Matrix2D = require('./lib/Matrix2D');

},{"./lib/Matrix2D":4,"./lib/Point2D":5,"./lib/Vector2D":6}],4:[function(require,module,exports){
/**
 *   Matrix2D.js
 *
 *   copyright 2001-2002, 2013 Kevin Lindsey
 */

/**
 *  Matrix2D
 *
 *  [a c e]
 *  [b d f]
 *  [0 0 1]
 *
 *  @param {Number} a
 *  @param {Number} b
 *  @param {Number} c
 *  @param {Number} d
 *  @param {Number} e
 *  @param {Number} f
 *  @returns {Matrix2D}
 */
function Matrix2D(a, b, c, d, e, f) {
    Object.defineProperties(this, {
        "a": {
            value: (a !== undefined) ? a : 1,
            writable: false,
            enumerable: true,
            configurable: false
        },
        "b": {
            value: (b !== undefined) ? b : 0,
            writable: false,
            enumerable: true,
            configurable: false
        },
        "c": {
            value: (c !== undefined) ? c : 0,
            writable: false,
            enumerable: true,
            configurable: false
        },
        "d": {
            value: (d !== undefined) ? d : 1,
            writable: false,
            enumerable: true,
            configurable: false
        },
        "e": {
            value: (e !== undefined) ? e : 0,
            writable: false,
            enumerable: true,
            configurable: false
        },
        "f": {
            value: (f !== undefined) ? f : 0,
            writable: false,
            enumerable: true,
            configurable: false
        }
    });
}

/**
 *  Identity matrix
 *
 *  @returns {Matrix2D}
 */
// TODO: consider using Object#defineProperty to make this read-only
Matrix2D.IDENTITY = new Matrix2D(1, 0, 0, 1, 0, 0);
Matrix2D.IDENTITY.isIdentity = function () { return true; };

/**
 *  multiply
 *
 *  @pararm {Matrix2D} that
 *  @returns {Matrix2D}
 */
Matrix2D.prototype.multiply = function (that) {
    if (this.isIdentity()) {
        return that;
    }

    if (that.isIdentity()) {
        return this;
    }

    return new this.constructor(
        this.a * that.a + this.c * that.b,
        this.b * that.a + this.d * that.b,
        this.a * that.c + this.c * that.d,
        this.b * that.c + this.d * that.d,
        this.a * that.e + this.c * that.f + this.e,
        this.b * that.e + this.d * that.f + this.f
    );
};

/**
 *  inverse
 *
 *  @returns {Matrix2D}
 */
Matrix2D.prototype.inverse = function () {
    if (this.isIdentity()) {
        return this;
    }

    var det1 = this.a * this.d - this.b * this.c;

    if ( det1 === 0.0 ) {
        throw("Matrix is not invertible");
    }

    var idet = 1.0 / det1;
    var det2 = this.f * this.c - this.e * this.d;
    var det3 = this.e * this.b - this.f * this.a;

    return new this.constructor(
        this.d * idet,
       -this.b * idet,
       -this.c * idet,
        this.a * idet,
          det2 * idet,
          det3 * idet
    );
};

/**
 *  translate
 *
 *  @param {Number} tx
 *  @param {Number} ty
 *  @returns {Matrix2D}
 */
Matrix2D.prototype.translate = function(tx, ty) {
    return new this.constructor(
        this.a,
        this.b,
        this.c,
        this.d,
        this.a * tx + this.c * ty + this.e,
        this.b * tx + this.d * ty + this.f
    );
};

/**
 *  scale
 *
 *  @param {Number} scale
 *  @returns {Matrix2D}
 */
Matrix2D.prototype.scale = function(scale) {
    return new this.constructor(
        this.a * scale,
        this.b * scale,
        this.c * scale,
        this.d * scale,
        this.e,
        this.f
    );
};

/**
 *  scaleAt
 *
 *  @param {Number} scale
 *  @param {Point2D} center
 *  @returns {Matrix2D}
 */
Matrix2D.prototype.scaleAt = function(scale, center) {
    var dx = center.x - scale * center.x;
    var dy = center.y - scale * center.y;

    return new this.constructor(
        this.a * scale,
        this.b * scale,
        this.c * scale,
        this.d * scale,
        this.a * dx + this.c * dy + this.e,
        this.b * dx + this.d * dy + this.f
    );
};

/**
 *  scaleNonUniform
 *
 *  @param {Number} scaleX
 *  @param {Number} scaleY
 *  @returns {Matrix2D}
 */
Matrix2D.prototype.scaleNonUniform = function(scaleX, scaleY) {
    return new this.constructor(
        this.a * scaleX,
        this.b * scaleX,
        this.c * scaleY,
        this.d * scaleY,
        this.e,
        this.f
    );
};

/**
 *  scaleNonUniformAt
 *
 *  @param {Number} scaleX
 *  @param {Number} scaleY
 *  @param {Point2D} center
 *  @returns {Matrix2D}
 */
Matrix2D.prototype.scaleNonUniformAt = function(scaleX, scaleY, center) {
    var dx = center.x - scaleX * center.x;
    var dy = center.y - scaleY * center.y;

    return new this.constructor(
        this.a * scaleX,
        this.b * scaleX,
        this.c * scaleY,
        this.d * scaleY,
        this.a * dx + this.c * dy + this.e,
        this.b * dx + this.d * dy + this.f
    );
};

/**
 *  rotate
 *
 *  @param {Number} radians
 *  @returns {Matrix2D}
 */
Matrix2D.prototype.rotate = function(radians) {
    var c = Math.cos(radians);
    var s = Math.sin(radians);

    return new this.constructor(
        this.a *  c + this.c * s,
        this.b *  c + this.d * s,
        this.a * -s + this.c * c,
        this.b * -s + this.d * c,
        this.e,
        this.f
    );
};

/**
 *  rotateAt
 *
 *  @param {Number} radians
 *  @param {Point2D} center
 *  @result {Matrix2D}
 */
Matrix2D.prototype.rotateAt = function(radians, center) {
    var c = Math.cos(radians);
    var s = Math.sin(radians);
    var t1 = -center.x + center.x * c - center.y * s;
    var t2 = -center.y + center.y * c + center.x * s;

    return new this.constructor(
        this.a *  c + this.c * s,
        this.b *  c + this.d * s,
        this.a * -s + this.c * c,
        this.b * -s + this.d * c,
        this.a * t1 + this.c * t2 + this.e,
        this.b * t1 + this.d * t2 + this.f
    );
};

/**
 *  rotateFromVector
 *
 *  @param {Vector2D}
 *  @returns {Matrix2D}
 */
Matrix2D.prototype.rotateFromVector = function(vector) {
    var unit = vector.unit();
    var c = unit.x; // cos
    var s = unit.y; // sin

    return new this.constructor(
        this.a *  c + this.c * s,
        this.b *  c + this.d * s,
        this.a * -s + this.c * c,
        this.b * -s + this.d * c,
        this.e,
        this.f
    );
};

/**
 *  flipX
 *
 *  @returns {Matrix2D}
 */
Matrix2D.prototype.flipX = function() {
    return new this.constructor(
        -this.a,
        -this.b,
         this.c,
         this.d,
         this.e,
         this.f
    );
};

/**
 *  flipY
 *
 *  @returns {Matrix2D}
 */
Matrix2D.prototype.flipY = function() {
    return new this.constructor(
         this.a,
         this.b,
        -this.c,
        -this.d,
         this.e,
         this.f
    );
};

/**
 *  skewX
 *
 *  @pararm {Number} radians
 *  @returns {Matrix2D}
 */
Matrix2D.prototype.skewX = function(radians) {
    var t = Math.tan(radians);

    return new this.constructor(
        this.a,
        this.b,
        this.a * t + this.c,
        this.b * t + this.d,
        this.e,
        this.f
    );
};

// TODO: skewXAt

/**
 *  skewY
 *
 *  @pararm {Number} radians
 *  @returns {Matrix2D}
 */
Matrix2D.prototype.skewY = function(radians) {
    var t = Math.tan(radians);

    return new this.constructor(
        this.a + this.c * t,
        this.b + this.d * t,
        this.c,
        this.d,
        this.e,
        this.f
    );
};

// TODO: skewYAt

/**
 *  isIdentity
 *
 *  @returns {Boolean}
 */
Matrix2D.prototype.isIdentity = function() {
    return (
        this.a === 1.0 &&
        this.b === 0.0 &&
        this.c === 0.0 &&
        this.d === 1.0 &&
        this.e === 0.0 &&
        this.f === 0.0
    );
};

/**
 *  isInvertible
 *
 *  @returns {Boolean}
 */
Matrix2D.prototype.isInvertible = function() {
    return this.a * this.d - this.b * this.c !== 0.0;
};

/**
 *  getScale
 *
 *  @returns {{ scaleX: Number, scaleY: Number }}
 */
Matrix2D.prototype.getScale = function() {
    return {
        scaleX: Math.sqrt(this.a * this.a + this.c * this.c),
        scaleY: Math.sqrt(this.b * this.b + this.d * this.d)
    };
};

/**
 *  getDecomposition
 *
 *  Calculates matrix Singular Value Decomposition
 *
 *  The resulting matrices, translation, rotation, scale, and rotation0, return
 *  this matrix when they are muliplied together in the listed order
 *
 *  @see Jim Blinn's article {@link http://dx.doi.org/10.1109/38.486688}
 *  @see {@link http://math.stackexchange.com/questions/861674/decompose-a-2d-arbitrary-transform-into-only-scaling-and-rotation}
 *
 *  @returns {{ translation: Matrix2D, rotation: Matrix2D, scale: Matrix2D, rotation0: Matrix2D }}
 */
Matrix2D.prototype.getDecomposition = function () {
    var E      = (this.a + this.d) * 0.5;
    var F      = (this.a - this.d) * 0.5;
    var G      = (this.b + this.c) * 0.5;
    var H      = (this.b - this.c) * 0.5;

    var Q      = Math.sqrt(E * E + H * H);
    var R      = Math.sqrt(F * F + G * G);
    var scaleX = Q + R;
    var scaleY = Q - R;

    var a1     = Math.atan2(G, F);
    var a2     = Math.atan2(H, E);
    var theta  = (a2 - a1) * 0.5;
    var phi    = (a2 + a1) * 0.5;

    // TODO: Add static methods to generate translation, rotation, etc.
    // matrices directly

    return {
        translation: new this.constructor(1, 0, 0, 1, this.e, this.f),
        rotation:    this.constructor.IDENTITY.rotate(phi),
        scale:       new this.constructor(scaleX, 0, 0, scaleY, 0, 0),
        rotation0:   this.constructor.IDENTITY.rotate(theta)
    };
};

/**
 *  equals
 *
 *  @param {Matrix2D} that
 *  @returns {Boolean}
 */
Matrix2D.prototype.equals = function(that) {
    return (
        this.a === that.a &&
        this.b === that.b &&
        this.c === that.c &&
        this.d === that.d &&
        this.e === that.e &&
        this.f === that.f
    );
};

/**
 *  toString
 *
 *  @returns {String}
 */
Matrix2D.prototype.toString = function() {
    return "matrix(" + [this.a, this.b, this.c, this.d, this.e, this.f].join(",") + ")";
};

if (typeof module !== "undefined") {
    module.exports = Matrix2D;
}

},{}],5:[function(require,module,exports){
/**
 *
 *   Point2D.js
 *
 *   copyright 2001-2002, 2013 Kevin Lindsey
 *
 */

/**
 *  Point2D
 *
 *  @param {Number} x
 *  @param {Number} y
 *  @returns {Point2D}
 */
function Point2D(x, y) {
    Object.defineProperties(this, {
        "x": {
            value: x,
            writable: false,
            enumerable: true,
            configurable: false
        },
        "y": {
            value: y,
            writable: false,
            enumerable: true,
            configurable: false
        }
    });
    // this.x = x;
    // this.y = y;
}

/**
 *  clone
 *
 *  @returns {Point2D}
 */
Point2D.prototype.clone = function() {
    return new this.constructor(this.x, this.y);
};

/**
 *  add
 *
 *  @param {Point2D|Vector2D} that
 *  @returns {Point2D}
 */
Point2D.prototype.add = function(that) {
    return new this.constructor(this.x+that.x, this.y+that.y);
};

/**
 *  subtract
 *
 *  @param { Vector2D | Point2D } that
 *  @returns {Point2D}
 */
Point2D.prototype.subtract = function(that) {
    return new this.constructor(this.x-that.x, this.y-that.y);
};

/**
 *  multiply
 *
 *  @param {Number} scalar
 *  @returns {Point2D}
 */
Point2D.prototype.multiply = function(scalar) {
    return new this.constructor(this.x*scalar, this.y*scalar);
};

/**
 *  divide
 *
 *  @param {Number} scalar
 *  @returns {Point2D}
 */
Point2D.prototype.divide = function(scalar) {
    return new this.constructor(this.x/scalar, this.y/scalar);
};

/**
 *  equals
 *
 *  @param {Point2D} that
 *  @returns {Boolean}
 */
Point2D.prototype.equals = function(that) {
    return ( this.x === that.x && this.y === that.y );
};

// utility methods

/**
 *  lerp
 *
 *  @param { Vector2D | Point2D } that
 *  @param {Number} t
 @  @returns {Point2D}
 */
Point2D.prototype.lerp = function(that, t) {
    var omt = 1.0 - t;

    return new this.constructor(
        this.x * omt + that.x * t,
        this.y * omt + that.y * t
    );
};

/**
 *  distanceFrom
 *
 *  @param {Point2D} that
 *  @returns {Number}
 */
Point2D.prototype.distanceFrom = function(that) {
    var dx = this.x - that.x;
    var dy = this.y - that.y;

    return Math.sqrt(dx*dx + dy*dy);
};

/**
 *  min
 *
 *  @param {Point2D} that
 *  @returns {Number}
 */
Point2D.prototype.min = function(that) {
    return new this.constructor(
        Math.min( this.x, that.x ),
        Math.min( this.y, that.y )
    );
};

/**
 *  max
 *
 *  @param {Point2D} that
 *  @returns {Number}
 */
Point2D.prototype.max = function(that) {
    return new this.constructor(
        Math.max( this.x, that.x ),
        Math.max( this.y, that.y )
    );
};

/**
 *  transform
 *
 *  @param {Matrix2D}
 *  @result {Point2D}
 */
Point2D.prototype.transform = function(matrix) {
    return new this.constructor(
        matrix.a * this.x + matrix.c * this.y + matrix.e,
        matrix.b * this.x + matrix.d * this.y + matrix.f
    );
};

/**
 *  toString
 *
 *  @returns {String}
 */
Point2D.prototype.toString = function() {
    return "point(" + this.x + "," + this.y + ")";
};

if (typeof module !== "undefined") {
    module.exports = Point2D;
}

},{}],6:[function(require,module,exports){
/**
 *
 *   Vector2D.js
 *
 *   copyright 2001-2002, 2013 Kevin Lindsey
 *
 */

/**
 *  Vector2D
 *
 *  @param {Number} x
 *  @param {Number} y
 *  @returns {Vector2D}
 */
function Vector2D(x, y) {
    Object.defineProperties(this, {
        "x": {
            value: x,
            writable: false,
            enumerable: true,
            configurable: false
        },
        "y": {
            value: y,
            writable: false,
            enumerable: true,
            configurable: false
        }
    });
    // this.x = x;
    // this.y = y;
}

/**
 *  fromPoints
 *
 *  @param {Point2D} p1
 *  @param {Point2D} p2
 *  @returns {Vector2D}
 */
Vector2D.fromPoints = function(p1, p2) {
    return new Vector2D(
        p2.x - p1.x,
        p2.y - p1.y
    );
};

/**
 *  length
 *
 *  @returns {Number}
 */
Vector2D.prototype.length = function() {
    return Math.sqrt(this.x*this.x + this.y*this.y);
};

/**
 *  magnitude
 *
 *  @returns {Number}
 */
Vector2D.prototype.magnitude = function() {
    return this.x*this.x + this.y*this.y;
};

/**
 *  dot
 *
 *  @param {Vector2D} that
 *  @returns {Number}
 */
Vector2D.prototype.dot = function(that) {
    return this.x*that.x + this.y*that.y;
};

/**
 *  cross
 *
 *  @param {Vector2D} that
 *  @returns {Number}
 */
Vector2D.prototype.cross = function(that) {
    return this.x*that.y - this.y*that.x;
};

/**
 *  determinant
 *
 *  @param {Vector2D} that
 *  @returns {Number}
 */
Vector2D.prototype.determinant = function(that) {
    return this.x*that.y - this.y*that.x;
};

/**
 *  unit
 *
 *  @returns {Vector2D}
 */
Vector2D.prototype.unit = function() {
    return this.divide( this.length() );
};

/**
 *  add
 *
 *  @param {Vector2D} that
 *  @returns {Vector2D}
 */
Vector2D.prototype.add = function(that) {
    return new this.constructor(this.x + that.x, this.y + that.y);
};

/**
 *  subtract
 *
 *  @param {Vector2D} that
 *  @returns {Vector2D}
 */
Vector2D.prototype.subtract = function(that) {
    return new this.constructor(this.x - that.x, this.y - that.y);
};

/**
 *  multiply
 *
 *  @param {Number} scalar
 *  @returns {Vector2D}
 */
Vector2D.prototype.multiply = function(scalar) {
    return new this.constructor(this.x * scalar, this.y * scalar);
};

/**
 *  divide
 *
 *  @param {Number} scalar
 *  @returns {Vector2D}
 */
Vector2D.prototype.divide = function(scalar) {
    return new this.constructor(this.x / scalar, this.y / scalar);
};

/**
 *  angleBetween
 *
 *  @param {Vector2D} that
 *  @returns {Number}
 */
Vector2D.prototype.angleBetween = function(that) {
    var cos = this.dot(that) / (this.length() * that.length());
    cos = Math.max(-1, Math.min(cos, 1));
    var radians = Math.acos(cos);

    return (this.cross(that) < 0.0) ? -radians : radians;
};

/**
 *  Find a vector is that is perpendicular to this vector
 *
 *  @returns {Vector2D}
 */
Vector2D.prototype.perp = function() {
    return new this.constructor(-this.y, this.x);
};

/**
 *  Find the component of the specified vector that is perpendicular to
 *  this vector
 *
 *  @param {Vector2D} that
 *  @returns {Vector2D}
 */
Vector2D.prototype.perpendicular = function(that) {
    return this.subtract(this.project(that));
};

/**
 *  project
 *
 *  @param {Vector2D} that
 *  @returns {Vector2D}
 */
Vector2D.prototype.project = function(that) {
    var percent = this.dot(that) / that.dot(that);

    return that.multiply(percent);
};

/**
 *  transform
 *
 *  @param {Matrix2D}
 *  @returns {Vector2D}
 */
Vector2D.prototype.transform = function(matrix) {
    return new this.constructor(
        matrix.a * this.x + matrix.c * this.y,
        matrix.b * this.x + matrix.d * this.y
    );
};

/**
 *  equals
 *
 *  @param {Vector2D} that
 *  @returns {Boolean}
 */
Vector2D.prototype.equals = function(that) {
    return (
        this.x === that.x &&
        this.y === that.y
    );
};

/**
 *  toString
 *
 *  @returns {String}
 */
Vector2D.prototype.toString = function() {
    return "vector(" + this.x + "," + this.y + ")";
};

if (typeof module !== "undefined") {
    module.exports = Vector2D;
}

},{}],7:[function(require,module,exports){
// expose classes

exports.Polynomial = require('./lib/Polynomial');
exports.SqrtPolynomial = require('./lib/SqrtPolynomial');

},{"./lib/Polynomial":8,"./lib/SqrtPolynomial":9}],8:[function(require,module,exports){
/**
 *
 *   Polynomial.js
 *
 *   copyright 2002, 2013 Kevin Lindsey
 * 
 *   contribution {@link http://github.com/Quazistax/kld-polynomial}
 *       @copyright 2015 Robert Benko (Quazistax) <quazistax@gmail.com>
 *       @license MIT
 */

Polynomial.TOLERANCE = 1e-6;
Polynomial.ACCURACY  = 15;


/**
 *  interpolate
 *
 *  @param {Array<Number>} xs
 *  @param {Array<Number>} ys
 *  @param {Number} n
 *  @param {Number} offset
 *  @param {Number} x
 *
 *  @returns {y:Number, dy:Number}
 */
Polynomial.interpolate = function(xs, ys, n, offset, x) {
    if ( xs.constructor !== Array || ys.constructor !== Array )
        throw new Error("Polynomial.interpolate: xs and ys must be arrays");
    if ( isNaN(n) || isNaN(offset) || isNaN(x) )
        throw new Error("Polynomial.interpolate: n, offset, and x must be numbers");

    var y  = 0;
    var dy = 0;
    var c = new Array(n);
    var d = new Array(n);
    var ns = 0;
    var result;

    var diff = Math.abs(x - xs[offset]);
    for ( var i = 0; i < n; i++ ) {
        var dift = Math.abs(x - xs[offset+i]);

        if ( dift < diff ) {
            ns = i;
            diff = dift;
        }
        c[i] = d[i] = ys[offset+i];
    }
    y = ys[offset+ns];
    ns--;

    for ( var m = 1; m < n; m++ ) {
        for ( var i = 0; i < n-m; i++ ) {
            var ho = xs[offset+i] - x;
            var hp = xs[offset+i+m] - x;
            var w = c[i+1]-d[i];
            var den = ho - hp;

            if ( den == 0.0 ) {
                result = { y: 0, dy: 0};
                break;
            }

            den = w / den;
            d[i] = hp*den;
            c[i] = ho*den;
        }
        dy = (2*(ns+1) < (n-m)) ? c[ns+1] : d[ns--];
        y += dy;
    }

    return { y: y, dy: dy };
};


/**
 *  Polynomial
 *
 *  @returns {Polynomial}
 */
function Polynomial() {
    this.init( arguments );
}


/**
 *  init
 */
Polynomial.prototype.init = function(coefs) {
    this.coefs = new Array();

    for ( var i = coefs.length - 1; i >= 0; i-- )
        this.coefs.push( coefs[i] );

    this._variable = "t";
    this._s = 0;
};


/**
 *  eval
 */
Polynomial.prototype.eval = function(x) {
    if ( isNaN(x) )
        throw new Error("Polynomial.eval: parameter must be a number");

    var result = 0;

    for ( var i = this.coefs.length - 1; i >= 0; i-- )
        result = result * x + this.coefs[i];

    return result;
};


/**
 *  add
 */
Polynomial.prototype.add = function(that) {
    var result = new Polynomial();
    var d1 = this.getDegree();
    var d2 = that.getDegree();
    var dmax = Math.max(d1,d2);

    for ( var i = 0; i <= dmax; i++ ) {
        var v1 = (i <= d1) ? this.coefs[i] : 0;
        var v2 = (i <= d2) ? that.coefs[i] : 0;

        result.coefs[i] = v1 + v2;
    }

    return result;
};


/**
 *  multiply
 */
Polynomial.prototype.multiply = function(that) {
    var result = new Polynomial();

    for ( var i = 0; i <= this.getDegree() + that.getDegree(); i++ )
        result.coefs.push(0);

    for ( var i = 0; i <= this.getDegree(); i++ )
        for ( var j = 0; j <= that.getDegree(); j++ )
            result.coefs[i+j] += this.coefs[i] * that.coefs[j];

    return result;
};


/**
 *  divide_scalar
 */
Polynomial.prototype.divide_scalar = function(scalar) {
    for ( var i = 0; i < this.coefs.length; i++ )
        this.coefs[i] /= scalar;
};


/**
 *  simplify
 */
Polynomial.prototype.simplify = function() {
    var TOLERANCE = 1e-15;
    for ( var i = this.getDegree(); i >= 0; i-- ) {
        if ( Math.abs( this.coefs[i] ) <= TOLERANCE )
            this.coefs.pop();
        else
            break;
    }
};


/**
 *  bisection
 */
Polynomial.prototype.bisection = function(min, max) {
    var minValue = this.eval(min);
    var maxValue = this.eval(max);
    var result;

    if ( Math.abs(minValue) <= Polynomial.TOLERANCE )
        result = min;
    else if ( Math.abs(maxValue) <= Polynomial.TOLERANCE )
        result = max;
    else if ( minValue * maxValue <= 0 ) {
        var tmp1  = Math.log(max - min);
        var tmp2  = Math.LN10 * Polynomial.ACCURACY;
        var iters = Math.ceil( (tmp1+tmp2) / Math.LN2 );

        for ( var i = 0; i < iters; i++ ) {
            result = 0.5 * (min + max);
            var value = this.eval(result);

            if ( Math.abs(value) <= Polynomial.TOLERANCE ) {
                break;
            }

            if ( value * minValue < 0 ) {
                max = result;
                maxValue = value;
            } else {
                min = result;
                minValue = value;
            }
        }
    }

    return result;
};


/**
 *  toString
 */
Polynomial.prototype.toString = function() {
    var coefs = new Array();
    var signs = new Array();

    for ( var i = this.coefs.length - 1; i >= 0; i-- ) {
        var value = Math.round(this.coefs[i]*1000)/1000;
        //var value = this.coefs[i];

        if ( value != 0 ) {
            var sign = ( value < 0 ) ? " - " : " + ";

            value = Math.abs(value);
            if ( i > 0 )
                if ( value == 1 )
                    value = this._variable;
                else
                    value += this._variable;
            if ( i > 1 ) value += "^" + i;

            signs.push( sign );
            coefs.push( value );
        }
    }

    signs[0] = ( signs[0] == " + " ) ? "" : "-";

    var result = "";
    for ( var i = 0; i < coefs.length; i++ )
        result += signs[i] + coefs[i];

    return result;
};


/**
 *  trapezoid
 *  Based on trapzd in "Numerical Recipes in C", page 137
 */
Polynomial.prototype.trapezoid = function(min, max, n) {
    if ( isNaN(min) || isNaN(max) || isNaN(n) )
        throw new Error("Polynomial.trapezoid: parameters must be numbers");

    var range = max - min;
    var TOLERANCE = 1e-7;

    if ( n == 1 ) {
        var minValue = this.eval(min);
        var maxValue = this.eval(max);
        this._s = 0.5*range*( minValue + maxValue );
    } else {
        var it = 1 << (n-2);
        var delta = range / it;
        var x = min + 0.5*delta;
        var sum = 0;

        for ( var i = 0; i < it; i++ ) {
            sum += this.eval(x);
            x += delta;
        }
        this._s = 0.5*(this._s + range*sum/it);
    }

    if ( isNaN(this._s) )
        throw new Error("Polynomial.trapezoid: this._s is NaN");

    return this._s;
};


/**
 *  simpson
 *  Based on trapzd in "Numerical Recipes in C", page 139
 */
Polynomial.prototype.simpson = function(min, max) {
    if ( isNaN(min) || isNaN(max) )
        throw new Error("Polynomial.simpson: parameters must be numbers");

    var range = max - min;
    var st = 0.5 * range * ( this.eval(min) + this.eval(max) );
    var t = st;
    var s = 4.0*st/3.0;
    var os = s;
    var ost = st;
    var TOLERANCE = 1e-7;

    var it = 1;
    for ( var n = 2; n <= 20; n++ ) {
        var delta = range / it;
        var x     = min + 0.5*delta;
        var sum   = 0;

        for ( var i = 1; i <= it; i++ ) {
            sum += this.eval(x);
            x += delta;
        }

        t = 0.5 * (t + range * sum / it);
        st = t;
        s = (4.0*st - ost)/3.0;

        if ( Math.abs(s-os) < TOLERANCE*Math.abs(os) )
            break;

        os = s;
        ost = st;
        it <<= 1;
    }

    return s;
};


/**
 *  romberg
 */
Polynomial.prototype.romberg = function(min, max) {
    if ( isNaN(min) || isNaN(max) )
        throw new Error("Polynomial.romberg: parameters must be numbers");

    var MAX = 20;
    var K = 3;
    var TOLERANCE = 1e-6;
    var s = new Array(MAX+1);
    var h = new Array(MAX+1);
    var result = { y: 0, dy: 0 };

    h[0] = 1.0;
    for ( var j = 1; j <= MAX; j++ ) {
        s[j-1] = this.trapezoid(min, max, j);
        if ( j >= K ) {
            result = Polynomial.interpolate(h, s, K, j-K, 0.0);
            if ( Math.abs(result.dy) <= TOLERANCE*result.y) break;
        }
        s[j] = s[j-1];
        h[j] = 0.25 * h[j-1];
    }

    return result.y;
};

// getters and setters

/**
 *  get degree
 */
Polynomial.prototype.getDegree = function() {
    return this.coefs.length - 1;
};


/**
 *  getDerivative
 */
Polynomial.prototype.getDerivative = function() {
    var derivative = new Polynomial();

    for ( var i = 1; i < this.coefs.length; i++ ) {
        derivative.coefs.push(i*this.coefs[i]);
    }

    return derivative;
};


/**
 *  getRoots
 */
Polynomial.prototype.getRoots = function() {
    var result;

    this.simplify();
    switch ( this.getDegree() ) {
        case 0: result = new Array();              break;
        case 1: result = this.getLinearRoot();     break;
        case 2: result = this.getQuadraticRoots(); break;
        case 3: result = this.getCubicRoots();     break;
        case 4: result = this.getQuarticRoots();   break;
        default:
            result = new Array();
            // should try Newton's method and/or bisection
    }

    return result;
};


/**
 *  getRootsInInterval
 */
Polynomial.prototype.getRootsInInterval = function(min, max) {
    var roots = new Array();
    var root;

    if ( this.getDegree() == 1 ) {
        root = this.bisection(min, max);
        if ( root != null ) roots.push(root);
    } else {
        // get roots of derivative
        var deriv  = this.getDerivative();
        var droots = deriv.getRootsInInterval(min, max);

        if ( droots.length > 0 ) {
            // find root on [min, droots[0]]
            root = this.bisection(min, droots[0]);
            if ( root != null ) roots.push(root);

            // find root on [droots[i],droots[i+1]] for 0 <= i <= count-2
            for ( i = 0; i <= droots.length-2; i++ ) {
                root = this.bisection(droots[i], droots[i+1]);
                if ( root != null ) roots.push(root);
            }

            // find root on [droots[count-1],xmax]
            root = this.bisection(droots[droots.length-1], max);
            if ( root != null ) roots.push(root);
        } else {
            // polynomial is monotone on [min,max], has at most one root
            root = this.bisection(min, max);
            if ( root != null ) roots.push(root);
        }
    }

    return roots;
};


/**
 *  getLinearRoot
 */
Polynomial.prototype.getLinearRoot = function() {
    var result = new Array();
    var a = this.coefs[1];

    if ( a != 0 )
        result.push( -this.coefs[0] / a );

    return result;
};


/**
 *  getQuadraticRoots
 */
Polynomial.prototype.getQuadraticRoots = function() {
    var results = new Array();

    if ( this.getDegree() == 2 ) {
        var a = this.coefs[2];
        var b = this.coefs[1] / a;
        var c = this.coefs[0] / a;
        var d = b*b - 4*c;

        if ( d > 0 ) {
            var e = Math.sqrt(d);

            results.push( 0.5 * (-b + e) );
            results.push( 0.5 * (-b - e) );
        } else if ( d == 0 ) {
            // really two roots with same value, but we only return one
            results.push( 0.5 * -b );
        }
    }

    return results;
};


/**
 *  getCubicRoots
 *
 *  This code is based on MgcPolynomial.cpp written by David Eberly.  His
 *  code along with many other excellent examples are avaiable at his site:
 *  http://www.geometrictools.com
 */
Polynomial.prototype.getCubicRoots = function() {
    var results = new Array();

    if ( this.getDegree() == 3 ) {
        var c3 = this.coefs[3];
        var c2 = this.coefs[2] / c3;
        var c1 = this.coefs[1] / c3;
        var c0 = this.coefs[0] / c3;

        var a       = (3*c1 - c2*c2) / 3;
        var b       = (2*c2*c2*c2 - 9*c1*c2 + 27*c0) / 27;
        var offset  = c2 / 3;
        var discrim = b*b/4 + a*a*a/27;
        var halfB   = b / 2;

        var ZEROepsilon = this.zeroErrorEstimate();
        if (Math.abs(discrim) <= ZEROepsilon) discrim = 0;

        if ( discrim > 0 ) {
            var e = Math.sqrt(discrim);
            var tmp;
            var root;

            tmp = -halfB + e;
            if ( tmp >= 0 )
                root = Math.pow(tmp, 1/3);
            else
                root = -Math.pow(-tmp, 1/3);

            tmp = -halfB - e;
            if ( tmp >= 0 )
                root += Math.pow(tmp, 1/3);
            else
                root -= Math.pow(-tmp, 1/3);

            results.push( root - offset );
        } else if ( discrim < 0 ) {
            var distance = Math.sqrt(-a/3);
            var angle    = Math.atan2( Math.sqrt(-discrim), -halfB) / 3;
            var cos      = Math.cos(angle);
            var sin      = Math.sin(angle);
            var sqrt3    = Math.sqrt(3);

            results.push( 2*distance*cos - offset );
            results.push( -distance * (cos + sqrt3 * sin) - offset);
            results.push( -distance * (cos - sqrt3 * sin) - offset);
        } else {
            var tmp;

            if ( halfB >= 0 )
                tmp = -Math.pow(halfB, 1/3);
            else
                tmp = Math.pow(-halfB, 1/3);

            results.push( 2*tmp - offset );
            // really should return next root twice, but we return only one
            results.push( -tmp - offset );
        }
    }

    return results;
};

/**
    Sign of a number (+1, -1, +0, -0).
 */
var sign = function (x) {
    return typeof x === 'number' ? x ? x < 0 ? -1 : 1 : x === x ? x : NaN : NaN;
};


///////////////////////////////////////////////////////////////////
/**
    Calculates roots of quartic polynomial. <br/>
    First, derivative roots are found, then used to split quartic polynomial 
    into segments, each containing one root of quartic polynomial.
    Segments are then passed to newton's method to find roots.

    @returns {Array<Number>} roots
*/
Polynomial.prototype.getQuarticRoots = function () {
    var results = [];

    var n = this.getDegree();
    if (n == 4) {

        var poly = new Polynomial();
        poly.coefs = this.coefs.slice();
        poly.divide_scalar(poly.coefs[n]);
        var ERRF = 1e-15;
        if (Math.abs(poly.coefs[0]) < 10 * ERRF * Math.abs(poly.coefs[3]))
            poly.coefs[0] = 0;
        var poly_d = poly.getDerivative();
        var derrt = poly_d.getRoots().sort(function (a, b) { return a - b; });
        var dery = [];
        var nr = derrt.length - 1;
        var i;
        var rb = this.bounds();
        maxabsX = Math.max(Math.abs(rb.minX), Math.abs(rb.maxX));
        var ZEROepsilon = this.zeroErrorEstimate(maxabsX);
        
        for (i = 0; i <= nr; i++) {
            dery.push(poly.eval(derrt[i]));
        }

        for (i = 0; i <= nr; i++) {
            if (Math.abs(dery[i]) < ZEROepsilon)
                dery[i] = 0;
        }

        i = 0;
        var dx = Math.max(0.1 * (rb.maxX - rb.minX) / n, ERRF);
        var guesses = [];
        var minmax = [];
        if (nr > -1) {
            if (dery[0] != 0) {
                if (sign(dery[0]) != sign(poly.eval(derrt[0] - dx) - dery[0])) {
                    guesses.push(derrt[0] - dx);
                    minmax.push([rb.minX, derrt[0]]);
                }
            }
            else {
                results.push(derrt[0], derrt[0]);
                i++;
            }

            for (; i < nr; i++) {
                if (dery[i + 1] == 0) {
                    results.push(derrt[i + 1], derrt[i + 1]);
                    i++;
                }
                else if (sign(dery[i]) != sign(dery[i + 1])) {
                    guesses.push((derrt[i] + derrt[i + 1]) / 2);
                    minmax.push([derrt[i], derrt[i + 1]]);
                }
            }
            if (dery[nr] != 0 && sign(dery[nr]) != sign(poly.eval(derrt[nr] + dx) - dery[nr])) {
                guesses.push(derrt[nr] + dx);
                minmax.push([derrt[nr], rb.maxX]);
            }
        }

        var f = function (x) { return poly.eval(x); };
        var df = function (x) { return poly_d.eval(x); };
        if (guesses.length > 0) {
            for (i = 0; i < guesses.length; i++) {
                guesses[i] = Polynomial.newton_secant_bisection(guesses[i], f, df, 32, minmax[i][0], minmax[i][1]);
            }
        }

        results = results.concat(guesses);
    }
    return results;
};

///////////////////////////////////////////////////////////////////
/**
    Estimate what is the maximum polynomial evaluation error value under which polynomial evaluation could be in fact 0.
    
    @returns {Number} 
*/
Polynomial.prototype.zeroErrorEstimate = function (maxabsX) {
    var poly = this;
    var ERRF = 1e-15;
    if (typeof maxabsX === 'undefined') {
        var rb = poly.bounds();
        maxabsX = Math.max(Math.abs(rb.minX), Math.abs(rb.maxX));
    }
    if (maxabsX < 0.001) {
        return 2*Math.abs(poly.eval(ERRF));
    }
    var n = poly.coefs.length - 1;
    var an = poly.coefs[n];
    return 10 * ERRF * poly.coefs.reduce(function (m, v, i) {
        var nm = v / an * Math.pow(maxabsX, i);
        return nm > m ? nm : m;
    }, 0);
}

///////////////////////////////////////////////////////////////////
/**
    Calculates upper Real roots bounds. <br/>
    Real roots are in interval [negX, posX]. Determined by Fujiwara method.
    @see {@link http://en.wikipedia.org/wiki/Properties_of_polynomial_roots}

    @returns {{ negX: Number, posX: Number }}
*/
Polynomial.prototype.bounds_UpperReal_Fujiwara = function () {
    var a = this.coefs;
    var n = a.length - 1;
    var an = a[n];
    if (an != 1) {
        a = this.coefs.map(function (v) { return v / an; });
    }
    var b = a.map(function (v, i) { return (i < n) ? Math.pow(Math.abs((i == 0) ? v / 2 : v), 1 / (n - i)) : v; });

    var coefSelectionFunc;
    var find2Max = function (acc, bi, i) {
        if (coefSelectionFunc(i)) {
            if (acc.max < bi) {
                acc.nearmax = acc.max;
                acc.max = bi;
            }
            else if (acc.nearmax < bi) {
                acc.nearmax = bi;
            }
        }
        return acc;
    };

    coefSelectionFunc = function (i) { return i < n && a[i] < 0; };
    var max_nearmax_pos = b.reduce(find2Max, { max: 0, nearmax: 0 });

    coefSelectionFunc = function (i) { return i < n && ((n % 2 == i % 2) ? a[i] < 0 : a[i] > 0); };
    var max_nearmax_neg = b.reduce(find2Max, { max: 0, nearmax: 0 });

    return {
        negX: -2 * max_nearmax_neg.max,
        posX: 2 * max_nearmax_pos.max
    };
};


///////////////////////////////////////////////////////////////////
/** 
    Calculates lower Real roots bounds. <br/>
    There are no Real roots in interval <negX, posX>. Determined by Fujiwara method.
    @see {@link http://en.wikipedia.org/wiki/Properties_of_polynomial_roots}

    @returns {{ negX: Number, posX: Number }}
*/
Polynomial.prototype.bounds_LowerReal_Fujiwara = function () {
    var poly = new Polynomial();
    poly.coefs = this.coefs.slice().reverse();
    var res = poly.bounds_UpperReal_Fujiwara();
    res.negX = 1 / res.negX;
    res.posX = 1 / res.posX;
    return res;
};


///////////////////////////////////////////////////////////////////
/** 
    Calculates left and right Real roots bounds. <br/>
    Real roots are in interval [minX, maxX]. Combines Fujiwara lower and upper bounds to get minimal interval.
    @see {@link http://en.wikipedia.org/wiki/Properties_of_polynomial_roots}

    @returns {{ minX: Number, maxX: Number }}
*/
Polynomial.prototype.bounds = function () {
    var urb = this.bounds_UpperReal_Fujiwara();
    var rb = { minX: urb.negX, maxX: urb.posX };
    if (urb.negX === 0 && urb.posX === 0)
        return rb;
    if (urb.negX === 0) {
        rb.minX = this.bounds_LowerReal_Fujiwara().posX;
    }
    else if (urb.posX === 0) {
        rb.maxX = this.bounds_LowerReal_Fujiwara().negX;
    }
    if (rb.minX > rb.maxX) {
        //console.log('Polynomial.prototype.bounds: poly has no real roots? or floating point error?');
        rb.minX = rb.maxX = 0;
    }
    return rb;
    // TODO: if sure that there are no complex roots 
    // (maybe by using Sturm's theorem) use:
    //return this.bounds_Real_Laguerre();
};


/////////////////////////////////////////////////////////////////// 
/**
    Newton's (Newton-Raphson) method for finding Real roots on univariate function. <br/>
    When using bounds, algorithm falls back to secant if newton goes out of range.
    Bisection is fallback for secant when determined secant is not efficient enough.
    @see {@link http://en.wikipedia.org/wiki/Newton%27s_method}
    @see {@link http://en.wikipedia.org/wiki/Secant_method}
    @see {@link http://en.wikipedia.org/wiki/Bisection_method}

    @param {Number} x0 - Inital root guess
    @param {function(x)} f - Function which root we are trying to find
    @param {function(x)} df - Derivative of function f
    @param {Number} max_iterations - Maximum number of algorithm iterations
    @param {Number} [min_x] - Left bound value
    @param {Number} [max_x] - Right bound value
    @returns {Number} - root
*/
Polynomial.newton_secant_bisection = function (x0, f, df, max_iterations, min, max) {
    var x, prev_dfx = 0, dfx, prev_x_ef_correction = 0, x_correction, x_new;
    var v, y_atmin, y_atmax;
    x = x0;
    var ACCURACY = 14;
    var min_correction_factor = Math.pow(10, -ACCURACY);
    var isBounded = (typeof min === 'number' && typeof max === 'number');
    if (isBounded) {
        if (min > max)
            throw new Error("newton root finding: min must be greater than max");
        y_atmin = f(min);
        y_atmax = f(max);
        if (sign(y_atmin) ==  sign(y_atmax))
            throw new Error("newton root finding: y values of bounds must be of opposite sign");
    }

    var isEnoughCorrection = function () {
        // stop if correction is too small
        // or if correction is in simple loop
        return (Math.abs(x_correction) <= min_correction_factor * Math.abs(x))
            || (prev_x_ef_correction == (x - x_correction) - x);
    };

    var i;
    //var stepMethod;
    //var details = [];
    for (i = 0; i < max_iterations; i++) {
        dfx = df(x);
        if (dfx == 0) {
            if (prev_dfx == 0) {
                // error
                throw new Error("newton root finding: df(x) is zero");
                //return null;
            }
            else {
                // use previous derivation value
                dfx = prev_dfx;
            }
            // or move x a little?
            //dfx = df(x != 0 ? x + x * 1e-15 : 1e-15);
        }
        //stepMethod = 'newton';
        prev_dfx = dfx;
        y = f(x);
        x_correction = y / dfx;
        x_new = x - x_correction;
        if (isEnoughCorrection()) {
            break;
        }

        if (isBounded) {
            if (sign(y) == sign(y_atmax)) {
                max = x;
                y_atmax = y;
            }
            else if (sign(y) == sign(y_atmin)) {
                min = x;
                y_atmin = y;
            }
            else {
                x = x_new;
                //console.log("newton root finding: sign(y) not matched.");
                break;
            }

            if ((x_new < min) || (x_new > max)) {
                if (sign(y_atmin) == sign(y_atmax)) {
                    break;
                }

                var RATIO_LIMIT = 50;
                var AIMED_BISECT_OFFSET = 0.25; // [0, 0.5)
                var dy = y_atmax - y_atmin;
                var dx = max - min;

                if (dy == 0) {
                    //stepMethod = 'bisect';
                    x_correction = x - (min + dx * 0.5);
                }
                else if (Math.abs(dy / Math.min(y_atmin, y_atmax)) > RATIO_LIMIT) {
                    //stepMethod = 'aimed bisect';
                    x_correction = x - (min + dx * (0.5 + (Math.abs(y_atmin) < Math.abs(y_atmax) ? -AIMED_BISECT_OFFSET : AIMED_BISECT_OFFSET)));
                }
                else {
                    //stepMethod = 'secant'; 
                    x_correction = x - (min - y_atmin / dy * dx);
                }
                x_new = x - x_correction;

                if (isEnoughCorrection()) {
                    break;
                }
            }
        }
        //details.push([stepMethod, i, x, x_new, x_correction, min, max, y]);
        prev_x_ef_correction = x - x_new;
        x = x_new;
    }
    //details.push([stepMethod, i, x, x_new, x_correction, min, max, y]);
    //console.log(details.join('\r\n'));
    //if (i == max_iterations)
    //    console.log('newt: steps=' + ((i==max_iterations)? i:(i + 1)));
    return x;
};

if (typeof module !== "undefined") {
    module.exports = Polynomial;
}

},{}],9:[function(require,module,exports){
/**
 *
 *   SqrtPolynomial.js
 *
 *   copyright 2003, 2013 Kevin Lindsey
 *
 */

if (typeof module !== "undefined") {
    var Polynomial = require("./Polynomial");
}

/**
 *   class variables
 */
SqrtPolynomial.VERSION = 1.0;

// setup inheritance
SqrtPolynomial.prototype             = new Polynomial();
SqrtPolynomial.prototype.constructor = SqrtPolynomial;
SqrtPolynomial.superclass            = Polynomial.prototype;


/**
 *  SqrtPolynomial
 */
function SqrtPolynomial() {
    this.init( arguments );
}


/**
 *  eval
 *
 *  @param {Number} x
 *  @returns {Number}
 */
SqrtPolynomial.prototype.eval = function(x) {
    var TOLERANCE = 1e-7;
    var result = SqrtPolynomial.superclass.eval.call(this, x);

    // NOTE: May need to change the following.  I added these to capture
    // some really small negative values that were being generated by one
    // of my Bezier arcLength functions
    if ( Math.abs(result) < TOLERANCE ) result = 0;
    if ( result < 0 )
        throw new Error("SqrtPolynomial.eval: cannot take square root of negative number");

    return Math.sqrt(result);
};

SqrtPolynomial.prototype.toString = function() {
    var result = SqrtPolynomial.superclass.toString.call(this);

    return "sqrt(" + result + ")";
};

if (typeof module !== "undefined") {
    module.exports = SqrtPolynomial;
}

},{"./Polynomial":8}],10:[function(require,module,exports){
// expose module classes

exports.intersect = require('./lib/intersect');
exports.shape = require('./lib/IntersectionParams').newShape;
},{"./lib/IntersectionParams":12,"./lib/intersect":14}],11:[function(require,module,exports){
/**
 *  Intersection
 */
function Intersection(status) {
    this.init(status);
}

/**
 *  init
 *
 *  @param {String} status
 *  @returns {Intersection}
 */
Intersection.prototype.init = function(status) {
    this.status = status;
    this.points = [];
};

/**
 *  appendPoint
 *
 *  @param {Point2D} point
 */
Intersection.prototype.appendPoint = function(point) {
    this.points.push(point);
};

/**
 *  appendPoints
 *
 *  @param {Array<Point2D>} points
 */
Intersection.prototype.appendPoints = function(points) {
    this.points = this.points.concat(points);
};

module.exports = Intersection;

},{}],12:[function(require,module,exports){
var Point2D = require('kld-affine').Point2D;


/**
    getArcParameters

    @param {Point2D} startPoint
    @param {Point2D} endPoint
    @param {Number} rx
    @param {Number} ry
    @param {Number} angle - in degrees
    @param {Boolean} arcFlag
    @param {Boolean} sweepFlag
    @returns {{ center: Point2D, rx: Number, ry: Number, theta1: Number, deltaTheta: Number }}
*/
function getArcParameters(startPoint, endPoint, rx, ry, angle, arcFlag, sweepFlag) {
    function radian(ux, uy, vx, vy) {
        var dot = ux * vx + uy * vy;
        var mod = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
        var rad = Math.acos(dot / mod);
        if (ux * vy - uy * vx < 0.0) rad = -rad;
        return rad;
    }
    angle = angle * Math.PI / 180;
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    var TOLERANCE = 1e-6;
    var halfDiff = startPoint.subtract(endPoint).divide(2);
    var x1p = halfDiff.x * c + halfDiff.y * s;
    var y1p = halfDiff.x * -s + halfDiff.y * c;
    var x1px1p = x1p * x1p;
    var y1py1p = y1p * y1p;
    var lambda = (x1px1p / (rx * rx)) + (y1py1p / (ry * ry));
    var factor;
    if (lambda > 1) {
        factor = Math.sqrt(lambda);
        rx *= factor;
        ry *= factor;
    }
    var rxrx = rx * rx;
    var ryry = ry * ry;
    var rxy1 = rxrx * y1py1p;
    var ryx1 = ryry * x1px1p;
    factor = (rxrx * ryry - rxy1 - ryx1) / (rxy1 + ryx1);
    if (Math.abs(factor) < TOLERANCE) factor = 0;
    var sq = Math.sqrt(factor);
    if (arcFlag == sweepFlag) sq = -sq;
    var mid = startPoint.add(endPoint).divide(2);
    var cxp = sq * rx * y1p / ry;
    var cyp = sq * -ry * x1p / rx;
    //return new Point2D(cxp * c - cyp * s + mid.x, cxp * s + cyp * c + mid.y);

    var xcr1 = (x1p - cxp) / rx;
    var xcr2 = (x1p + cxp) / rx;
    var ycr1 = (y1p - cyp) / ry;
    var ycr2 = (y1p + cyp) / ry;

    var theta1 = radian(1.0, 0.0, xcr1, ycr1);

    var deltaTheta = radian(xcr1, ycr1, -xcr2, -ycr2);
    var PIx2 = Math.PI * 2.0;
    while (deltaTheta > PIx2) deltaTheta -= PIx2;
    while (deltaTheta < 0.0) deltaTheta += PIx2;
    if (sweepFlag == false) deltaTheta -= PIx2;

    return {
        center: new Point2D(cxp * c - cyp * s + mid.x, cxp * s + cyp * c + mid.y),
        rx: rx,
        ry: ry,
        theta1: theta1,
        deltaTheta: deltaTheta
    };
}


/**
 *  IntersectionParams
 *
 *  @param {String} name
 *  @param {Array<Point2D} params
 *  @returns {IntersectionParams}
 */
function IntersectionParams(name, params) {
    this.init(name, params);
}

/**
 *  init
 *
 *  @param {String} type
 *  @param {Array<Point2D>} params
 */
IntersectionParams.prototype.init = function (type, params) {
    this.type = type;
    this.params = params;
    this.meta = {};
};

IntersectionParams.TYPE = {};
var IPTYPE = IntersectionParams.TYPE;
IPTYPE.LINE = 'Line';
IPTYPE.RECT = 'Rectangle';
IPTYPE.ROUNDRECT = 'RoundRectangle';
IPTYPE.CIRCLE = 'Circle';
IPTYPE.ELLIPSE = 'Ellipse';
IPTYPE.POLYGON = 'Polygon';
IPTYPE.POLYLINE = 'Polyline';
IPTYPE.PATH = 'Path';
IPTYPE.ARC = 'Arc';
IPTYPE.BEZIER2 = 'Bezier2';
IPTYPE.BEZIER3 = 'Bezier3';


function parsePointsString(points) {
    return points.split(" ").map(function(point) {
        point = point.split(",");
        return new Point2D(point[0], point[1]);
    });
}

IntersectionParams.newShape = function(svgElementName, props) {
    svgElementName = svgElementName.toLowerCase();

    if(svgElementName === "line") {
        return IntersectionParams.newLine(
            new Point2D(props.x1, props.y1),
            new Point2D(props.x2, props.y2)
        );
    }

    if(svgElementName === "rect") {
        if(props.rx > 0 || props.ry > 0) {
            return IntersectionParams.newRoundRect(
                props.x, props.y,
                props.width, props.height,
                props.rx, props.ry
            );
        } else {
            return IntersectionParams.newRect(
                props.x, props.y,
                props.width, props.height
            );
        }
    }

    if(svgElementName === "circle") {
        return IntersectionParams.newCircle(
            new Point2D(props.cx, props.cy),
            props.r
        );
    }

    if(svgElementName === "ellipse") {
        return IntersectionParams.newEllipse(
            new Point2D(props.cx, props.cy),
            props.rx, props.ry
        );
    }

    if(svgElementName === "polygon") {
        return IntersectionParams.newPolygon(
            parsePointsString(props.points)
        );
    }

    if(svgElementName === "polyline") {
        return IntersectionParams.newPolyline(
            parsePointsString(props.points)
        );
    }

    if(svgElementName === "path") {
        return IntersectionParams.newPath(
            props.d
        );
    }

}


///////////////////////////////////////////////////////////////////
/**
    Creates IntersectionParams for arc.

    @param {Point2D} startPoint - arc start point
    @param {Point2D} endPoint - arc end point
    @param {Number} rx - arc ellipse x radius
    @param {Number} ry - arc ellipse y radius
    @param {Number} angle - arc ellipse rotation in degrees
    @param {Boolean} largeArcFlag
    @param {Boolean} sweepFlag
    @returns {IntersectionParams}
*/
IntersectionParams.newArc = function (startPoint, endPoint, rx, ry, angle, largeArcFlag, sweepFlag) {
    var p = getArcParameters(startPoint, endPoint, rx, ry, angle, largeArcFlag, sweepFlag);
    return new IntersectionParams(IPTYPE.ARC, [p.center, p.rx, p.ry, (angle * Math.PI / 180), p.theta1, p.deltaTheta]);
};

///////////////////////////////////////////////////////////////////
/**
    Creates IntersectionParams for bezier2.

    @param {Point2D} p1
    @param {Point2D} p2
    @param {Point2D} p3
    @returns {IntersectionParams}
*/
IntersectionParams.newBezier2 = function (p1, p2, p3) {
    return new IntersectionParams(IPTYPE.BEZIER2, [p1, p2, p3]);
};

///////////////////////////////////////////////////////////////////
/**
    Creates IntersectionParams for bezier3.

    @param {Point2D} p1
    @param {Point2D} p2
    @param {Point2D} p3
    @param {Point2D} p4
    @returns {IntersectionParams}
*/
IntersectionParams.newBezier3 = function (p1, p2, p3, p4) {
    return new IntersectionParams(IPTYPE.BEZIER3, [p1, p2, p3, p4]);
};

///////////////////////////////////////////////////////////////////
/**
    Creates IntersectionParams for circle.

    @param {Point2D} c
    @param {Number} r
    @returns {IntersectionParams}
*/
IntersectionParams.newCircle = function (c, r) {
    return new IntersectionParams(IPTYPE.CIRCLE, [c, r]);
};

///////////////////////////////////////////////////////////////////
/**
    Creates IntersectionParams for ellipse.

    @param {Point2D} c
    @param {Number} rx
    @param {Number} ry
    @returns {IntersectionParams}
*/
IntersectionParams.newEllipse = function (c, rx, ry) {
    return new IntersectionParams(IPTYPE.ELLIPSE, [c, rx, ry]);
};

///////////////////////////////////////////////////////////////////
/**
    Creates IntersectionParams for line.

    @param {Point2D} a1
    @param {Point2D} a2
    @returns {IntersectionParams}
*/
IntersectionParams.newLine = function (a1, a2) {
    return new IntersectionParams(IPTYPE.LINE, [a1, a2]);
};

///////////////////////////////////////////////////////////////////
/**
    Creates IntersectionParams for polygon.

    @param {Array<Point2D>} points
    @returns {IntersectionParams}
*/
IntersectionParams.newPolygon = function (points) {
    return new IntersectionParams(IPTYPE.POLYGON, [points]);
};

///////////////////////////////////////////////////////////////////
/**
    Creates IntersectionParams for polyline.

     @param {Array<Point2D>} points
    @returns {IntersectionParams}
*/
IntersectionParams.newPolyline = function (points) {
    return new IntersectionParams(IPTYPE.POLYLINE, [points]);
};


///////////////////////////////////////////////////////////////////
/**
    Creates IntersectionParams for rectangle.

    @param {Number} x
    @param {Number} y
    @param {Number} width
    @param {Number} height
    @returns {IntersectionParams}
*/
IntersectionParams.newRect = function (x, y, width, height) {
    var points = [];
    points.push(new Point2D(x, y));
    points.push(new Point2D(x + width, y));
    points.push(new Point2D(x + width, y + height));
    points.push(new Point2D(x, y + height));
    return new IntersectionParams(IPTYPE.RECT, [points]);
};

var degreesToRadians = function (angle) {
    return angle * Math.PI / 180;
};
///////////////////////////////////////////////////////////////////
/**
    Creates IntersectionParams for round rectangle, or for rectangle if rx and ry are 0.

    @param {Number} x
    @param {Number} y
    @param {Number} width
    @param {Number} height
    @param {Number} rx
    @param {Number} ry
    @returns {IntersectionParams}
*/
IntersectionParams.newRoundRect = function (x, y, width, height, rx, ry) {
    if (rx === 0 && ry === 0)
        return IntersectionParams.newRect(x, y, width, height);
    if (rx === 0)
        rx = ry;
    if (ry === 0)
        ry = rx;
    if (rx > width / 2)
        rx = width / 2;
    if (ry > height / 2)
        rx = height / 2;
    var shape = [];
    var x0 = x, x1 = x + rx, x2 = x + width - rx, x3 = x + width;
    var y0 = y, y1 = y + ry, y2 = y + height - ry, y3 = y + height;
    shape.push(new IntersectionParams(IPTYPE.ARC, [new Point2D(x1, y1), rx, ry, 0, degreesToRadians(180), degreesToRadians(90)]));
    shape.push(new IntersectionParams(IPTYPE.LINE, [new Point2D(x1, y0), new Point2D(x2, y0)]));
    shape.push(new IntersectionParams(IPTYPE.ARC, [new Point2D(x2, y1), rx, ry, 0, degreesToRadians(-90), degreesToRadians(90)]));
    shape.push(new IntersectionParams(IPTYPE.LINE, [new Point2D(x3, y1), new Point2D(x3, y2)]));
    shape.push(new IntersectionParams(IPTYPE.ARC, [new Point2D(x2, y2), rx, ry, 0, degreesToRadians(0), degreesToRadians(90)]));
    shape.push(new IntersectionParams(IPTYPE.LINE, [new Point2D(x2, y3), new Point2D(x1, y3)]));
    shape.push(new IntersectionParams(IPTYPE.ARC, [new Point2D(x1, y2), rx, ry, 0, degreesToRadians(90), degreesToRadians(90)]));
    shape.push(new IntersectionParams(IPTYPE.LINE, [new Point2D(x0, y2), new Point2D(x0, y1)]));
    shape[shape.length - 1].meta.closePath = true;
    return new IntersectionParams(IPTYPE.ROUNDRECT, [shape]);
};




function Token(type, text) {
    if (arguments.length > 0) {
        this.init(type, text);
    }
}
Token.prototype.init = function(type, text) {
    this.type = type;
    this.text = text;
};
Token.prototype.typeis = function(type) {
    return this.type == type;
}
var Path = {};
Path.COMMAND = 0;
Path.NUMBER = 1;
Path.EOD = 2;
Path.PARAMS = {
    A: ["rx", "ry", "x-axis-rotation", "large-arc-flag", "sweep-flag", "x", "y"],
    a: ["rx", "ry", "x-axis-rotation", "large-arc-flag", "sweep-flag", "x", "y"],
    C: ["x1", "y1", "x2", "y2", "x", "y"],
    c: ["x1", "y1", "x2", "y2", "x", "y"],
    H: ["x"],
    h: ["x"],
    L: ["x", "y"],
    l: ["x", "y"],
    M: ["x", "y"],
    m: ["x", "y"],
    Q: ["x1", "y1", "x", "y"],
    q: ["x1", "y1", "x", "y"],
    S: ["x2", "y2", "x", "y"],
    s: ["x2", "y2", "x", "y"],
    T: ["x", "y"],
    t: ["x", "y"],
    V: ["y"],
    v: ["y"],
    Z: [],
    z: []
};

function tokenize(d) {
    var tokens = new Array();
    while (d != "") {
        if (d.match(/^([ \t\r\n,]+)/)) {
            d = d.substr(RegExp.$1.length);
        } else if (d.match(/^([aAcChHlLmMqQsStTvVzZ])/)) {
            tokens[tokens.length] = new Token(Path.COMMAND, RegExp.$1);
            d = d.substr(RegExp.$1.length);
        } else if (d.match(/^(([-+]?[0-9]+(\.[0-9]*)?|[-+]?\.[0-9]+)([eE][-+]?[0-9]+)?)/)) {
            tokens[tokens.length] = new Token(Path.NUMBER, parseFloat(RegExp.$1));
            d = d.substr(RegExp.$1.length);
        } else {
            throw new Error("Unrecognized segment command: " + d);
        }
    }
    tokens[tokens.length] = new Token(Path.EOD, null);
    return tokens;
}

IntersectionParams.newPath = function(d) {
    var tokens = tokenize(d);
    var index = 0;
    var token = tokens[index];
    var mode = "BOD";
    var segments = [];

    while (!token.typeis(Path.EOD)) {
        var param_length;
        var params = new Array();
        if (mode == "BOD") {
            if (token.text == "M" || token.text == "m") {
                index++;
                param_length = Path.PARAMS[token.text].length;
                mode = token.text;
            } else {
                throw new Error("Path data must begin with a moveto command");
            }
        } else {
            if (token.typeis(Path.NUMBER)) {
                param_length = Path.PARAMS[mode].length;
            } else {
                index++;
                param_length = Path.PARAMS[token.text].length;
                mode = token.text;
            }
        }
        if ((index + param_length) < tokens.length) {
            for (var i = index; i < index + param_length; i++) {
                var number = tokens[i];
                if (number.typeis(Path.NUMBER)) params[params.length] = number.text;
                else throw new Error("Parameter type is not a number: " + mode + "," + number.text);
            }
            var segment;
            var length = segments.length;
            var previous = (length == 0) ? null : segments[length - 1];
            switch (mode) {
                case "A":
                    segment = new AbsoluteArcPath(params, previous);
                    break;
                case "C":
                    segment = new AbsoluteCurveto3(params, previous);
                    break;
                case "c":
                    segment = new RelativeCurveto3(params, previous);
                    break;
                case "H":
                    segment = new AbsoluteHLineto(params, previous);
                    break;
                case "V":
                    segment = new AbsoluteVLineto(params, previous);
                    break;
                case "L":
                    segment = new AbsoluteLineto(params, previous);
                    break;
                case "l":
                    segment = new RelativeLineto(params, previous);
                    break;
                case "M":
                    segment = new AbsoluteMoveto(params, previous);
                    break;
                case "m":
                    segment = new RelativeMoveto(params, previous);
                    break;
                case "Q":
                    segment = new AbsoluteCurveto2(params, previous);
                    break;
                case "q":
                    segment = new RelativeCurveto2(params, previous);
                    break;
                case "S":
                    segment = new AbsoluteSmoothCurveto3(params, previous);
                    break;
                case "s":
                    segment = new RelativeSmoothCurveto3(params, previous);
                    break;
                case "T":
                    segment = new AbsoluteSmoothCurveto2(params, previous);
                    break;
                case "t":
                    segment = new RelativeSmoothCurveto2(params, previous);
                    break;
                case "Z":
                    segment = new RelativeClosePath(params, previous);
                    break;
                case "z":
                    segment = new RelativeClosePath(params, previous);
                    break;
                default:
                    throw new Error("Unsupported segment type: " + mode);
            };
            segments.push(segment);
            index += param_length;
            token = tokens[index];
            if (mode == "M") mode = "L";
            if (mode == "m") mode = "l";
        } else {
            throw new Error("Path data ended before all parameters were found");
        }
    }

    var segmentParams = [];
    for(i=0; i<segments.length; i++) {
        var ip = segments[i].getIntersectionParams();
        if(ip) {
            segmentParams.push(ip);
        }
    }

    return new IntersectionParams(IPTYPE.PATH, [segmentParams]);
}


function AbsolutePathSegment(command, params, previous) {
    if (arguments.length > 0) this.init(command, params, previous);
};
AbsolutePathSegment.prototype.init = function(command, params, previous) {
    this.command = command;
    this.previous = previous;
    this.points = [];
    var index = 0;
    while (index < params.length) {
        this.points.push(new Point2D(params[index], params[index + 1]));
        index += 2;
    }
};
AbsolutePathSegment.prototype.getLastPoint = function() {
    return this.points[this.points.length - 1];
};
AbsolutePathSegment.prototype.getIntersectionParams = function() {
    return null;
};



function AbsoluteArcPath(params, previous) {
    if (arguments.length > 0) {
        this.init("A", params, previous);
    }
}
AbsoluteArcPath.prototype = new AbsolutePathSegment();
AbsoluteArcPath.prototype.constructor = AbsoluteCurveto2;
AbsoluteArcPath.superclass = AbsolutePathSegment.prototype;

AbsoluteArcPath.prototype.init = function(command, params, previous) {
    var point = new Array();
    var y = params.pop();
    var x = params.pop();
    point.push(x, y);
    AbsoluteArcPath.superclass.init.call(this, command, point, previous);
    this.rx = parseFloat(params.shift());
    this.ry = parseFloat(params.shift());
    this.angle = parseFloat(params.shift());
    this.arcFlag = parseFloat(params.shift());
    this.sweepFlag = parseFloat(params.shift());
};
AbsoluteArcPath.prototype.getIntersectionParams = function() {
    return IntersectionParams.newArc(this.previous.getLastPoint(),
                                     this.points[0],
                                     this.rx,
                                     this.ry,
                                     this.angle,
                                     this.arcFlag,
                                     this.sweepFlag);
};


function AbsoluteCurveto2(params, previous) {
    if (arguments.length > 0) {
        this.init("Q", params, previous);
    }
}
AbsoluteCurveto2.prototype = new AbsolutePathSegment();
AbsoluteCurveto2.prototype.constructor = AbsoluteCurveto2;
AbsoluteCurveto2.superclass = AbsolutePathSegment.prototype;

AbsoluteCurveto2.prototype.getIntersectionParams = function() {
    return IntersectionParams.newBezier2(this.previous.getLastPoint(), this.points[0], this.points[1]);
};



function AbsoluteCurveto3(params, previous) {
    if (arguments.length > 0) {
        this.init("C", params, previous);
    }
}
AbsoluteCurveto3.prototype = new AbsolutePathSegment();
AbsoluteCurveto3.prototype.constructor = AbsoluteCurveto3;
AbsoluteCurveto3.superclass = AbsolutePathSegment.prototype;

AbsoluteCurveto3.prototype.getLastControlPoint = function() {
    return this.points[1];
};
AbsoluteCurveto3.prototype.getIntersectionParams = function() {
    return IntersectionParams.newBezier3(this.previous.getLastPoint(), this.points[0], this.points[1], this.points[2]);
};


function AbsoluteHLineto(params, previous) {
    if (arguments.length > 0) {
        this.init("H", params, previous);
    }
}
AbsoluteHLineto.prototype = new AbsolutePathSegment();
AbsoluteHLineto.prototype.constructor = AbsoluteHLineto;
AbsoluteHLineto.superclass = AbsolutePathSegment.prototype;

AbsoluteHLineto.prototype.init = function(command, params, previous) {
    var prevPoint = previous.getLastPoint();
    var point = new Array();
    point.push(params.pop(), prevPoint.y);
    AbsoluteHLineto.superclass.init.call(this, command, point, previous);
};

function AbsoluteVLineto(params, previous) {
    if (arguments.length > 0) {
        this.init("V", params, previous);
    }
}
AbsoluteVLineto.prototype = new AbsolutePathSegment();
AbsoluteVLineto.prototype.constructor = AbsoluteVLineto;
AbsoluteVLineto.superclass = AbsolutePathSegment.prototype;

AbsoluteVLineto.prototype.init = function(command, params, previous) {
    var prevPoint = previous.getLastPoint();
    var point = new Array();
    point.push(prevPoint.x, params.pop());
    AbsoluteVLineto.superclass.init.call(this, command, point, previous);
};


function AbsoluteLineto(params, previous) {
    if (arguments.length > 0) {
        this.init("L", params, previous);
    }
}
AbsoluteLineto.prototype = new AbsolutePathSegment();
AbsoluteLineto.prototype.constructor = AbsoluteLineto;
AbsoluteLineto.superclass = AbsolutePathSegment.prototype;

AbsoluteLineto.prototype.getIntersectionParams = function() {
    return IntersectionParams.newLine(this.previous.getLastPoint(), this.points[0]);
};



function AbsoluteMoveto(params, previous) {
    if (arguments.length > 0) {
        this.init("M", params, previous);
    }
}
AbsoluteMoveto.prototype = new AbsolutePathSegment();
AbsoluteMoveto.prototype.constructor = AbsoluteMoveto;
AbsoluteMoveto.superclass = AbsolutePathSegment.prototype;


function AbsoluteSmoothCurveto2(params, previous) {
    if (arguments.length > 0) {
        this.init("T", params, previous);
    }
}
AbsoluteSmoothCurveto2.prototype = new AbsolutePathSegment();
AbsoluteSmoothCurveto2.prototype.constructor = AbsoluteSmoothCurveto2;
AbsoluteSmoothCurveto2.superclass = AbsolutePathSegment.prototype;

AbsoluteSmoothCurveto2.prototype.getControlPoint = function() {
    var lastPoint = this.previous.getLastPoint();
    var point;
    if (this.previous.command.match(/^[QqTt]$/)) {
        var ctrlPoint = this.previous.getControlPoint();
        var diff = ctrlPoint.subtract(lastPoint);
        point = lastPoint.subtract(diff);
    } else {
        point = lastPoint;
    }
    return point;
};
AbsoluteSmoothCurveto2.prototype.getIntersectionParams = function() {
    return IntersectionParams.newBezier2(this.previous.getLastPoint(), this.getControlPoint(), this.points[0]);
};


function AbsoluteSmoothCurveto3(params, previous) {
    if (arguments.length > 0) {
        this.init("S", params, previous);
    }
}
AbsoluteSmoothCurveto3.prototype = new AbsolutePathSegment();
AbsoluteSmoothCurveto3.prototype.constructor = AbsoluteSmoothCurveto3;
AbsoluteSmoothCurveto3.superclass = AbsolutePathSegment.prototype;

AbsoluteSmoothCurveto3.prototype.getFirstControlPoint = function() {
    var lastPoint = this.previous.getLastPoint();
    var point;
    if (this.previous.command.match(/^[SsCc]$/)) {
        var lastControl = this.previous.getLastControlPoint();
        var diff = lastControl.subtract(lastPoint);
        point = lastPoint.subtract(diff);
    } else {
        point = lastPoint;
    }
    return point;
};
AbsoluteSmoothCurveto3.prototype.getLastControlPoint = function() {
    return this.points[0];
};
AbsoluteSmoothCurveto3.prototype.getIntersectionParams = function() {
    return IntersectionParams.newBezier3(this.previous.getLastPoint(), this.getFirstControlPoint(), this.points[0], this.points[1]);
};


function RelativePathSegment(command, params, previous) {
    if (arguments.length > 0) this.init(command, params, previous);
}
RelativePathSegment.prototype = new AbsolutePathSegment();
RelativePathSegment.prototype.constructor = RelativePathSegment;
RelativePathSegment.superclass = AbsolutePathSegment.prototype;

RelativePathSegment.prototype.init = function(command, params, previous) {
    this.command = command;
    this.previous = previous;
    this.points = [];
    var lastPoint;
    if (this.previous) lastPoint = this.previous.getLastPoint();
    else lastPoint = new Point2D(0, 0);
    var index = 0;
    while (index < params.length) {
        var point = new Point2D(lastPoint.x + params[index], lastPoint.y + params[index + 1]);
        this.points.push(point);
        index += 2;
    }
};

function RelativeClosePath(params, previous) {
    if (arguments.length > 0) {
        this.init("z", params, previous);
    }
}
RelativeClosePath.prototype = new RelativePathSegment();
RelativeClosePath.prototype.constructor = RelativeClosePath;
RelativeClosePath.superclass = RelativePathSegment.prototype;
RelativeClosePath.prototype.getLastPoint = function() {
    var current = this.previous;
    var point;
    while (current) {
        if (current.command.match(/^[mMzZ]$/)) {
            point = current.getLastPoint();
            break;
        }
        current = current.previous;
    }
    return point;
};
RelativeClosePath.prototype.getIntersectionParams = function() {
    return IntersectionParams.newLine(this.previous.getLastPoint(), this.getLastPoint());
};


function RelativeCurveto2(params, previous) {
    if (arguments.length > 0) {
        this.init("q", params, previous);
    }
}
RelativeCurveto2.prototype = new RelativePathSegment();
RelativeCurveto2.prototype.constructor = RelativeCurveto2;
RelativeCurveto2.superclass = RelativePathSegment.prototype;

RelativeCurveto2.prototype.getControlPoint = function() {
    return this.points[0];
};
RelativeCurveto2.prototype.getIntersectionParams = function() {
    return IntersectionParams.newBezier2(this.previous.getLastPoint(), this.points[0], this.points[1]);
};


function RelativeCurveto3(params, previous) {
    if (arguments.length > 0) {
        this.init("c", params, previous);
    }
}
RelativeCurveto3.prototype = new RelativePathSegment();
RelativeCurveto3.prototype.constructor = RelativeCurveto3;
RelativeCurveto3.superclass = RelativePathSegment.prototype;

RelativeCurveto3.prototype.getLastControlPoint = function() {
    return this.points[1];
};
RelativeCurveto3.prototype.getIntersectionParams = function() {
    return IntersectionParams.newBezier3(this.previous.getLastPoint(), this.points[0], this.points[1], this.points[2]);
};


function RelativeLineto(params, previous) {
    if (arguments.length > 0) {
        this.init("l", params, previous);
    }
}
RelativeLineto.prototype = new RelativePathSegment();
RelativeLineto.prototype.constructor = RelativeLineto;
RelativeLineto.superclass = RelativePathSegment.prototype;

RelativeLineto.prototype.toString = function() {
    var points = new Array();
    var command = "";
    var lastPoint;
    var point;
    if (this.previous) lastPoint = this.previous.getLastPoint();
    else lastPoint = new Point(0, 0);
    point = this.points[0].subtract(lastPoint);
    if (this.previous.constructor != this.constuctor)
        if (this.previous.constructor != RelativeMoveto) cmd = this.command;
    return cmd + point.toString();
};
RelativeLineto.prototype.getIntersectionParams = function() {
    return IntersectionParams.newLine(this.previous.getLastPoint(), this.points[0]);
};



function RelativeMoveto(params, previous) {
    if (arguments.length > 0) {
        this.init("m", params, previous);
    }
}
RelativeMoveto.prototype = new RelativePathSegment();
RelativeMoveto.prototype.constructor = RelativeMoveto;
RelativeMoveto.superclass = RelativePathSegment.prototype;



function RelativeSmoothCurveto2(params, previous) {
    if (arguments.length > 0) {
        this.init("t", params, previous);
    }
}
RelativeSmoothCurveto2.prototype = new RelativePathSegment();
RelativeSmoothCurveto2.prototype.constructor = RelativeSmoothCurveto2;
RelativeSmoothCurveto2.superclass = RelativePathSegment.prototype;

RelativeSmoothCurveto2.prototype.getControlPoint = function() {
    var lastPoint = this.previous.getLastPoint();
    var point;
    if (this.previous.command.match(/^[QqTt]$/)) {
        var ctrlPoint = this.previous.getControlPoint();
        var diff = ctrlPoint.subtract(lastPoint);
        point = lastPoint.subtract(diff);
    } else {
        point = lastPoint;
    }
    return point;
};
RelativeSmoothCurveto2.prototype.getIntersectionParams = function() {
    return IntersectionParams.newBezier2(this.previous.getLastPoint(), this.getControlPoint(), this.points[0]);
};



function RelativeSmoothCurveto3(params, previous) {
    if (arguments.length > 0) {
        this.init("s", params, previous);
    }
}
RelativeSmoothCurveto3.prototype = new RelativePathSegment();
RelativeSmoothCurveto3.prototype.constructor = RelativeSmoothCurveto3;
RelativeSmoothCurveto3.superclass = RelativePathSegment.prototype;

RelativeSmoothCurveto3.prototype.getFirstControlPoint = function() {
    var lastPoint = this.previous.getLastPoint();
    var point;
    if (this.previous.command.match(/^[SsCc]$/)) {
        var lastControl = this.previous.getLastControlPoint();
        var diff = lastControl.subtract(lastPoint);
        point = lastPoint.subtract(diff);
    } else {
        point = lastPoint;
    }
    return point;
};
RelativeSmoothCurveto3.prototype.getLastControlPoint = function() {
    return this.points[0];
};
RelativeSmoothCurveto3.prototype.getIntersectionParams = function() {
    return IntersectionParams.newBezier3(this.previous.getLastPoint(), this.getFirstControlPoint(), this.points[0], this.points[1]);
};


module.exports = IntersectionParams;

},{"kld-affine":3}],13:[function(require,module,exports){
var Intersection = require('../Intersection');

var affine = require('kld-affine');
var Point2D = affine.Point2D;
var Vector2D = affine.Vector2D;

var Polynomial = require('kld-polynomial').Polynomial;

function removeMultipleRootsIn01(roots) {
    var ZEROepsilon = 1e-15;
    roots.sort(function (a, b) { return a - b; });
    for (var i = 1; i < roots.length;) {
        if (Math.abs(roots[i] - roots[i - 1]) < ZEROepsilon) {
            roots.splice(i, 1);
        }
        else {
            i++;
        }
    }
}

module.exports = {};

/**
 *  intersectBezier2Bezier2
 *
 *  @param {Point2D} a1
 *  @param {Point2D} a2
 *  @param {Point2D} a3
 *  @param {Point2D} b1
 *  @param {Point2D} b2
 *  @param {Point2D} b3
 *  @returns {Intersection}
 */
module.exports.intersectBezier2Bezier2 = function(a1, a2, a3, b1, b2, b3) {
    var a, b;
    var c12, c11, c10;
    var c22, c21, c20;
    var result = new Intersection();
    var poly;

    a = a2.multiply(-2);
    c12 = a1.add(a.add(a3));

    a = a1.multiply(-2);
    b = a2.multiply(2);
    c11 = a.add(b);

    c10 = new Point2D(a1.x, a1.y);

    a = b2.multiply(-2);
    c22 = b1.add(a.add(b3));

    a = b1.multiply(-2);
    b = b2.multiply(2);
    c21 = a.add(b);

    c20 = new Point2D(b1.x, b1.y);

    var v0, v1, v2, v3, v4, v5, v6;
    if ( c12.y === 0 ) {
        v0 = c12.x*(c10.y - c20.y);
        v1 = v0 - c11.x*c11.y;
        v2 = v0 + v1;
        v3 = c11.y*c11.y;

        poly = new Polynomial(
            c12.x*c22.y*c22.y,
            2*c12.x*c21.y*c22.y,
            c12.x*c21.y*c21.y - c22.x*v3 - c22.y*v0 - c22.y*v1,
            -c21.x*v3 - c21.y*v0 - c21.y*v1,
            (c10.x - c20.x)*v3 + (c10.y - c20.y)*v1
        );
    } else {
        v0 = c12.x*c22.y - c12.y*c22.x;
        v1 = c12.x*c21.y - c21.x*c12.y;
        v2 = c11.x*c12.y - c11.y*c12.x;
        v3 = c10.y - c20.y;
        v4 = c12.y*(c10.x - c20.x) - c12.x*v3;
        v5 = -c11.y*v2 + c12.y*v4;
        v6 = v2*v2;

        poly = new Polynomial(
            v0*v0,
            2*v0*v1,
            (-c22.y*v6 + c12.y*v1*v1 + c12.y*v0*v4 + v0*v5) / c12.y,
            (-c21.y*v6 + c12.y*v1*v4 + v1*v5) / c12.y,
            (v3*v6 + v4*v5) / c12.y
        );
    }

    var roots = poly.getRoots();
    for ( var i = 0; i < roots.length; i++ ) {
        var s = roots[i];

        if ( 0 <= s && s <= 1 ) {
            var xRoots = new Polynomial(
                c12.x,
                c11.x,
                c10.x - c20.x - s*c21.x - s*s*c22.x
            ).getRoots();
            var yRoots = new Polynomial(
                c12.y,
                c11.y,
                c10.y - c20.y - s*c21.y - s*s*c22.y
            ).getRoots();

            if ( xRoots.length > 0 && yRoots.length > 0 ) {
                var TOLERANCE = 1e-4;

                checkRoots:
                    for ( var j = 0; j < xRoots.length; j++ ) {
                        var xRoot = xRoots[j];

                        if ( 0 <= xRoot && xRoot <= 1 ) {
                            for ( var k = 0; k < yRoots.length; k++ ) {
                                if ( Math.abs( xRoot - yRoots[k] ) < TOLERANCE ) {
                                    result.points.push( c22.multiply(s*s).add(c21.multiply(s).add(c20)) );
                                    break checkRoots;
                                }
                            }
                        }
                    }
            }
        }
    }

    return result;
};


/**
 *  intersectBezier2Bezier3
 *
 *  @param {Point2D} a1
 *  @param {Point2D} a2
 *  @param {Point2D} a3
 *  @param {Point2D} b1
 *  @param {Point2D} b2
 *  @param {Point2D} b3
 *  @param {Point2D} b4
 *  @returns {Intersection}
 */
module.exports.intersectBezier2Bezier3 = function(a1, a2, a3, b1, b2, b3, b4) {
    var a, b,c, d;
    var c12, c11, c10;
    var c23, c22, c21, c20;
    var result = new Intersection();

    a = a2.multiply(-2);
    c12 = a1.add(a.add(a3));

    a = a1.multiply(-2);
    b = a2.multiply(2);
    c11 = a.add(b);

    c10 = new Point2D(a1.x, a1.y);

    a = b1.multiply(-1);
    b = b2.multiply(3);
    c = b3.multiply(-3);
    d = a.add(b.add(c.add(b4)));
    c23 = new Vector2D(d.x, d.y);

    a = b1.multiply(3);
    b = b2.multiply(-6);
    c = b3.multiply(3);
    d = a.add(b.add(c));
    c22 = new Vector2D(d.x, d.y);

    a = b1.multiply(-3);
    b = b2.multiply(3);
    c = a.add(b);
    c21 = new Vector2D(c.x, c.y);

    c20 = new Vector2D(b1.x, b1.y);

    var c10x2 = c10.x*c10.x;
    var c10y2 = c10.y*c10.y;
    var c11x2 = c11.x*c11.x;
    var c11y2 = c11.y*c11.y;
    var c12x2 = c12.x*c12.x;
    var c12y2 = c12.y*c12.y;
    var c20x2 = c20.x*c20.x;
    var c20y2 = c20.y*c20.y;
    var c21x2 = c21.x*c21.x;
    var c21y2 = c21.y*c21.y;
    var c22x2 = c22.x*c22.x;
    var c22y2 = c22.y*c22.y;
    var c23x2 = c23.x*c23.x;
    var c23y2 = c23.y*c23.y;

    var poly = new Polynomial(
        -2*c12.x*c12.y*c23.x*c23.y + c12x2*c23y2 + c12y2*c23x2,
        -2*c12.x*c12.y*c22.x*c23.y - 2*c12.x*c12.y*c22.y*c23.x + 2*c12y2*c22.x*c23.x +
            2*c12x2*c22.y*c23.y,
        -2*c12.x*c21.x*c12.y*c23.y - 2*c12.x*c12.y*c21.y*c23.x - 2*c12.x*c12.y*c22.x*c22.y +
            2*c21.x*c12y2*c23.x + c12y2*c22x2 + c12x2*(2*c21.y*c23.y + c22y2),
        2*c10.x*c12.x*c12.y*c23.y + 2*c10.y*c12.x*c12.y*c23.x + c11.x*c11.y*c12.x*c23.y +
            c11.x*c11.y*c12.y*c23.x - 2*c20.x*c12.x*c12.y*c23.y - 2*c12.x*c20.y*c12.y*c23.x -
            2*c12.x*c21.x*c12.y*c22.y - 2*c12.x*c12.y*c21.y*c22.x - 2*c10.x*c12y2*c23.x -
            2*c10.y*c12x2*c23.y + 2*c20.x*c12y2*c23.x + 2*c21.x*c12y2*c22.x -
            c11y2*c12.x*c23.x - c11x2*c12.y*c23.y + c12x2*(2*c20.y*c23.y + 2*c21.y*c22.y),
        2*c10.x*c12.x*c12.y*c22.y + 2*c10.y*c12.x*c12.y*c22.x + c11.x*c11.y*c12.x*c22.y +
            c11.x*c11.y*c12.y*c22.x - 2*c20.x*c12.x*c12.y*c22.y - 2*c12.x*c20.y*c12.y*c22.x -
            2*c12.x*c21.x*c12.y*c21.y - 2*c10.x*c12y2*c22.x - 2*c10.y*c12x2*c22.y +
            2*c20.x*c12y2*c22.x - c11y2*c12.x*c22.x - c11x2*c12.y*c22.y + c21x2*c12y2 +
            c12x2*(2*c20.y*c22.y + c21y2),
        2*c10.x*c12.x*c12.y*c21.y + 2*c10.y*c12.x*c21.x*c12.y + c11.x*c11.y*c12.x*c21.y +
            c11.x*c11.y*c21.x*c12.y - 2*c20.x*c12.x*c12.y*c21.y - 2*c12.x*c20.y*c21.x*c12.y -
            2*c10.x*c21.x*c12y2 - 2*c10.y*c12x2*c21.y + 2*c20.x*c21.x*c12y2 -
            c11y2*c12.x*c21.x - c11x2*c12.y*c21.y + 2*c12x2*c20.y*c21.y,
        -2*c10.x*c10.y*c12.x*c12.y - c10.x*c11.x*c11.y*c12.y - c10.y*c11.x*c11.y*c12.x +
            2*c10.x*c12.x*c20.y*c12.y + 2*c10.y*c20.x*c12.x*c12.y + c11.x*c20.x*c11.y*c12.y +
            c11.x*c11.y*c12.x*c20.y - 2*c20.x*c12.x*c20.y*c12.y - 2*c10.x*c20.x*c12y2 +
            c10.x*c11y2*c12.x + c10.y*c11x2*c12.y - 2*c10.y*c12x2*c20.y -
            c20.x*c11y2*c12.x - c11x2*c20.y*c12.y + c10x2*c12y2 + c10y2*c12x2 +
            c20x2*c12y2 + c12x2*c20y2
    );
    var roots = poly.getRootsInInterval(0,1);
    removeMultipleRootsIn01(roots);

    for ( var i = 0; i < roots.length; i++ ) {
        var s = roots[i];
        var xRoots = new Polynomial(
            c12.x,
            c11.x,
            c10.x - c20.x - s*c21.x - s*s*c22.x - s*s*s*c23.x
        ).getRoots();
        var yRoots = new Polynomial(
            c12.y,
            c11.y,
            c10.y - c20.y - s*c21.y - s*s*c22.y - s*s*s*c23.y
        ).getRoots();

        if ( xRoots.length > 0 && yRoots.length > 0 ) {
            var TOLERANCE = 1e-4;

            checkRoots:
                for ( var j = 0; j < xRoots.length; j++ ) {
                    var xRoot = xRoots[j];

                    if ( 0 <= xRoot && xRoot <= 1 ) {
                        for ( var k = 0; k < yRoots.length; k++ ) {
                            if ( Math.abs( xRoot - yRoots[k] ) < TOLERANCE ) {
                                var v = c23.multiply(s * s * s).add(c22.multiply(s * s).add(c21.multiply(s).add(c20)));
                                result.points.push(new Point2D(v.x, v.y));
                                break checkRoots;
                            }
                        }
                    }
                }
        }
    }

    return result;

};

/**
 *  intersectBezier2Ellipse
 *
 *  @param {Point2D} p1
 *  @param {Point2D} p2
 *  @param {Point2D} p3
 *  @param {Point2D} ec
 *  @param {Number} rx
 *  @param {Number} ry
 *  @returns {Intersection}
 */
module.exports.intersectBezier2Ellipse = function(p1, p2, p3, ec, rx, ry) {
    var a, b;       // temporary variables
    var c2, c1, c0; // coefficients of quadratic
    var result = new Intersection();

    a = p2.multiply(-2);
    c2 = p1.add(a.add(p3));

    a = p1.multiply(-2);
    b = p2.multiply(2);
    c1 = a.add(b);

    c0 = new Point2D(p1.x, p1.y);

    var rxrx  = rx*rx;
    var ryry  = ry*ry;
    var roots = new Polynomial(
        ryry*c2.x*c2.x + rxrx*c2.y*c2.y,
        2*(ryry*c2.x*c1.x + rxrx*c2.y*c1.y),
        ryry*(2*c2.x*c0.x + c1.x*c1.x) + rxrx*(2*c2.y*c0.y+c1.y*c1.y) -
            2*(ryry*ec.x*c2.x + rxrx*ec.y*c2.y),
        2*(ryry*c1.x*(c0.x-ec.x) + rxrx*c1.y*(c0.y-ec.y)),
        ryry*(c0.x*c0.x+ec.x*ec.x) + rxrx*(c0.y*c0.y + ec.y*ec.y) -
            2*(ryry*ec.x*c0.x + rxrx*ec.y*c0.y) - rxrx*ryry
    ).getRoots();

    for ( var i = 0; i < roots.length; i++ ) {
        var t = roots[i];

        if ( 0 <= t && t <= 1 )
            result.points.push( c2.multiply(t*t).add(c1.multiply(t).add(c0)) );
    }

    return result;
};


/**
 *  intersectBezier2Line
 *
 *  @param {Point2D} p1
 *  @param {Point2D} p2
 *  @param {Point2D} p3
 *  @param {Point2D} a1
 *  @param {Point2D} a2
 *  @returns {Intersection}
 */
module.exports.intersectBezier2Line = function(p1, p2, p3, a1, a2) {
    var a, b;             // temporary variables
    var c2, c1, c0;       // coefficients of quadratic
    var cl;               // c coefficient for normal form of line
    var n;                // normal for normal form of line
    var min = a1.min(a2); // used to determine if point is on line segment
    var max = a1.max(a2); // used to determine if point is on line segment
    var result = new Intersection();

    a = p2.multiply(-2);
    c2 = p1.add(a.add(p3));

    a = p1.multiply(-2);
    b = p2.multiply(2);
    c1 = a.add(b);

    c0 = new Point2D(p1.x, p1.y);

    // Convert line to normal form: ax + by + c = 0
    // Find normal to line: negative inverse of original line's slope
    n = new Vector2D(a1.y - a2.y, a2.x - a1.x);

    // Determine new c coefficient
    cl = a1.x*a2.y - a2.x*a1.y;

    // Transform cubic coefficients to line's coordinate system and find roots
    // of cubic
    roots = new Polynomial(
        n.dot(c2),
        n.dot(c1),
        n.dot(c0) + cl
    ).getRoots();

    // Any roots in closed interval [0,1] are intersections on Bezier, but
    // might not be on the line segment.
    // Find intersections and calculate point coordinates
    for ( var i = 0; i < roots.length; i++ ) {
        var t = roots[i];

        if ( 0 <= t && t <= 1 ) {
            // We're within the Bezier curve
            // Find point on Bezier
            var p4 = p1.lerp(p2, t);
            var p5 = p2.lerp(p3, t);

            var p6 = p4.lerp(p5, t);

            // See if point is on line segment
            // Had to make special cases for vertical and horizontal lines due
            // to slight errors in calculation of p6
            if ( a1.x == a2.x ) {
                if ( min.y <= p6.y && p6.y <= max.y ) {
                    result.appendPoint( p6 );
                }
            } else if ( a1.y == a2.y ) {
                if ( min.x <= p6.x && p6.x <= max.x ) {
                    result.appendPoint( p6 );
                }
            } else if (min.x <= p6.x && p6.x <= max.x && min.y <= p6.y && p6.y <= max.y) {
                result.appendPoint( p6 );
            }
        }
    }

    return result;
};


/**
 *  intersectBezier3Bezier3
 *
 *  @param {Point2D} a1
 *  @param {Point2D} a2
 *  @param {Point2D} a3
 *  @param {Point2D} a4
 *  @param {Point2D} b1
 *  @param {Point2D} b2
 *  @param {Point2D} b3
 *  @param {Point2D} b4
 *  @returns {Intersection}
 */
module.exports.intersectBezier3Bezier3 = function(a1, a2, a3, a4, b1, b2, b3, b4) {
    var a, b, c, d;         // temporary variables
    var c13, c12, c11, c10; // coefficients of cubic
    var c23, c22, c21, c20; // coefficients of cubic
    var result = new Intersection();

    // Calculate the coefficients of cubic polynomial
    a = a1.multiply(-1);
    b = a2.multiply(3);
    c = a3.multiply(-3);
    d = a.add(b.add(c.add(a4)));
    c13 = new Vector2D(d.x, d.y);

    a = a1.multiply(3);
    b = a2.multiply(-6);
    c = a3.multiply(3);
    d = a.add(b.add(c));
    c12 = new Vector2D(d.x, d.y);

    a = a1.multiply(-3);
    b = a2.multiply(3);
    c = a.add(b);
    c11 = new Vector2D(c.x, c.y);

    c10 = new Vector2D(a1.x, a1.y);

    a = b1.multiply(-1);
    b = b2.multiply(3);
    c = b3.multiply(-3);
    d = a.add(b.add(c.add(b4)));
    c23 = new Vector2D(d.x, d.y);

    a = b1.multiply(3);
    b = b2.multiply(-6);
    c = b3.multiply(3);
    d = a.add(b.add(c));
    c22 = new Vector2D(d.x, d.y);

    a = b1.multiply(-3);
    b = b2.multiply(3);
    c = a.add(b);
    c21 = new Vector2D(c.x, c.y);

    c20 = new Vector2D(b1.x, b1.y);

    var c10x2 = c10.x*c10.x;
    var c10x3 = c10.x*c10.x*c10.x;
    var c10y2 = c10.y*c10.y;
    var c10y3 = c10.y*c10.y*c10.y;
    var c11x2 = c11.x*c11.x;
    var c11x3 = c11.x*c11.x*c11.x;
    var c11y2 = c11.y*c11.y;
    var c11y3 = c11.y*c11.y*c11.y;
    var c12x2 = c12.x*c12.x;
    var c12x3 = c12.x*c12.x*c12.x;
    var c12y2 = c12.y*c12.y;
    var c12y3 = c12.y*c12.y*c12.y;
    var c13x2 = c13.x*c13.x;
    var c13x3 = c13.x*c13.x*c13.x;
    var c13y2 = c13.y*c13.y;
    var c13y3 = c13.y*c13.y*c13.y;
    var c20x2 = c20.x*c20.x;
    var c20x3 = c20.x*c20.x*c20.x;
    var c20y2 = c20.y*c20.y;
    var c20y3 = c20.y*c20.y*c20.y;
    var c21x2 = c21.x*c21.x;
    var c21x3 = c21.x*c21.x*c21.x;
    var c21y2 = c21.y*c21.y;
    var c22x2 = c22.x*c22.x;
    var c22x3 = c22.x*c22.x*c22.x;
    var c22y2 = c22.y*c22.y;
    var c23x2 = c23.x*c23.x;
    var c23x3 = c23.x*c23.x*c23.x;
    var c23y2 = c23.y*c23.y;
    var c23y3 = c23.y*c23.y*c23.y;
    var poly = new Polynomial(
        -c13x3*c23y3 + c13y3*c23x3 - 3*c13.x*c13y2*c23x2*c23.y +
            3*c13x2*c13.y*c23.x*c23y2,
        -6*c13.x*c22.x*c13y2*c23.x*c23.y + 6*c13x2*c13.y*c22.y*c23.x*c23.y + 3*c22.x*c13y3*c23x2 -
            3*c13x3*c22.y*c23y2 - 3*c13.x*c13y2*c22.y*c23x2 + 3*c13x2*c22.x*c13.y*c23y2,
        -6*c21.x*c13.x*c13y2*c23.x*c23.y - 6*c13.x*c22.x*c13y2*c22.y*c23.x + 6*c13x2*c22.x*c13.y*c22.y*c23.y +
            3*c21.x*c13y3*c23x2 + 3*c22x2*c13y3*c23.x + 3*c21.x*c13x2*c13.y*c23y2 - 3*c13.x*c21.y*c13y2*c23x2 -
            3*c13.x*c22x2*c13y2*c23.y + c13x2*c13.y*c23.x*(6*c21.y*c23.y + 3*c22y2) + c13x3*(-c21.y*c23y2 -
            2*c22y2*c23.y - c23.y*(2*c21.y*c23.y + c22y2)),
        c11.x*c12.y*c13.x*c13.y*c23.x*c23.y - c11.y*c12.x*c13.x*c13.y*c23.x*c23.y + 6*c21.x*c22.x*c13y3*c23.x +
            3*c11.x*c12.x*c13.x*c13.y*c23y2 + 6*c10.x*c13.x*c13y2*c23.x*c23.y - 3*c11.x*c12.x*c13y2*c23.x*c23.y -
            3*c11.y*c12.y*c13.x*c13.y*c23x2 - 6*c10.y*c13x2*c13.y*c23.x*c23.y - 6*c20.x*c13.x*c13y2*c23.x*c23.y +
            3*c11.y*c12.y*c13x2*c23.x*c23.y - 2*c12.x*c12y2*c13.x*c23.x*c23.y - 6*c21.x*c13.x*c22.x*c13y2*c23.y -
            6*c21.x*c13.x*c13y2*c22.y*c23.x - 6*c13.x*c21.y*c22.x*c13y2*c23.x + 6*c21.x*c13x2*c13.y*c22.y*c23.y +
            2*c12x2*c12.y*c13.y*c23.x*c23.y + c22x3*c13y3 - 3*c10.x*c13y3*c23x2 + 3*c10.y*c13x3*c23y2 +
            3*c20.x*c13y3*c23x2 + c12y3*c13.x*c23x2 - c12x3*c13.y*c23y2 - 3*c10.x*c13x2*c13.y*c23y2 +
            3*c10.y*c13.x*c13y2*c23x2 - 2*c11.x*c12.y*c13x2*c23y2 + c11.x*c12.y*c13y2*c23x2 - c11.y*c12.x*c13x2*c23y2 +
            2*c11.y*c12.x*c13y2*c23x2 + 3*c20.x*c13x2*c13.y*c23y2 - c12.x*c12y2*c13.y*c23x2 -
            3*c20.y*c13.x*c13y2*c23x2 + c12x2*c12.y*c13.x*c23y2 - 3*c13.x*c22x2*c13y2*c22.y +
            c13x2*c13.y*c23.x*(6*c20.y*c23.y + 6*c21.y*c22.y) + c13x2*c22.x*c13.y*(6*c21.y*c23.y + 3*c22y2) +
            c13x3*(-2*c21.y*c22.y*c23.y - c20.y*c23y2 - c22.y*(2*c21.y*c23.y + c22y2) - c23.y*(2*c20.y*c23.y + 2*c21.y*c22.y)),
        6*c11.x*c12.x*c13.x*c13.y*c22.y*c23.y + c11.x*c12.y*c13.x*c22.x*c13.y*c23.y + c11.x*c12.y*c13.x*c13.y*c22.y*c23.x -
            c11.y*c12.x*c13.x*c22.x*c13.y*c23.y - c11.y*c12.x*c13.x*c13.y*c22.y*c23.x - 6*c11.y*c12.y*c13.x*c22.x*c13.y*c23.x -
            6*c10.x*c22.x*c13y3*c23.x + 6*c20.x*c22.x*c13y3*c23.x + 6*c10.y*c13x3*c22.y*c23.y + 2*c12y3*c13.x*c22.x*c23.x -
            2*c12x3*c13.y*c22.y*c23.y + 6*c10.x*c13.x*c22.x*c13y2*c23.y + 6*c10.x*c13.x*c13y2*c22.y*c23.x +
            6*c10.y*c13.x*c22.x*c13y2*c23.x - 3*c11.x*c12.x*c22.x*c13y2*c23.y - 3*c11.x*c12.x*c13y2*c22.y*c23.x +
            2*c11.x*c12.y*c22.x*c13y2*c23.x + 4*c11.y*c12.x*c22.x*c13y2*c23.x - 6*c10.x*c13x2*c13.y*c22.y*c23.y -
            6*c10.y*c13x2*c22.x*c13.y*c23.y - 6*c10.y*c13x2*c13.y*c22.y*c23.x - 4*c11.x*c12.y*c13x2*c22.y*c23.y -
            6*c20.x*c13.x*c22.x*c13y2*c23.y - 6*c20.x*c13.x*c13y2*c22.y*c23.x - 2*c11.y*c12.x*c13x2*c22.y*c23.y +
            3*c11.y*c12.y*c13x2*c22.x*c23.y + 3*c11.y*c12.y*c13x2*c22.y*c23.x - 2*c12.x*c12y2*c13.x*c22.x*c23.y -
            2*c12.x*c12y2*c13.x*c22.y*c23.x - 2*c12.x*c12y2*c22.x*c13.y*c23.x - 6*c20.y*c13.x*c22.x*c13y2*c23.x -
            6*c21.x*c13.x*c21.y*c13y2*c23.x - 6*c21.x*c13.x*c22.x*c13y2*c22.y + 6*c20.x*c13x2*c13.y*c22.y*c23.y +
            2*c12x2*c12.y*c13.x*c22.y*c23.y + 2*c12x2*c12.y*c22.x*c13.y*c23.y + 2*c12x2*c12.y*c13.y*c22.y*c23.x +
            3*c21.x*c22x2*c13y3 + 3*c21x2*c13y3*c23.x - 3*c13.x*c21.y*c22x2*c13y2 - 3*c21x2*c13.x*c13y2*c23.y +
            c13x2*c22.x*c13.y*(6*c20.y*c23.y + 6*c21.y*c22.y) + c13x2*c13.y*c23.x*(6*c20.y*c22.y + 3*c21y2) +
            c21.x*c13x2*c13.y*(6*c21.y*c23.y + 3*c22y2) + c13x3*(-2*c20.y*c22.y*c23.y - c23.y*(2*c20.y*c22.y + c21y2) -
            c21.y*(2*c21.y*c23.y + c22y2) - c22.y*(2*c20.y*c23.y + 2*c21.y*c22.y)),
        c11.x*c21.x*c12.y*c13.x*c13.y*c23.y + c11.x*c12.y*c13.x*c21.y*c13.y*c23.x + c11.x*c12.y*c13.x*c22.x*c13.y*c22.y -
            c11.y*c12.x*c21.x*c13.x*c13.y*c23.y - c11.y*c12.x*c13.x*c21.y*c13.y*c23.x - c11.y*c12.x*c13.x*c22.x*c13.y*c22.y -
            6*c11.y*c21.x*c12.y*c13.x*c13.y*c23.x - 6*c10.x*c21.x*c13y3*c23.x + 6*c20.x*c21.x*c13y3*c23.x +
            2*c21.x*c12y3*c13.x*c23.x + 6*c10.x*c21.x*c13.x*c13y2*c23.y + 6*c10.x*c13.x*c21.y*c13y2*c23.x +
            6*c10.x*c13.x*c22.x*c13y2*c22.y + 6*c10.y*c21.x*c13.x*c13y2*c23.x - 3*c11.x*c12.x*c21.x*c13y2*c23.y -
            3*c11.x*c12.x*c21.y*c13y2*c23.x - 3*c11.x*c12.x*c22.x*c13y2*c22.y + 2*c11.x*c21.x*c12.y*c13y2*c23.x +
            4*c11.y*c12.x*c21.x*c13y2*c23.x - 6*c10.y*c21.x*c13x2*c13.y*c23.y - 6*c10.y*c13x2*c21.y*c13.y*c23.x -
            6*c10.y*c13x2*c22.x*c13.y*c22.y - 6*c20.x*c21.x*c13.x*c13y2*c23.y - 6*c20.x*c13.x*c21.y*c13y2*c23.x -
            6*c20.x*c13.x*c22.x*c13y2*c22.y + 3*c11.y*c21.x*c12.y*c13x2*c23.y - 3*c11.y*c12.y*c13.x*c22x2*c13.y +
            3*c11.y*c12.y*c13x2*c21.y*c23.x + 3*c11.y*c12.y*c13x2*c22.x*c22.y - 2*c12.x*c21.x*c12y2*c13.x*c23.y -
            2*c12.x*c21.x*c12y2*c13.y*c23.x - 2*c12.x*c12y2*c13.x*c21.y*c23.x - 2*c12.x*c12y2*c13.x*c22.x*c22.y -
            6*c20.y*c21.x*c13.x*c13y2*c23.x - 6*c21.x*c13.x*c21.y*c22.x*c13y2 + 6*c20.y*c13x2*c21.y*c13.y*c23.x +
            2*c12x2*c21.x*c12.y*c13.y*c23.y + 2*c12x2*c12.y*c21.y*c13.y*c23.x + 2*c12x2*c12.y*c22.x*c13.y*c22.y -
            3*c10.x*c22x2*c13y3 + 3*c20.x*c22x2*c13y3 + 3*c21x2*c22.x*c13y3 + c12y3*c13.x*c22x2 +
            3*c10.y*c13.x*c22x2*c13y2 + c11.x*c12.y*c22x2*c13y2 + 2*c11.y*c12.x*c22x2*c13y2 -
            c12.x*c12y2*c22x2*c13.y - 3*c20.y*c13.x*c22x2*c13y2 - 3*c21x2*c13.x*c13y2*c22.y +
            c12x2*c12.y*c13.x*(2*c21.y*c23.y + c22y2) + c11.x*c12.x*c13.x*c13.y*(6*c21.y*c23.y + 3*c22y2) +
            c21.x*c13x2*c13.y*(6*c20.y*c23.y + 6*c21.y*c22.y) + c12x3*c13.y*(-2*c21.y*c23.y - c22y2) +
            c10.y*c13x3*(6*c21.y*c23.y + 3*c22y2) + c11.y*c12.x*c13x2*(-2*c21.y*c23.y - c22y2) +
            c11.x*c12.y*c13x2*(-4*c21.y*c23.y - 2*c22y2) + c10.x*c13x2*c13.y*(-6*c21.y*c23.y - 3*c22y2) +
            c13x2*c22.x*c13.y*(6*c20.y*c22.y + 3*c21y2) + c20.x*c13x2*c13.y*(6*c21.y*c23.y + 3*c22y2) +
            c13x3*(-2*c20.y*c21.y*c23.y - c22.y*(2*c20.y*c22.y + c21y2) - c20.y*(2*c21.y*c23.y + c22y2) -
            c21.y*(2*c20.y*c23.y + 2*c21.y*c22.y)),
        -c10.x*c11.x*c12.y*c13.x*c13.y*c23.y + c10.x*c11.y*c12.x*c13.x*c13.y*c23.y + 6*c10.x*c11.y*c12.y*c13.x*c13.y*c23.x -
            6*c10.y*c11.x*c12.x*c13.x*c13.y*c23.y - c10.y*c11.x*c12.y*c13.x*c13.y*c23.x + c10.y*c11.y*c12.x*c13.x*c13.y*c23.x +
            c11.x*c11.y*c12.x*c12.y*c13.x*c23.y - c11.x*c11.y*c12.x*c12.y*c13.y*c23.x + c11.x*c20.x*c12.y*c13.x*c13.y*c23.y +
            c11.x*c20.y*c12.y*c13.x*c13.y*c23.x + c11.x*c21.x*c12.y*c13.x*c13.y*c22.y + c11.x*c12.y*c13.x*c21.y*c22.x*c13.y -
            c20.x*c11.y*c12.x*c13.x*c13.y*c23.y - 6*c20.x*c11.y*c12.y*c13.x*c13.y*c23.x - c11.y*c12.x*c20.y*c13.x*c13.y*c23.x -
            c11.y*c12.x*c21.x*c13.x*c13.y*c22.y - c11.y*c12.x*c13.x*c21.y*c22.x*c13.y - 6*c11.y*c21.x*c12.y*c13.x*c22.x*c13.y -
            6*c10.x*c20.x*c13y3*c23.x - 6*c10.x*c21.x*c22.x*c13y3 - 2*c10.x*c12y3*c13.x*c23.x + 6*c20.x*c21.x*c22.x*c13y3 +
            2*c20.x*c12y3*c13.x*c23.x + 2*c21.x*c12y3*c13.x*c22.x + 2*c10.y*c12x3*c13.y*c23.y - 6*c10.x*c10.y*c13.x*c13y2*c23.x +
            3*c10.x*c11.x*c12.x*c13y2*c23.y - 2*c10.x*c11.x*c12.y*c13y2*c23.x - 4*c10.x*c11.y*c12.x*c13y2*c23.x +
            3*c10.y*c11.x*c12.x*c13y2*c23.x + 6*c10.x*c10.y*c13x2*c13.y*c23.y + 6*c10.x*c20.x*c13.x*c13y2*c23.y -
            3*c10.x*c11.y*c12.y*c13x2*c23.y + 2*c10.x*c12.x*c12y2*c13.x*c23.y + 2*c10.x*c12.x*c12y2*c13.y*c23.x +
            6*c10.x*c20.y*c13.x*c13y2*c23.x + 6*c10.x*c21.x*c13.x*c13y2*c22.y + 6*c10.x*c13.x*c21.y*c22.x*c13y2 +
            4*c10.y*c11.x*c12.y*c13x2*c23.y + 6*c10.y*c20.x*c13.x*c13y2*c23.x + 2*c10.y*c11.y*c12.x*c13x2*c23.y -
            3*c10.y*c11.y*c12.y*c13x2*c23.x + 2*c10.y*c12.x*c12y2*c13.x*c23.x + 6*c10.y*c21.x*c13.x*c22.x*c13y2 -
            3*c11.x*c20.x*c12.x*c13y2*c23.y + 2*c11.x*c20.x*c12.y*c13y2*c23.x + c11.x*c11.y*c12y2*c13.x*c23.x -
            3*c11.x*c12.x*c20.y*c13y2*c23.x - 3*c11.x*c12.x*c21.x*c13y2*c22.y - 3*c11.x*c12.x*c21.y*c22.x*c13y2 +
            2*c11.x*c21.x*c12.y*c22.x*c13y2 + 4*c20.x*c11.y*c12.x*c13y2*c23.x + 4*c11.y*c12.x*c21.x*c22.x*c13y2 -
            2*c10.x*c12x2*c12.y*c13.y*c23.y - 6*c10.y*c20.x*c13x2*c13.y*c23.y - 6*c10.y*c20.y*c13x2*c13.y*c23.x -
            6*c10.y*c21.x*c13x2*c13.y*c22.y - 2*c10.y*c12x2*c12.y*c13.x*c23.y - 2*c10.y*c12x2*c12.y*c13.y*c23.x -
            6*c10.y*c13x2*c21.y*c22.x*c13.y - c11.x*c11.y*c12x2*c13.y*c23.y - 2*c11.x*c11y2*c13.x*c13.y*c23.x +
            3*c20.x*c11.y*c12.y*c13x2*c23.y - 2*c20.x*c12.x*c12y2*c13.x*c23.y - 2*c20.x*c12.x*c12y2*c13.y*c23.x -
            6*c20.x*c20.y*c13.x*c13y2*c23.x - 6*c20.x*c21.x*c13.x*c13y2*c22.y - 6*c20.x*c13.x*c21.y*c22.x*c13y2 +
            3*c11.y*c20.y*c12.y*c13x2*c23.x + 3*c11.y*c21.x*c12.y*c13x2*c22.y + 3*c11.y*c12.y*c13x2*c21.y*c22.x -
            2*c12.x*c20.y*c12y2*c13.x*c23.x - 2*c12.x*c21.x*c12y2*c13.x*c22.y - 2*c12.x*c21.x*c12y2*c22.x*c13.y -
            2*c12.x*c12y2*c13.x*c21.y*c22.x - 6*c20.y*c21.x*c13.x*c22.x*c13y2 - c11y2*c12.x*c12.y*c13.x*c23.x +
            2*c20.x*c12x2*c12.y*c13.y*c23.y + 6*c20.y*c13x2*c21.y*c22.x*c13.y + 2*c11x2*c11.y*c13.x*c13.y*c23.y +
            c11x2*c12.x*c12.y*c13.y*c23.y + 2*c12x2*c20.y*c12.y*c13.y*c23.x + 2*c12x2*c21.x*c12.y*c13.y*c22.y +
            2*c12x2*c12.y*c21.y*c22.x*c13.y + c21x3*c13y3 + 3*c10x2*c13y3*c23.x - 3*c10y2*c13x3*c23.y +
            3*c20x2*c13y3*c23.x + c11y3*c13x2*c23.x - c11x3*c13y2*c23.y - c11.x*c11y2*c13x2*c23.y +
            c11x2*c11.y*c13y2*c23.x - 3*c10x2*c13.x*c13y2*c23.y + 3*c10y2*c13x2*c13.y*c23.x - c11x2*c12y2*c13.x*c23.y +
            c11y2*c12x2*c13.y*c23.x - 3*c21x2*c13.x*c21.y*c13y2 - 3*c20x2*c13.x*c13y2*c23.y + 3*c20y2*c13x2*c13.y*c23.x +
            c11.x*c12.x*c13.x*c13.y*(6*c20.y*c23.y + 6*c21.y*c22.y) + c12x3*c13.y*(-2*c20.y*c23.y - 2*c21.y*c22.y) +
            c10.y*c13x3*(6*c20.y*c23.y + 6*c21.y*c22.y) + c11.y*c12.x*c13x2*(-2*c20.y*c23.y - 2*c21.y*c22.y) +
            c12x2*c12.y*c13.x*(2*c20.y*c23.y + 2*c21.y*c22.y) + c11.x*c12.y*c13x2*(-4*c20.y*c23.y - 4*c21.y*c22.y) +
            c10.x*c13x2*c13.y*(-6*c20.y*c23.y - 6*c21.y*c22.y) + c20.x*c13x2*c13.y*(6*c20.y*c23.y + 6*c21.y*c22.y) +
            c21.x*c13x2*c13.y*(6*c20.y*c22.y + 3*c21y2) + c13x3*(-2*c20.y*c21.y*c22.y - c20y2*c23.y -
            c21.y*(2*c20.y*c22.y + c21y2) - c20.y*(2*c20.y*c23.y + 2*c21.y*c22.y)),
        -c10.x*c11.x*c12.y*c13.x*c13.y*c22.y + c10.x*c11.y*c12.x*c13.x*c13.y*c22.y + 6*c10.x*c11.y*c12.y*c13.x*c22.x*c13.y -
            6*c10.y*c11.x*c12.x*c13.x*c13.y*c22.y - c10.y*c11.x*c12.y*c13.x*c22.x*c13.y + c10.y*c11.y*c12.x*c13.x*c22.x*c13.y +
            c11.x*c11.y*c12.x*c12.y*c13.x*c22.y - c11.x*c11.y*c12.x*c12.y*c22.x*c13.y + c11.x*c20.x*c12.y*c13.x*c13.y*c22.y +
            c11.x*c20.y*c12.y*c13.x*c22.x*c13.y + c11.x*c21.x*c12.y*c13.x*c21.y*c13.y - c20.x*c11.y*c12.x*c13.x*c13.y*c22.y -
            6*c20.x*c11.y*c12.y*c13.x*c22.x*c13.y - c11.y*c12.x*c20.y*c13.x*c22.x*c13.y - c11.y*c12.x*c21.x*c13.x*c21.y*c13.y -
            6*c10.x*c20.x*c22.x*c13y3 - 2*c10.x*c12y3*c13.x*c22.x + 2*c20.x*c12y3*c13.x*c22.x + 2*c10.y*c12x3*c13.y*c22.y -
            6*c10.x*c10.y*c13.x*c22.x*c13y2 + 3*c10.x*c11.x*c12.x*c13y2*c22.y - 2*c10.x*c11.x*c12.y*c22.x*c13y2 -
            4*c10.x*c11.y*c12.x*c22.x*c13y2 + 3*c10.y*c11.x*c12.x*c22.x*c13y2 + 6*c10.x*c10.y*c13x2*c13.y*c22.y +
            6*c10.x*c20.x*c13.x*c13y2*c22.y - 3*c10.x*c11.y*c12.y*c13x2*c22.y + 2*c10.x*c12.x*c12y2*c13.x*c22.y +
            2*c10.x*c12.x*c12y2*c22.x*c13.y + 6*c10.x*c20.y*c13.x*c22.x*c13y2 + 6*c10.x*c21.x*c13.x*c21.y*c13y2 +
            4*c10.y*c11.x*c12.y*c13x2*c22.y + 6*c10.y*c20.x*c13.x*c22.x*c13y2 + 2*c10.y*c11.y*c12.x*c13x2*c22.y -
            3*c10.y*c11.y*c12.y*c13x2*c22.x + 2*c10.y*c12.x*c12y2*c13.x*c22.x - 3*c11.x*c20.x*c12.x*c13y2*c22.y +
            2*c11.x*c20.x*c12.y*c22.x*c13y2 + c11.x*c11.y*c12y2*c13.x*c22.x - 3*c11.x*c12.x*c20.y*c22.x*c13y2 -
            3*c11.x*c12.x*c21.x*c21.y*c13y2 + 4*c20.x*c11.y*c12.x*c22.x*c13y2 - 2*c10.x*c12x2*c12.y*c13.y*c22.y -
            6*c10.y*c20.x*c13x2*c13.y*c22.y - 6*c10.y*c20.y*c13x2*c22.x*c13.y - 6*c10.y*c21.x*c13x2*c21.y*c13.y -
            2*c10.y*c12x2*c12.y*c13.x*c22.y - 2*c10.y*c12x2*c12.y*c22.x*c13.y - c11.x*c11.y*c12x2*c13.y*c22.y -
            2*c11.x*c11y2*c13.x*c22.x*c13.y + 3*c20.x*c11.y*c12.y*c13x2*c22.y - 2*c20.x*c12.x*c12y2*c13.x*c22.y -
            2*c20.x*c12.x*c12y2*c22.x*c13.y - 6*c20.x*c20.y*c13.x*c22.x*c13y2 - 6*c20.x*c21.x*c13.x*c21.y*c13y2 +
            3*c11.y*c20.y*c12.y*c13x2*c22.x + 3*c11.y*c21.x*c12.y*c13x2*c21.y - 2*c12.x*c20.y*c12y2*c13.x*c22.x -
            2*c12.x*c21.x*c12y2*c13.x*c21.y - c11y2*c12.x*c12.y*c13.x*c22.x + 2*c20.x*c12x2*c12.y*c13.y*c22.y -
            3*c11.y*c21x2*c12.y*c13.x*c13.y + 6*c20.y*c21.x*c13x2*c21.y*c13.y + 2*c11x2*c11.y*c13.x*c13.y*c22.y +
            c11x2*c12.x*c12.y*c13.y*c22.y + 2*c12x2*c20.y*c12.y*c22.x*c13.y + 2*c12x2*c21.x*c12.y*c21.y*c13.y -
            3*c10.x*c21x2*c13y3 + 3*c20.x*c21x2*c13y3 + 3*c10x2*c22.x*c13y3 - 3*c10y2*c13x3*c22.y + 3*c20x2*c22.x*c13y3 +
            c21x2*c12y3*c13.x + c11y3*c13x2*c22.x - c11x3*c13y2*c22.y + 3*c10.y*c21x2*c13.x*c13y2 -
            c11.x*c11y2*c13x2*c22.y + c11.x*c21x2*c12.y*c13y2 + 2*c11.y*c12.x*c21x2*c13y2 + c11x2*c11.y*c22.x*c13y2 -
            c12.x*c21x2*c12y2*c13.y - 3*c20.y*c21x2*c13.x*c13y2 - 3*c10x2*c13.x*c13y2*c22.y + 3*c10y2*c13x2*c22.x*c13.y -
            c11x2*c12y2*c13.x*c22.y + c11y2*c12x2*c22.x*c13.y - 3*c20x2*c13.x*c13y2*c22.y + 3*c20y2*c13x2*c22.x*c13.y +
            c12x2*c12.y*c13.x*(2*c20.y*c22.y + c21y2) + c11.x*c12.x*c13.x*c13.y*(6*c20.y*c22.y + 3*c21y2) +
            c12x3*c13.y*(-2*c20.y*c22.y - c21y2) + c10.y*c13x3*(6*c20.y*c22.y + 3*c21y2) +
            c11.y*c12.x*c13x2*(-2*c20.y*c22.y - c21y2) + c11.x*c12.y*c13x2*(-4*c20.y*c22.y - 2*c21y2) +
            c10.x*c13x2*c13.y*(-6*c20.y*c22.y - 3*c21y2) + c20.x*c13x2*c13.y*(6*c20.y*c22.y + 3*c21y2) +
            c13x3*(-2*c20.y*c21y2 - c20y2*c22.y - c20.y*(2*c20.y*c22.y + c21y2)),
        -c10.x*c11.x*c12.y*c13.x*c21.y*c13.y + c10.x*c11.y*c12.x*c13.x*c21.y*c13.y + 6*c10.x*c11.y*c21.x*c12.y*c13.x*c13.y -
            6*c10.y*c11.x*c12.x*c13.x*c21.y*c13.y - c10.y*c11.x*c21.x*c12.y*c13.x*c13.y + c10.y*c11.y*c12.x*c21.x*c13.x*c13.y -
            c11.x*c11.y*c12.x*c21.x*c12.y*c13.y + c11.x*c11.y*c12.x*c12.y*c13.x*c21.y + c11.x*c20.x*c12.y*c13.x*c21.y*c13.y +
            6*c11.x*c12.x*c20.y*c13.x*c21.y*c13.y + c11.x*c20.y*c21.x*c12.y*c13.x*c13.y - c20.x*c11.y*c12.x*c13.x*c21.y*c13.y -
            6*c20.x*c11.y*c21.x*c12.y*c13.x*c13.y - c11.y*c12.x*c20.y*c21.x*c13.x*c13.y - 6*c10.x*c20.x*c21.x*c13y3 -
            2*c10.x*c21.x*c12y3*c13.x + 6*c10.y*c20.y*c13x3*c21.y + 2*c20.x*c21.x*c12y3*c13.x + 2*c10.y*c12x3*c21.y*c13.y -
            2*c12x3*c20.y*c21.y*c13.y - 6*c10.x*c10.y*c21.x*c13.x*c13y2 + 3*c10.x*c11.x*c12.x*c21.y*c13y2 -
            2*c10.x*c11.x*c21.x*c12.y*c13y2 - 4*c10.x*c11.y*c12.x*c21.x*c13y2 + 3*c10.y*c11.x*c12.x*c21.x*c13y2 +
            6*c10.x*c10.y*c13x2*c21.y*c13.y + 6*c10.x*c20.x*c13.x*c21.y*c13y2 - 3*c10.x*c11.y*c12.y*c13x2*c21.y +
            2*c10.x*c12.x*c21.x*c12y2*c13.y + 2*c10.x*c12.x*c12y2*c13.x*c21.y + 6*c10.x*c20.y*c21.x*c13.x*c13y2 +
            4*c10.y*c11.x*c12.y*c13x2*c21.y + 6*c10.y*c20.x*c21.x*c13.x*c13y2 + 2*c10.y*c11.y*c12.x*c13x2*c21.y -
            3*c10.y*c11.y*c21.x*c12.y*c13x2 + 2*c10.y*c12.x*c21.x*c12y2*c13.x - 3*c11.x*c20.x*c12.x*c21.y*c13y2 +
            2*c11.x*c20.x*c21.x*c12.y*c13y2 + c11.x*c11.y*c21.x*c12y2*c13.x - 3*c11.x*c12.x*c20.y*c21.x*c13y2 +
            4*c20.x*c11.y*c12.x*c21.x*c13y2 - 6*c10.x*c20.y*c13x2*c21.y*c13.y - 2*c10.x*c12x2*c12.y*c21.y*c13.y -
            6*c10.y*c20.x*c13x2*c21.y*c13.y - 6*c10.y*c20.y*c21.x*c13x2*c13.y - 2*c10.y*c12x2*c21.x*c12.y*c13.y -
            2*c10.y*c12x2*c12.y*c13.x*c21.y - c11.x*c11.y*c12x2*c21.y*c13.y - 4*c11.x*c20.y*c12.y*c13x2*c21.y -
            2*c11.x*c11y2*c21.x*c13.x*c13.y + 3*c20.x*c11.y*c12.y*c13x2*c21.y - 2*c20.x*c12.x*c21.x*c12y2*c13.y -
            2*c20.x*c12.x*c12y2*c13.x*c21.y - 6*c20.x*c20.y*c21.x*c13.x*c13y2 - 2*c11.y*c12.x*c20.y*c13x2*c21.y +
            3*c11.y*c20.y*c21.x*c12.y*c13x2 - 2*c12.x*c20.y*c21.x*c12y2*c13.x - c11y2*c12.x*c21.x*c12.y*c13.x +
            6*c20.x*c20.y*c13x2*c21.y*c13.y + 2*c20.x*c12x2*c12.y*c21.y*c13.y + 2*c11x2*c11.y*c13.x*c21.y*c13.y +
            c11x2*c12.x*c12.y*c21.y*c13.y + 2*c12x2*c20.y*c21.x*c12.y*c13.y + 2*c12x2*c20.y*c12.y*c13.x*c21.y +
            3*c10x2*c21.x*c13y3 - 3*c10y2*c13x3*c21.y + 3*c20x2*c21.x*c13y3 + c11y3*c21.x*c13x2 - c11x3*c21.y*c13y2 -
            3*c20y2*c13x3*c21.y - c11.x*c11y2*c13x2*c21.y + c11x2*c11.y*c21.x*c13y2 - 3*c10x2*c13.x*c21.y*c13y2 +
            3*c10y2*c21.x*c13x2*c13.y - c11x2*c12y2*c13.x*c21.y + c11y2*c12x2*c21.x*c13.y - 3*c20x2*c13.x*c21.y*c13y2 +
            3*c20y2*c21.x*c13x2*c13.y,
        c10.x*c10.y*c11.x*c12.y*c13.x*c13.y - c10.x*c10.y*c11.y*c12.x*c13.x*c13.y + c10.x*c11.x*c11.y*c12.x*c12.y*c13.y -
            c10.y*c11.x*c11.y*c12.x*c12.y*c13.x - c10.x*c11.x*c20.y*c12.y*c13.x*c13.y + 6*c10.x*c20.x*c11.y*c12.y*c13.x*c13.y +
            c10.x*c11.y*c12.x*c20.y*c13.x*c13.y - c10.y*c11.x*c20.x*c12.y*c13.x*c13.y - 6*c10.y*c11.x*c12.x*c20.y*c13.x*c13.y +
            c10.y*c20.x*c11.y*c12.x*c13.x*c13.y - c11.x*c20.x*c11.y*c12.x*c12.y*c13.y + c11.x*c11.y*c12.x*c20.y*c12.y*c13.x +
            c11.x*c20.x*c20.y*c12.y*c13.x*c13.y - c20.x*c11.y*c12.x*c20.y*c13.x*c13.y - 2*c10.x*c20.x*c12y3*c13.x +
            2*c10.y*c12x3*c20.y*c13.y - 3*c10.x*c10.y*c11.x*c12.x*c13y2 - 6*c10.x*c10.y*c20.x*c13.x*c13y2 +
            3*c10.x*c10.y*c11.y*c12.y*c13x2 - 2*c10.x*c10.y*c12.x*c12y2*c13.x - 2*c10.x*c11.x*c20.x*c12.y*c13y2 -
            c10.x*c11.x*c11.y*c12y2*c13.x + 3*c10.x*c11.x*c12.x*c20.y*c13y2 - 4*c10.x*c20.x*c11.y*c12.x*c13y2 +
            3*c10.y*c11.x*c20.x*c12.x*c13y2 + 6*c10.x*c10.y*c20.y*c13x2*c13.y + 2*c10.x*c10.y*c12x2*c12.y*c13.y +
            2*c10.x*c11.x*c11y2*c13.x*c13.y + 2*c10.x*c20.x*c12.x*c12y2*c13.y + 6*c10.x*c20.x*c20.y*c13.x*c13y2 -
            3*c10.x*c11.y*c20.y*c12.y*c13x2 + 2*c10.x*c12.x*c20.y*c12y2*c13.x + c10.x*c11y2*c12.x*c12.y*c13.x +
            c10.y*c11.x*c11.y*c12x2*c13.y + 4*c10.y*c11.x*c20.y*c12.y*c13x2 - 3*c10.y*c20.x*c11.y*c12.y*c13x2 +
            2*c10.y*c20.x*c12.x*c12y2*c13.x + 2*c10.y*c11.y*c12.x*c20.y*c13x2 + c11.x*c20.x*c11.y*c12y2*c13.x -
            3*c11.x*c20.x*c12.x*c20.y*c13y2 - 2*c10.x*c12x2*c20.y*c12.y*c13.y - 6*c10.y*c20.x*c20.y*c13x2*c13.y -
            2*c10.y*c20.x*c12x2*c12.y*c13.y - 2*c10.y*c11x2*c11.y*c13.x*c13.y - c10.y*c11x2*c12.x*c12.y*c13.y -
            2*c10.y*c12x2*c20.y*c12.y*c13.x - 2*c11.x*c20.x*c11y2*c13.x*c13.y - c11.x*c11.y*c12x2*c20.y*c13.y +
            3*c20.x*c11.y*c20.y*c12.y*c13x2 - 2*c20.x*c12.x*c20.y*c12y2*c13.x - c20.x*c11y2*c12.x*c12.y*c13.x +
            3*c10y2*c11.x*c12.x*c13.x*c13.y + 3*c11.x*c12.x*c20y2*c13.x*c13.y + 2*c20.x*c12x2*c20.y*c12.y*c13.y -
            3*c10x2*c11.y*c12.y*c13.x*c13.y + 2*c11x2*c11.y*c20.y*c13.x*c13.y + c11x2*c12.x*c20.y*c12.y*c13.y -
            3*c20x2*c11.y*c12.y*c13.x*c13.y - c10x3*c13y3 + c10y3*c13x3 + c20x3*c13y3 - c20y3*c13x3 -
            3*c10.x*c20x2*c13y3 - c10.x*c11y3*c13x2 + 3*c10x2*c20.x*c13y3 + c10.y*c11x3*c13y2 +
            3*c10.y*c20y2*c13x3 + c20.x*c11y3*c13x2 + c10x2*c12y3*c13.x - 3*c10y2*c20.y*c13x3 - c10y2*c12x3*c13.y +
            c20x2*c12y3*c13.x - c11x3*c20.y*c13y2 - c12x3*c20y2*c13.y - c10.x*c11x2*c11.y*c13y2 +
            c10.y*c11.x*c11y2*c13x2 - 3*c10.x*c10y2*c13x2*c13.y - c10.x*c11y2*c12x2*c13.y + c10.y*c11x2*c12y2*c13.x -
            c11.x*c11y2*c20.y*c13x2 + 3*c10x2*c10.y*c13.x*c13y2 + c10x2*c11.x*c12.y*c13y2 +
            2*c10x2*c11.y*c12.x*c13y2 - 2*c10y2*c11.x*c12.y*c13x2 - c10y2*c11.y*c12.x*c13x2 + c11x2*c20.x*c11.y*c13y2 -
            3*c10.x*c20y2*c13x2*c13.y + 3*c10.y*c20x2*c13.x*c13y2 + c11.x*c20x2*c12.y*c13y2 - 2*c11.x*c20y2*c12.y*c13x2 +
            c20.x*c11y2*c12x2*c13.y - c11.y*c12.x*c20y2*c13x2 - c10x2*c12.x*c12y2*c13.y - 3*c10x2*c20.y*c13.x*c13y2 +
            3*c10y2*c20.x*c13x2*c13.y + c10y2*c12x2*c12.y*c13.x - c11x2*c20.y*c12y2*c13.x + 2*c20x2*c11.y*c12.x*c13y2 +
            3*c20.x*c20y2*c13x2*c13.y - c20x2*c12.x*c12y2*c13.y - 3*c20x2*c20.y*c13.x*c13y2 + c12x2*c20y2*c12.y*c13.x
    );
    var roots = poly.getRootsInInterval(0,1);
    removeMultipleRootsIn01(roots);

    for ( var i = 0; i < roots.length; i++ ) {
        var s = roots[i];
        var xRoots = new Polynomial(
            c13.x,
            c12.x,
            c11.x,
            c10.x - c20.x - s*c21.x - s*s*c22.x - s*s*s*c23.x
        ).getRoots();
        var yRoots = new Polynomial(
            c13.y,
            c12.y,
            c11.y,
            c10.y - c20.y - s*c21.y - s*s*c22.y - s*s*s*c23.y
        ).getRoots();

        if ( xRoots.length > 0 && yRoots.length > 0 ) {
            var TOLERANCE = 1e-4;

            checkRoots:
                for ( var j = 0; j < xRoots.length; j++ ) {
                    var xRoot = xRoots[j];

                    if ( 0 <= xRoot && xRoot <= 1 ) {
                        for ( var k = 0; k < yRoots.length; k++ ) {
                            if ( Math.abs( xRoot - yRoots[k] ) < TOLERANCE ) {
                                var v = c23.multiply(s * s * s).add(c22.multiply(s * s).add(c21.multiply(s).add(c20)));
                                result.points.push(new Point2D(v.x, v.y));
                                break checkRoots;
                            }
                        }
                    }
                }
        }
    }

    return result;
};

/**
 *  intersectBezier3Ellipse
 *
 *  @param {Point2D} p1
 *  @param {Point2D} p2
 *  @param {Point2D} p3
 *  @param {Point2D} p4
 *  @param {Point2D} ec
 *  @param {Number} rx
 *  @param {Number} ry
 *  @returns {Intersection}
 */
module.exports.intersectBezier3Ellipse = function(p1, p2, p3, p4, ec, rx, ry) {
    var a, b, c, d;       // temporary variables
    var c3, c2, c1, c0;   // coefficients of cubic
    var result = new Intersection();

    // Calculate the coefficients of cubic polynomial
    a = p1.multiply(-1);
    b = p2.multiply(3);
    c = p3.multiply(-3);
    d = a.add(b.add(c.add(p4)));
    c3 = new Vector2D(d.x, d.y);

    a = p1.multiply(3);
    b = p2.multiply(-6);
    c = p3.multiply(3);
    d = a.add(b.add(c));
    c2 = new Vector2D(d.x, d.y);

    a = p1.multiply(-3);
    b = p2.multiply(3);
    c = a.add(b);
    c1 = new Vector2D(c.x, c.y);

    c0 = new Vector2D(p1.x, p1.y);

    var rxrx  = rx*rx;
    var ryry  = ry*ry;
    var poly = new Polynomial(
        c3.x*c3.x*ryry + c3.y*c3.y*rxrx,
        2*(c3.x*c2.x*ryry + c3.y*c2.y*rxrx),
        2*(c3.x*c1.x*ryry + c3.y*c1.y*rxrx) + c2.x*c2.x*ryry + c2.y*c2.y*rxrx,
        2*c3.x*ryry*(c0.x - ec.x) + 2*c3.y*rxrx*(c0.y - ec.y) +
            2*(c2.x*c1.x*ryry + c2.y*c1.y*rxrx),
        2*c2.x*ryry*(c0.x - ec.x) + 2*c2.y*rxrx*(c0.y - ec.y) +
            c1.x*c1.x*ryry + c1.y*c1.y*rxrx,
        2*c1.x*ryry*(c0.x - ec.x) + 2*c1.y*rxrx*(c0.y - ec.y),
        c0.x*c0.x*ryry - 2*c0.y*ec.y*rxrx - 2*c0.x*ec.x*ryry +
            c0.y*c0.y*rxrx + ec.x*ec.x*ryry + ec.y*ec.y*rxrx - rxrx*ryry
    );
    var roots = poly.getRootsInInterval(0,1);
    removeMultipleRootsIn01(roots);

    for ( var i = 0; i < roots.length; i++ ) {
        var t = roots[i];
        var v = c3.multiply(t * t * t).add(c2.multiply(t * t).add(c1.multiply(t).add(c0)));
        result.points.push(new Point2D(v.x, v.y));
    }

    return result;
};


/**
 *  intersectBezier3Line
 *
 *  Many thanks to Dan Sunday at SoftSurfer.com.  He gave me a very thorough
 *  sketch of the algorithm used here.  Without his help, I'm not sure when I
 *  would have figured out this intersection problem.
 *
 *  @param {Point2D} p1
 *  @param {Point2D} p2
 *  @param {Point2D} p3
 *  @param {Point2D} p4
 *  @param {Point2D} a1
 *  @param {Point2D} a2
 *  @returns {Intersection}
 */
module.exports.intersectBezier3Line = function(p1, p2, p3, p4, a1, a2) {
    var a, b, c, d;       // temporary variables
    var c3, c2, c1, c0;   // coefficients of cubic
    var cl;               // c coefficient for normal form of line
    var n;                // normal for normal form of line
    var min = a1.min(a2); // used to determine if point is on line segment
    var max = a1.max(a2); // used to determine if point is on line segment
    var result = new Intersection();

    // Start with Bezier using Bernstein polynomials for weighting functions:
    //     (1-t^3)P1 + 3t(1-t)^2P2 + 3t^2(1-t)P3 + t^3P4
    //
    // Expand and collect terms to form linear combinations of original Bezier
    // controls.  This ends up with a vector cubic in t:
    //     (-P1+3P2-3P3+P4)t^3 + (3P1-6P2+3P3)t^2 + (-3P1+3P2)t + P1
    //             /\                  /\                /\       /\
    //             ||                  ||                ||       ||
    //             c3                  c2                c1       c0

    // Calculate the coefficients
    a = p1.multiply(-1);
    b = p2.multiply(3);
    c = p3.multiply(-3);
    d = a.add(b.add(c.add(p4)));
    c3 = new Vector2D(d.x, d.y);

    a = p1.multiply(3);
    b = p2.multiply(-6);
    c = p3.multiply(3);
    d = a.add(b.add(c));
    c2 = new Vector2D(d.x, d.y);

    a = p1.multiply(-3);
    b = p2.multiply(3);
    c = a.add(b);
    c1 = new Vector2D(c.x, c.y);

    c0 = new Vector2D(p1.x, p1.y);

    // Convert line to normal form: ax + by + c = 0
    // Find normal to line: negative inverse of original line's slope
    n = new Vector2D(a1.y - a2.y, a2.x - a1.x);

    // Determine new c coefficient
    cl = a1.x*a2.y - a2.x*a1.y;

    // ?Rotate each cubic coefficient using line for new coordinate system?
    // Find roots of rotated cubic
    roots = new Polynomial(
        n.dot(c3),
        n.dot(c2),
        n.dot(c1),
        n.dot(c0) + cl
    ).getRoots();

    // Any roots in closed interval [0,1] are intersections on Bezier, but
    // might not be on the line segment.
    // Find intersections and calculate point coordinates
    for ( var i = 0; i < roots.length; i++ ) {
        var t = roots[i];

        if ( 0 <= t && t <= 1 ) {
            // We're within the Bezier curve
            // Find point on Bezier
            var p5 = p1.lerp(p2, t);
            var p6 = p2.lerp(p3, t);
            var p7 = p3.lerp(p4, t);

            var p8 = p5.lerp(p6, t);
            var p9 = p6.lerp(p7, t);

            var p10 = p8.lerp(p9, t);

            // See if point is on line segment
            // Had to make special cases for vertical and horizontal lines due
            // to slight errors in calculation of p10
            if ( a1.x == a2.x ) {
                if ( min.y <= p10.y && p10.y <= max.y ) {
                    result.appendPoint( p10 );
                }
            } else if ( a1.y == a2.y ) {
                if ( min.x <= p10.x && p10.x <= max.x ) {
                    result.appendPoint( p10 );
                }
            } else if (min.x <= p10.x && p10.x <= max.x && min.y <= p10.y && p10.y <= max.y) {
                result.appendPoint( p10 );
            }
        }
    }

    return result;
};


},{"../Intersection":11,"kld-affine":3,"kld-polynomial":7}],14:[function(require,module,exports){
/**
 *
 *  Intersection.js
 *
 *  copyright 2002, 2013 Kevin Lindsey
 *
 *  contribution {@link http://github.com/Quazistax/kld-intersections}
 *      @copyright 2015 Robert Benko (Quazistax) <quazistax@gmail.com>
 *      @license MIT
 */

var Point2D = require('kld-affine').Point2D;
var Vector2D = require('kld-affine').Vector2D;
var Matrix2D = require('kld-affine').Matrix2D;
var Polynomial = require('kld-polynomial').Polynomial;
var IntersectionParams = require('./IntersectionParams');
var Intersection = require('./Intersection');
var bezierIntersectionFunctions = require('./functions/bezier')

var IPTYPE = IntersectionParams.TYPE;



/**
 *  bezout
 *
 *  This code is based on MgcIntr2DElpElp.cpp written by David Eberly.  His
 *  code along with many other excellent examples are avaiable at his site:
 *  http://www.geometrictools.com
 *
 *  @param {Array<Point2D>} e1
 *  @param {Array<Point2D>} e2
 *  @returns {Polynomial}
 */
function bezout(e1, e2) {
    var AB    = e1[0]*e2[1] - e2[0]*e1[1];
    var AC    = e1[0]*e2[2] - e2[0]*e1[2];
    var AD    = e1[0]*e2[3] - e2[0]*e1[3];
    var AE    = e1[0]*e2[4] - e2[0]*e1[4];
    var AF    = e1[0]*e2[5] - e2[0]*e1[5];
    var BC    = e1[1]*e2[2] - e2[1]*e1[2];
    var BE    = e1[1]*e2[4] - e2[1]*e1[4];
    var BF    = e1[1]*e2[5] - e2[1]*e1[5];
    var CD    = e1[2]*e2[3] - e2[2]*e1[3];
    var DE    = e1[3]*e2[4] - e2[3]*e1[4];
    var DF    = e1[3]*e2[5] - e2[3]*e1[5];
    var BFpDE = BF + DE;
    var BEmCD = BE - CD;

    return new Polynomial(
        AB*BC - AC*AC,
        AB*BEmCD + AD*BC - 2*AC*AE,
        AB*BFpDE + AD*BEmCD - AE*AE - 2*AC*AF,
        AB*DF + AD*BFpDE - 2*AE*AF,
        AD*DF - AF*AF
    );
}

/**
    Removes from intersection points those points that are not between two rays determined by arc parameters.
    Rays begin at ellipse center and go through arc startPoint/endPoint.

    @param {Intersection} intersection - will be modified and returned
    @param {Point2D} c - center of arc ellipse
    @param {Number} rx
    @param {Number} ry
    @param {Number} phi - in radians
    @param {Number} th1 - in radians
    @param {Number} dth - in radians
    @param {Matrix2D} [m] - arc transformation matrix
    @returns {Intersection}
*/
function removePointsNotInArc(intersection, c, rx, ry, phi, th1, dth, m) {
    if (intersection.points.length === 0) return intersection;
    if (m && !m.isIdentity())
        var mp = m.inverse();
    var np = [];
    var vx = new Vector2D(1, 0);
    var pi2 = Math.PI * 2;
    var wasNeg = dth < 0;
    var wasBig = Math.abs(dth) > Math.PI;
    var m1 = new Matrix2D().scaleNonUniform(1, ry / rx).rotate(th1);
    var m2 = new Matrix2D().scaleNonUniform(1, ry / rx).rotate(th1 + dth);

    th1 = (vx.angleBetween(vx.transform(m1)) + pi2) % pi2;
    dth = vx.transform(m1).angleBetween(vx.transform(m2));
    dth = (wasBig ? pi2 - Math.abs(dth) : Math.abs(dth)) * (wasNeg ? -1 : 1);
    var m3 = new Matrix2D().rotate(phi).multiply(m1);

    for (var i = 0, p, a; i < intersection.points.length; i++) {
        p = intersection.points[i];
        a = vx.transform(m3).angleBetween(Vector2D.fromPoints(c, (mp) ? p.transform(mp) : p));
        if (dth >= 0) {
            a = (a + 2 * pi2) % pi2;
            if (a <= dth)
                np.push(p);
        } else {
            a = (a - 2 * pi2) % pi2;
            if (a >= dth)
                np.push(p);
        }
    }
    intersection.points = np;
    return intersection;
};

/**
    points1 will be modified, points close (almost identical) to any point in points2 will be removed

    @param {Array<Point2D>} points1 - will be modified, points close to any point in points2 will be removed
    @param {Array<Point2D>} points2
*/
function removeClosePoints(points1, points2) {
    if (points1.length === 0 || points2.length === 0)
        return;
    var maxf = function (p, v) { if (p < v.x) p = v.x; if (p < v.y) p = v.y; return p; };
    var max = points1.reduce(maxf, 0);
    max = points2.reduce(maxf, max);
    var ERRF = 1e-15;
    var ZEROepsilon = 100 * max * ERRF * Math.SQRT2;
    var j;
    for (var i = 0; i < points1.length;) {
        for (j = 0; j < points2.length; j++) {
            if (points1[i].distanceFrom(points2[j]) <= ZEROepsilon) {
                points1.splice(i, 1);
                break;
            }
        }
        if (j == points2.length)
            i++;
    }
}

var intersectionFunctions = {

    /**
        intersectPathShape

        @param {IntersectionParams} path
        @param {IntersectionParams} shape
        @param {Matrix2D} [m1]
        @param {Matrix2D} [m2]
        @returns {Intersection}
    */
    intersectPathShape: function (path, shape, m1, m2) {
        var result = new Intersection();
        var pathParams = path.params[0];
        var inter0;
        var previnter;
        for (var inter, i = 0; i < pathParams.length; i++) {
            inter = intersect(pathParams[i], shape, m1, m2);
            if (!inter0)
                inter0 = inter;
            if (previnter) {
                removeClosePoints(previnter.points, inter.points);
                result.appendPoints(previnter.points);
            }
            previnter = inter;
        }
        if (previnter) {
            result.appendPoints(previnter.points);
        }
        return result;
    },


    /**
        intersectLinesShape

        @param {IntersectionParams} lines - IntersectionParams with points as first parameter (like types RECT, POLYLINE or POLYGON)
        @param {IntersectionParams} shape - IntersectionParams of other shape
        @param {Matrix2D} [m1]
        @param {Matrix2D} [m2]
        @param {Boolean} [closed] - if set, determines if line between first and last point will be taken into callculation too. If not set, it's true for RECT and POLYGON, false for other <b>lines</b> types.
        @returns {Intersection}
    */
    intersectLinesShape: function (lines, shape, m1, m2, closed) {
        var IPTYPE = IntersectionParams.TYPE;
        var line_points = lines.params[0];
        var ip = new IntersectionParams(IPTYPE.LINE, [0, 0]);
        var result = new Intersection();
        var inter, i;
        var intersectLine = function (i1, i2) {
            ip.params[0] = line_points[i1];
            ip.params[1] = line_points[i2];
            inter = intersect(ip, shape, m1, m2);
            removeClosePoints(inter.points, [line_points[i2]]);
            result.appendPoints(inter.points);
        }
        for (i = 0; i < line_points.length - 1; i++) {
            intersectLine(i, i + 1);
        }
        if (typeof closed !== 'undefined' && closed || lines.type === IPTYPE.RECT || lines.type === IPTYPE.POLYGON) {
            intersectLine(line_points.length - 1, 0);
        }
        return result;
    },

    ///////////////////////////////////////////////////////////////////
    /**
        intersectArcShape

        @param {IntersectionParams} arc
        @param {IntersectionParams} shape
        @param {Matrix2D} [m1]
        @param {Matrix2D} [m2]
        @returns {Intersection}
    */
    intersectArcShape: function (arc, shape, m1, m2) {
        m1 = m1 || Matrix2D.IDENTITY;
        m2 = m2 || Matrix2D.IDENTITY;
        var c1 = arc.params[0],
            rx1 = arc.params[1],
            ry1 = arc.params[2],
            phi1 = arc.params[3],
            th1 = arc.params[4],
            dth1 = arc.params[5];

        var res;
        if (m1.isIdentity() && phi1 === 0) {
            res = intersect(IntersectionParams.newEllipse(c1, rx1, ry1), shape, m1, m2);
        }
        else {
            m1 = m1.multiply(Matrix2D.IDENTITY.translate(c1.x, c1.y).rotate(phi1));
            c1 = new Point2D(0, 0);
            phi1 = 0;
            res = intersect(IntersectionParams.newEllipse(c1, rx1, ry1), shape, m1, m2);
        }
        res = removePointsNotInArc(res, c1, rx1, ry1, phi1, th1, dth1, m1);
        return res;
    },

    /**
     *  Finds intersection points of two ellipses. <br/>
     *
     *  This code is based on MgcIntr2DElpElp.cpp written by David Eberly. His
     *  code along with many other excellent examples are avaiable at his site:
     *  http://www.geometrictools.com
     *
     *  Changes - 2015 Robert Benko (Quazistax)
     *
     *  @param {Point2D} c1
     *  @param {Number} rx1
     *  @param {Number} ry1
     *  @param {Point2D} c2
     *  @param {Number} rx2
     *  @param {Number} ry2
     *  @returns {Intersection}
     */
    intersectEllipseEllipse: function (c1, rx1, ry1, c2, rx2, ry2) {
        var a = [
            ry1 * ry1, 0, rx1 * rx1, -2 * ry1 * ry1 * c1.x, -2 * rx1 * rx1 * c1.y,
            ry1 * ry1 * c1.x * c1.x + rx1 * rx1 * c1.y * c1.y - rx1 * rx1 * ry1 * ry1
        ];
        var b = [
            ry2 * ry2, 0, rx2 * rx2, -2 * ry2 * ry2 * c2.x, -2 * rx2 * rx2 * c2.y,
            ry2 * ry2 * c2.x * c2.x + rx2 * rx2 * c2.y * c2.y - rx2 * rx2 * ry2 * ry2
        ];

        var yPoly = bezout(a, b);
        var yRoots = yPoly.getRoots();
        var epsilon = 1e-3;
        var norm0 = (a[0] * a[0] + 2 * a[1] * a[1] + a[2] * a[2]) * epsilon;
        var norm1 = (b[0] * b[0] + 2 * b[1] * b[1] + b[2] * b[2]) * epsilon;
        var result = new Intersection();

        var i;
        //Handling root calculation error causing not detecting intersection
        var clip = function (val, min, max) { return Math.max(min, Math.min(max, val)); };
        for (i = 0 ; i < yRoots.length; i++) {
            yRoots[i] = clip(yRoots[i], c1.y - ry1, c1.y + ry1);
            yRoots[i] = clip(yRoots[i], c2.y - ry2, c2.y + ry2);
        }

        //For detection of multiplicated intersection points
        yRoots.sort(function (a, b) { return a - b; });
        var rootPointsN = [];

        for (var y = 0; y < yRoots.length; y++) {
            var xPoly = new Polynomial(
                a[0],
                a[3] + yRoots[y] * a[1],
                a[5] + yRoots[y] * (a[4] + yRoots[y] * a[2])
            );
            var ERRF = 1e-15;
            if (Math.abs(xPoly.coefs[0]) < 10 * ERRF * Math.abs(xPoly.coefs[2]))
                xPoly.coefs[0] = 0;
            var xRoots = xPoly.getRoots();

            rootPointsN.push(0);
            for (var x = 0; x < xRoots.length; x++) {
                var test =
                    (a[0] * xRoots[x] + a[1] * yRoots[y] + a[3]) * xRoots[x] +
                    (a[2] * yRoots[y] + a[4]) * yRoots[y] + a[5];
                if (Math.abs(test) < norm0) {
                    test =
                        (b[0] * xRoots[x] + b[1] * yRoots[y] + b[3]) * xRoots[x] +
                        (b[2] * yRoots[y] + b[4]) * yRoots[y] + b[5];
                    if (Math.abs(test) < norm1) {
                        result.appendPoint(new Point2D(xRoots[x], yRoots[y]));
                        rootPointsN[y] += 1;
                    }
                }
            }
        }

        if (result.points.length <= 0)
            return result;

        //Removal of multiplicated intersection points
        var pts = result.points;
        if (pts.length == 8) {
            pts = pts.splice(0, 6);
            pts.splice(2, 2);
        }
        else if (pts.length == 7) {
            pts = pts.splice(0, 6);
            pts.splice(2, 2);
            pts.splice(rootPointsN.indexOf(1), 1);
        }
        else if (pts.length == 6) {
            pts.splice(2, 2);
            //console.log('ElEl 6pts: N: ' + rootPointsN.toString());
            if (rootPointsN.indexOf(0) > -1) {
                if (pts[0].distanceFrom(pts[1]) < pts[2].distanceFrom(pts[3])) {
                    pts.splice(0, 1);
                }
                else {
                    pts.splice(2, 1);
                }
            }
            else if (rootPointsN[0] == rootPointsN[3]) {
                pts.splice(1, 2);
            }
        }
        else if (pts.length == 4) {
            if (
                (yRoots.length == 2)
            || (yRoots.length == 4 && (rootPointsN[0] == 2 && rootPointsN[1] == 2 || rootPointsN[2] == 2 && rootPointsN[3] == 2))
            ) {
                pts.splice(2, 2);
            }
        }
        else if (pts.length == 3 || pts.length == 5) {
            i = rootPointsN.indexOf(2);
            if (i > -1) {
                if (pts.length == 3)
                    i = i % 2;
                var ii = i + (i % 2 ? -1 : 2);
                var d1, d2, d3;
                d1 = pts[i].distanceFrom(pts[i + 1]);
                d2 = pts[i].distanceFrom(pts[ii]);
                d3 = pts[i + 1].distanceFrom(pts[ii]);
                if (d1 < d2 && d1 < d3) {
                    pts.splice(i, 1);
                }
                else {
                    pts.splice(ii, 1);
                }
            }
        }

        var poly = yPoly;
        var ZEROepsilon = yPoly.zeroErrorEstimate();
        ZEROepsilon *= 100 * Math.SQRT2;
        for (i = 0; i < pts.length - 1;) {
            if (pts[i].distanceFrom(pts[i + 1]) < ZEROepsilon) {
                pts.splice(i + 1, 1);
                continue;
            }
            i++;
        }

        result.points = pts;
        return result;
    },


    /**
     *  intersectEllipseLine
     *
     *  NOTE: Rotation will need to be added to this function
     *
     *  @param {Point2D} c
     *  @param {Number} rx
     *  @param {Number} ry
     *  @param {Point2D} a1
     *  @param {Point2D} a2
     *  @returns {Intersection}
     */
    intersectEllipseLine: function(c, rx, ry, a1, a2) {
        var result;
        var origin = new Vector2D(a1.x, a1.y);
        var dir    = Vector2D.fromPoints(a1, a2);
        var center = new Vector2D(c.x, c.y);
        var diff   = origin.subtract(center);
        var mDir   = new Vector2D( dir.x/(rx*rx),  dir.y/(ry*ry)  );
        var mDiff  = new Vector2D( diff.x/(rx*rx), diff.y/(ry*ry) );

        var a = dir.dot(mDir);
        var b = dir.dot(mDiff);
        var c = diff.dot(mDiff) - 1.0;
        var d = b*b - a*c;

        var ERRF = 1e-15;
        var ZEROepsilon = 10 * Math.max(Math.abs(a), Math.abs(b), Math.abs(c)) * ERRF;
        if (Math.abs(d) < ZEROepsilon) {
            d = 0;
        }

        if ( d < 0 ) {
            result = new Intersection("Outside");
        } else if ( d > 0 ) {
            var root = Math.sqrt(d);
            var t_a  = (-b - root) / a;
            var t_b  = (-b + root) / a;

            t_b = (t_b > 1) ? t_b - ERRF : (t_b < 0) ? t_b + ERRF : t_b;
            t_a = (t_a > 1) ? t_a - ERRF : (t_a < 0) ? t_a + ERRF : t_a;

            if ( (t_a < 0 || 1 < t_a) && (t_b < 0 || 1 < t_b) ) {
                if ( (t_a < 0 && t_b < 0) || (t_a > 1 && t_b > 1) )
                    result = new Intersection("Outside");
                else
                    result = new Intersection("Inside");
            } else {
                result = new Intersection();
                if ( 0 <= t_a && t_a <= 1 )
                    result.appendPoint( a1.lerp(a2, t_a) );
                if ( 0 <= t_b && t_b <= 1 )
                    result.appendPoint( a1.lerp(a2, t_b) );
            }
        } else {
            var t = -b/a;
            if ( 0 <= t && t <= 1 ) {
                result = new Intersection();
                result.appendPoint( a1.lerp(a2, t) );
            } else {
                result = new Intersection("Outside");
            }
        }

        return result;
    },


    /**
     *  intersectLineLine
     *
     *  @param {Point2D} a1
     *  @param {Point2D} a2
     *  @param {Point2D} b1
     *  @param {Point2D} b2
     *  @returns {Intersection}
     */
    intersectLineLine: function(a1, a2, b1, b2) {
        var result;
        var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
        var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
        var u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

        if ( u_b !== 0 ) {
            var ua = ua_t / u_b;
            var ub = ub_t / u_b;

            if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
                result = new Intersection();
                result.points.push(
                    new Point2D(
                        a1.x + ua * (a2.x - a1.x),
                        a1.y + ua * (a2.y - a1.y)
                    )
                );
            } else {
                result = new Intersection();
            }
        } else {
            if ( ua_t === 0 || ub_t === 0 ) {
                result = new Intersection("Coincident");
            } else {
                result = new Intersection("Parallel");
            }
        }

        return result;
    },


    /**
     *  intersectRayRay
     *
     *  @param {Point2D} a1
     *  @param {Point2D} a2
     *  @param {Point2D} b1
     *  @param {Point2D} b2
     *  @returns {Intersection}
     */
    intersectRayRay: function(a1, a2, b1, b2) {
        var result;

        var ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x);
        var ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x);
        var u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);

        if ( u_b !== 0 ) {
            var ua = ua_t / u_b;

            result = new Intersection();
            result.points.push(
                new Point2D(
                    a1.x + ua * (a2.x - a1.x),
                    a1.y + ua * (a2.y - a1.y)
                )
            );
        } else {
            if ( ua_t === 0 || ub_t === 0 ) {
                result = new Intersection("Coincident");
            } else {
                result = new Intersection("Parallel");
            }
        }

        return result;
    }
};

var composedShapeMethods = {};
composedShapeMethods[IPTYPE.PATH] = intersectionFunctions.intersectPathShape;
composedShapeMethods[IPTYPE.POLYLINE] = intersectionFunctions.intersectLinesShape;
composedShapeMethods[IPTYPE.POLYGON] = intersectionFunctions.intersectLinesShape;
composedShapeMethods[IPTYPE.RECT] = intersectionFunctions.intersectLinesShape;
composedShapeMethods[IPTYPE.ROUNDRECT] = intersectionFunctions.intersectPathShape;
composedShapeMethods[IPTYPE.ARC] = intersectionFunctions.intersectArcShape;



function intersect(shape1, shape2, m1, m2) {
    var ip1 = shape1;
    var ip2 = shape2;
    var result;

    if (ip1 !== null && ip2 !== null) {
        var method;
        if (method = composedShapeMethods[ip1.type]) {
            result = method(ip1, ip2, m1, m2);
        }
        else if (method = composedShapeMethods[ip2.type]) {
            result = method(ip2, ip1, m2, m1);
        }
        else {
            var params;

            var params1, params2, type1, type2;

            if (ip1.type === IPTYPE.CIRCLE) {
                params1 = [ip1.params[0], ip1.params[1], ip1.params[1]];
                type1 = IPTYPE.ELLIPSE;
            }
            else {
                params1 = ip1.params.slice();
                type1 = ip1.type;
            }

            if (ip2.type === IPTYPE.CIRCLE) {
                params2 = [ip2.params[0], ip2.params[1], ip2.params[1]];
                type2 = IPTYPE.ELLIPSE;
            }
            else {
                params2 = ip2.params.slice();
                type2 = ip2.type;
            }

            //var m1 = new Matrix2D(), m2 = new Matrix2D();
            var SMF = 1;
            var itm;
            var useCTM = (m1 instanceof Matrix2D && m2 instanceof Matrix2D);// && (!m1.isIdentity() || !m2.isIdentity()));
            if (useCTM) {
                if (type1 === IPTYPE.ELLIPSE && type2 === IPTYPE.ELLIPSE) {
                    var m1_, m2_;
                    var d2;
                    var c1 = params1[0], rx1 = params1[1], ry1 = params1[2];
                    var c2 = params2[0], rx2 = params2[1], ry2 = params2[2];

                    m1 = m1.multiply(Matrix2D.IDENTITY.translate(c1.x, c1.y).scaleNonUniform(rx1 / SMF, ry1 / SMF));
                    c1 = new Point2D(0, 0);
                    rx1 = ry1 = SMF;

                    m2 = m2.multiply(Matrix2D.IDENTITY.translate(c2.x, c2.y).scaleNonUniform(rx2, ry2));
                    c2 = new Point2D(0, 0);
                    rx2 = ry2 = 1;

                    d2 = m1.inverse().multiply(m2).getDecomposition();
                    m1_ = d2.rotation.inverse().multiply(d2.translation.inverse());
                    m2_ = d2.scale;

                    rx2 = m2_.a;
                    ry2 = m2_.d;
                    c1 = c1.transform(m1_);
                    itm = m1.multiply(m1_.inverse());

                    params1[0] = c1;
                    params1[1] = rx1;
                    params1[2] = ry1;
                    params2[0] = c2;
                    params2[1] = rx2;
                    params2[2] = ry2;
                }
                else {
                    var transParams = function (type, params, m) {
                        var transParam = function (i) {
                            params[i] = params[i].transform(m);
                        }

                        if (type === IPTYPE.LINE) {
                            transParam(0);
                            transParam(1);
                        }
                        else if (type === IPTYPE.BEZIER2) {
                            transParam(0);
                            transParam(1);
                            transParam(2);
                        }
                        else if (type === IPTYPE.BEZIER3) {
                            transParam(0);
                            transParam(1);
                            transParam(2);
                            transParam(3);
                        }
                        else {
                            throw new Error('Unknown shape: ' + type);
                        }
                    }

                    if (type2 === IPTYPE.ELLIPSE) {
                        var tmp;
                        tmp = params2; params2 = params1; params1 = tmp;
                        tmp = type2; type2 = type1; type1 = tmp;
                        tmp = m2; m2 = m1; m1 = tmp;
                    }

                    if (type1 === IPTYPE.ELLIPSE) {
                        var c1 = params1[0], rx1 = params1[1], ry1 = params1[2];

                        m1 = m1.multiply(Matrix2D.IDENTITY.translate(c1.x, c1.y).scaleNonUniform(rx1 / SMF, ry1 / SMF));
                        c1 = new Point2D(0, 0);
                        rx1 = ry1 = SMF;

                        m2_ = m1.inverse().multiply(m2);
                        transParams(type2, params2, m2_);

                        itm = m1;

                        params1[0] = c1;
                        params1[1] = rx1;
                        params1[2] = ry1;
                    }
                    else {
                        transParams(type1, params1, m1);
                        transParams(type2, params2, m2);
                        itm = Matrix2D.IDENTITY;
                    }
                }
            }

            if (type1 < type2) {
                method = "intersect" + type1 + type2;
                params = params1.concat(params2);
            } else {
                method = "intersect" + type2 + type1;
                params = params2.concat(params1);
            }

            result = intersectionFunctions[method].apply(null, params);

            if (useCTM) {
                for (var i = 0; i < result.points.length; i++) {
                    result.points[i] = result.points[i].transform(itm);
                }
            }
        }
    } else {
        result = new Intersection();
    }

    return result;
}

for(var key in bezierIntersectionFunctions) {
    if(bezierIntersectionFunctions.hasOwnProperty(key)) {
        intersectionFunctions[key] = bezierIntersectionFunctions[key];
    }
}

module.exports = intersect;

},{"./Intersection":11,"./IntersectionParams":12,"./functions/bezier":13,"kld-affine":3,"kld-polynomial":7}]},{},[1]);
