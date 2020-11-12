/**
 * Model the predicted sequence of JI (or other) 
 *   intervals as a hidden Markov model, with
 *   interval classes as observed variables
 *   and the sequence moving upwards in pitch
 */

const instances = { }
const states = new Set()

const model = {
    // viterbi algorithm
    // input: interval classes ascending
    predictSequence(observedStates) {
        let v = []
        let n = observedStates.length
        
        for (let t = 0; t < n; t++) {
            v[t] = {}
            for (let state of states) {
                let emission = p(observedStates[t], state)
                console.log(observedStates[t] + " | " + state, emission)
                let best = {
                    prob: -1,
                    path: []
                }

                if (t == 0) {
                    best = {
                        prob: p(state),
                        path: []
                    }
                } else {
                    for (let prevState of states) {
                        let last = v[t-1][prevState]
                        let prob = last.prob * p(state, prevState)
                        console.log(last.prob + " * " + state + " | " + prevState, p(state, prevState))
                        if (prob > best.prob) {
                            best = {
                                prob: prob,
                                path: last.path
                            }
                        }
                    }
                }

                v[t][state] = {
                    prob: emission * best.prob,
                    path: best.path.concat(state)
                }
            }
        }
        console.log(v)
        let best = { prob: -1, path: [] }
        // recover max path
        for (let state in v[n-1]) {
            if (v[n-1][state].prob > best.prob) best = v[n-1][state]
        }

        return best.path
    },
    recordState(observed, state, prevState) {
        model.updateProbability()                // add to universal
        model.updateProbability(state)           // Q[i]
        model.updateProbability(observed, state) // O[i] and Q[i])
        if (prevState) model.updateProbability(state, prevState) // Q[i] and Q[i-1]
        states.add(state.toString())
        console.log(instances)
    },
    updateProbability(event="U", sampleSpace) {
        event = event.toString()
        let key = sampleSpace? event + " " + sampleSpace.toString() : event
        instances[key] = (instances[key] ?? 0) + 1
    }
}


// conditional or marginal probability
function p(event, sampleSpace) {
    if (sampleSpace) {
        let jointString = event.toString() + " " + sampleSpace.toString()
        if (instances[jointString] && instances[sampleSpace.toString()]) {
            return instances[jointString] / instances[sampleSpace.toString()]
        } else {
            // hacky way to get tiny conditional scaled by marginal
            return p(event) / instances["U"]
        }
    } else {
        return instances[event.toString()] / instances["U"]
    }
}

export default model