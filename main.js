let tfLoaded = false;
let chartLoaded = false;
let currentChart = null;

// Check if libraries are loaded
function checkLibrariesLoaded() {
  if (typeof tf !== 'undefined') {
    tfLoaded = true;
    console.log('TensorFlow.js loaded successfully');
  }
  if (typeof Chart !== 'undefined') {
    chartLoaded = true;
    console.log('Chart.js loaded successfully');
  }
  
  if (tfLoaded && chartLoaded) {
    document.getElementById('predictBtn').disabled = false;
    document.getElementById('predictionOutput').innerText = 'Ready to make predictions!';
  } else {
    setTimeout(checkLibrariesLoaded, 100);
  }
}

// Start checking when page loads
window.addEventListener('load', function() {
  document.getElementById('predictBtn').disabled = true;
  checkLibrariesLoaded();
});

async function loadModel() {
  try {
    const model = await tf.loadLayersModel('./model/model.json');
    console.log('Model loaded successfully');
    console.log('Expected input shape:', model.inputs[0].shape);
    return model;
  } catch (error) {
    console.error('Error loading model:', error);
    throw new Error('Could not load model. Make sure model.json and weights are in the correct location.');
  }
}

// Auto-generate dummy input based on model input shape
async function getInputMatchingModel(model, ticker) {
  const inputSize = model.inputs[0].shape[1];  // Get the actual required input size
  console.log(`Model expects ${inputSize} features`);
  
  const basePatterns = {
    AAPL: (i) => Math.sin(i * 0.1) * 0.3 + 0.6,
    TSLA: (i) => Math.cos(i * 0.15) * 0.4 + 0.5,
    MSFT: (i) => Math.sin(i * 0.08) * 0.2 + 0.7,
    GOOGL: (i) => Math.cos(i * 0.12) * 0.3 + 0.65,
    AMZN: (i) => Math.sin(i * 0.09) * 0.35 + 0.55
  };

  // Use pattern function or default to AAPL
  const patternFn = basePatterns[ticker] || basePatterns['AAPL'];
  
  // Generate the exact number of features needed
  const features = Array.from({length: inputSize}, (_, i) => {
    const baseValue = patternFn(i);
    // Add some noise to make it more realistic
    const noise = (Math.random() - 0.5) * 0.1;
    return Math.max(0, Math.min(1, baseValue + noise)); // Keep values between 0 and 1
  });

  console.log(`Generated ${features.length} features for ${ticker}`);
  return tf.tensor2d([features]);  // shape: [1, inputSize]
}

async function predict() {
  let model = null;
  let input = null;
  let prediction = null;
  
  try {
    // Check if TensorFlow.js is available
    if (typeof tf === 'undefined') {
      throw new Error('TensorFlow.js is not loaded yet. Please wait...');
    }
    
    const ticker = document.getElementById('ticker').value.trim().toUpperCase();
    if (!ticker) {
      throw new Error('Please enter a stock ticker symbol');
    }
    
    // Show loading state
    document.getElementById('predictionOutput').innerText = "Loading model and making prediction...";
    document.getElementById('predictBtn').disabled = true;
    
    // Load model and make prediction
    model = await loadModel();
    input = await getInputMatchingModel(model, ticker);
    prediction = model.predict(input);
    
    // Get the prediction result
    const arr = await prediction.array();
    const value = arr[0][0];
    
    // Display result
    document.getElementById('predictionOutput').innerText = 
      `${ticker} Prediction: $${value.toFixed(2)}`;
    
    updateChart(value, ticker);
    
  } catch (error) {
    console.error('Prediction error:', error);
    document.getElementById('predictionOutput').innerText = 
      `Error: ${error.message}`;
  } finally {
    // Clean up tensors to prevent memory leaks
    if (input) input.dispose();
    if (prediction) prediction.dispose();
    
    // Re-enable button
    document.getElementById('predictBtn').disabled = false;
  }
}

function updateChart(predictedValue, ticker) {
  const ctx = document.getElementById('stockChart').getContext('2d');
  
  // Destroy existing chart if it exists
  if (currentChart) {
    currentChart.destroy();
  }
  
  // Generate some dummy historical data for visualization
  const historicalData = Array.from({length: 24}, (_, i) => {
    const basePrice = 150;
    const trend = Math.sin(i * 0.3) * 10;
    const noise = (Math.random() - 0.5) * 8;
    return Math.max(100, basePrice + trend + noise);
  });
  
  const labels = Array.from({length: 24}, (_, i) => `-${24-i}h`);
  labels.push('Now', '+1h');
  
  const currentPrice = historicalData[historicalData.length - 1];
  const allData = [...historicalData, currentPrice, predictedValue];
  
  currentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `${ticker} Price History & Prediction`,
        data: allData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: false,
        tension: 0.1,
        pointBackgroundColor: (ctx) => {
          return ctx.dataIndex === ctx.dataset.data.length - 1 ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)';
        },
        pointBorderColor: (ctx) => {
          return ctx.dataIndex === ctx.dataset.data.length - 1 ? 'rgb(220, 38, 38)' : 'rgb(37, 99, 235)';
        },
        pointRadius: (ctx) => {
          return ctx.dataIndex === ctx.dataset.data.length - 1 ? 8 : 4;
        },
        pointBorderWidth: (ctx) => {
          return ctx.dataIndex === ctx.dataset.data.length - 1 ? 3 : 1;
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { 
        y: { 
          beginAtZero: false,
          title: {
            display: true,
            text: 'Price ($)',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time',
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const isPrediction = context.dataIndex === context.dataset.data.length - 1;
              const prefix = isPrediction ? 'Predicted: ' : 'Price: ';
              return prefix + '$' + context.parsed.y.toFixed(2);
            }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });
}
