import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const MoodChart = () => {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#1f2937',
                bodyColor: '#4b5563',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                usePointStyle: true,
                callbacks: {
                    label: function (context) {
                        const moodMap = { 4: 'Happy', 3: 'Calm', 2: 'Anxious', 1: 'Sad' };
                        return `Mood: ${moodMap[context.raw]}`;
                    }
                }
            },
        },
        scales: {
            y: {
                min: 0.5,
                max: 4.5,
                ticks: {
                    stepSize: 1,
                    callback: function (value) {
                        const moodMap = { 4: 'Happy', 3: 'Calm', 2: 'Anxious', 1: 'Sad' };
                        return moodMap[value] || '';
                    },
                    font: {
                        size: 12,
                        family: "'Inter', sans-serif"
                    },
                    color: '#6b7280'
                },
                grid: {
                    color: '#f3f4f6',
                    drawBorder: false,
                }
            },
            x: {
                grid: {
                    display: false,
                    drawBorder: false,
                },
                ticks: {
                    font: {
                        size: 12,
                        family: "'Inter', sans-serif"
                    },
                    color: '#9ca3af'
                }
            }
        },
        tension: 0.4,
    };

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const data = {
        labels,
        datasets: [
            {
                fill: true,
                label: 'Mood Level',
                data: [3, 2, 4, 3, 3, 4, 3],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                pointRadius: 4,
            },
        ],
    };

    return <Line options={options} data={data} />;
};

export default MoodChart;
