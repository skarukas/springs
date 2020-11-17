
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
}

export default userPreferences