async function loadModel() {
  const model = await tf.loadLayersModel('./model/model.json');
  return model;
}

// Auto-generate dummy input based on model input shape
async function getInputMatchingModel(model, ticker) {
  const inputSize = model.inputs[0].shape[1];  // Automatically get feature count
  const baseInputs = {
    AAPL: [0.5, 0.2, 0.8, 0.6, 0.7, 0.3, 0.1, 0.9, 0.4, 0.5, 0.6, 0.7, 0.8, 0.5, 0.3],
    TSLA: [0.4, 0.1, 0.6, 0.7, 0.5, 0.2, 0.3, 0.8, 0.4, 0.6, 0.7, 0.6, 0.7, 0.5, 0.4],
    MSFT: [0.6, 0.3, 0.7, 0.5, 0.6, 0.4, 0.2, 0.7, 0.3, 0.5, 0.5, 0.6, 0.6, 0.4, 0.3]
  };

  // Use a known pattern or fallback
  const base = baseInputs[ticker] || baseInputs['AAPL'];

  // Repeat or trim to match input size
  let expanded = [];
  while (expanded.length < inputSize) {
    expanded = expanded.concat(base);
  }
  expanded = expanded.slice(0, inputSize);  // Ensure exact length

  return tf.tensor2d([expanded]);  // shape: [1, inputSize]
}

async function predict() {
  const ticker = document.getElementById('ticker').value.trim().toUpperCase();
  const model = await loadModel();
  const input = await getInputMatchingModel(model, ticker);

  const prediction = model.predict(input);
  prediction.array().then(arr => {
    const value = arr[0][0];
    document.getElementById('predictionOutput').innerText = `${ticker} Prediction: $${value.toFixed(2)}`;
    updateChart(value, ticker);
  });
}

function updateChart(predictedValue, ticker) {
  const ctx = document.getElementById('stockChart').getContext('2d');
  const data = {
    labels: ['Now', 'Next Hour'],
    datasets: [{
      label: `${ticker} Price`,
      data: [150, predictedValue],
      borderColor: 'blue',
      fill: false
    }]
  };
  new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      responsive: false,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}
