// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);
const App: React.FC = () => {
    const [voiceStatus, setVoiceStatus] = useState<string[]>([]);
    const [audioData, setAudioData] = useState<number[]>([]);
    const maxStatusLength = 10;
    const maxDataPoints = 20;

    useEffect(() => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const resumeAudioContext = async () => {
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
        };

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                resumeAudioContext();

                const mediaStreamSource = audioContext.createMediaStreamSource(stream);
                const processor = audioContext.createScriptProcessor(1024, 1, 1);

                mediaStreamSource.connect(processor);
                processor.connect(audioContext.destination);

                processor.onaudioprocess = (event: AudioProcessingEvent) => {
                    const inputBuffer = event.inputBuffer;
                    const inputData = inputBuffer.getChannelData(0);

                    let sum = 0;
                    for (let i = 0; i < inputData.length; i++) {
                        sum += inputData[i] ** 2;
                    }
                    const energy = sum / inputData.length;

                    const calibratedThreshold = 0.002;
                    const newStatus = energy > calibratedThreshold ? 'Speech' : 'Silence or Noise';

                    setVoiceStatus(prevStatus => {
                        const updatedStatus = [...prevStatus, newStatus];
                        if (updatedStatus.length > maxStatusLength) {
                            updatedStatus.shift();
                        }
                        return updatedStatus;
                    });

                    setAudioData(prevData => {
                        const updatedData = [...prevData, energy];
                        if (updatedData.length > maxDataPoints) {
                            updatedData.shift();
                        }
                        return updatedData;
                    });
                };
            })
            .catch(err => {
                console.error(`Error: ${err.message}`);
            });

        document.addEventListener('click', resumeAudioContext);

        return () => {
            // Cleanup if necessary
        };
    }, []);

    const chartData = {
        labels: new Array(audioData.length).fill(''),
        datasets: [{
            label: 'Audio Energy',
            data: audioData,
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            fill: false,
        }],
    };

    const chartOptions = {
        scales: {
            x: {
                type: 'linear', // Setting the type explicitly to 'linear'
                display: false,
            },
            y: {
                min: 0,
                max: 0.01,
            },
        },
    };

    return (
        <div>
            <h1>POC Voice Detection</h1>
            <ul>
                {voiceStatus.map((status, index) => <li key={index}>{status}</li>)}
            </ul>
            <Line style={{maxHeight: 800}} data={chartData} options={chartOptions} />
        </div>
    );
};

export default App;
