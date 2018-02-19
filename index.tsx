import * as React from "react"
import * as ReactDOM from "react-dom"
import { css } from "glamor"
// Wave goes from midi notes 48-96
import * as song from "./wave2.mp3"
import Component from "reactive-magic/component"
import { Value } from "reactive-magic"
import * as _ from "lodash"

const fftValue = new Value<Array<number>>(Array(88).fill(0))
const context = new AudioContext()
const processor = context.createScriptProcessor(4096, 1, 1)

processor.onaudioprocess = function(event) {
	const inputBuffer = event.inputBuffer
	const outputBuffer = event.outputBuffer
	const channel = 0

	// data is -1 to 1
	const inputData = inputBuffer.getChannelData(channel)
	const outputData = outputBuffer.getChannelData(channel)
	for (let sample = 0; sample < inputBuffer.length; sample++) {
		outputData[sample] = inputData[sample]
	}
	computeFFT(Array.from(inputData))
}

interface ComplexNumber {
	real: number
	imaginary: number
}

const a = 0.54
const b = 1 - a
function window(buffer: Array<number>) {
	for (let i = 0; i < buffer.length; i++) {
		// Hamming window
		buffer[i] =
			buffer[i] * (a - b * Math.cos(2 * Math.PI * i / (buffer.length - 1)))
	}
}

function fourierSeries(buffer: Array<number>, freq: number) {
	const sum = { real: 0, imaginary: 0 }
	for (let i = 0; i < buffer.length; i++) {
		// Fourier Series
		// buffer[time] * Math.exp(-i * 2 * Math.PI * freq * time)

		// Eulers Formula
		// e^(i*x) = cos(x) + i * sin(x)

		const time = i / context.sampleRate
		const theta = -2 * Math.PI * freq * time

		sum.real += buffer[i] * Math.cos(theta)
		sum.imaginary += buffer[i] * Math.sin(theta)
	}
	return (
		Math.sqrt(sum.real * sum.real + sum.imaginary * sum.imaginary) /
		buffer.length
	)
}

function midiToFreq(midi: number) {
	return 27.5 * Math.pow(2, (midi - 21) / 12)
}

function computeFFT(buffer: Array<number>) {
	window(buffer)

	const fft = fftValue.get()
	for (let i = 0; i < 88; i++) {
		// Piano notes range from 21 - 108
		fft[i] = fourierSeries(buffer, midiToFreq(i + 21))
	}

	fftValue.set(fft)
}

class App extends Component {
	private handleRef = (node: HTMLAudioElement | null) => {
		if (node) {
			const source = context.createMediaElementSource(node)
			source.connect(processor)
			processor.connect(context.destination)
		}
	}

	view() {
		return (
			<div>
				<audio ref={this.handleRef} src={song} controls={true} />
				<div>
					{fftValue.get().map((x, i) => {
						return (
							<div
								key={i}
								style={{
									display: "inline-block",
									background: `rgba(0,0,255,${x * 4})`,
									border: "1px solid black",
									height: 20,
									width: 20,
								}}
							/>
						)
					})}
				</div>
			</div>
		)
	}
}

const div = document.getElementById("root") as HTMLDivElement
ReactDOM.render(<App />, div)
