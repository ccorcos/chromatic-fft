import * as React from "react"
import * as ReactDOM from "react-dom"
import { css } from "glamor"
import * as wave from "./wave2.mp3"
import * as song from "./song.mp3"
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
	private song = new Value(wave)

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
				{this.song.get() === wave && (
					<button onClick={() => this.song.set(song)}>song</button>
				)}
				{this.song.get() === song && (
					<button onClick={() => this.song.set(wave)}>wave</button>
				)}
				<audio ref={this.handleRef} src={this.song.get()} controls={true} />
				<div>
					{fftValue.get().map((x, i) => {
						const width = 20
						const height = 80
						const style: React.CSSProperties = {
							display: "inline-block",
							border: "1px solid black",
							boxSizing: "border-box",
						}
						const note = i % 12
						switch (note) {
							// White Notes
							case 0:
							case 2:
							case 4:
							case 5:
							case 7:
							case 9:
							case 11: {
								style.height = height
								style.width = width
							}
						}

						switch (note) {
							// Black Notes
							case 1:
							case 3:
							case 6:
							case 8:
							case 10: {
								style.height = height * 0.6
								style.width = width * 0.6
								style.marginBottom = height * 0.4
							}
						}

						switch (note) {
							// Black notes to the right
							case 0:
							case 2:
							case 5:
							case 7:
							case 9: {
								style.marginRight = -width * 0.3
							}
						}

						switch (note) {
							// Black notes to the left
							case 2:
							case 4:
							case 7:
							case 9:
							case 11: {
								style.marginLeft = -width * 0.3
							}
						}

						style.background = `rgba(0,0,255,${x * 50})`

						return <div key={i} style={style} />
					})}
				</div>
			</div>
		)
	}
}

const div = document.getElementById("root") as HTMLDivElement
ReactDOM.render(<App />, div)
