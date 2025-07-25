async function loadModel() {
  const model = await tf.loadLayersModel('./model/model.json');
  return model;
}
function getDummyInput(ticker) {
  const inputs = {
    AAPL: [0.5,0.2,0.8,0.6,0.7,0.3,0.1,0.9,0.4,0.5,0.6,0.7,0.8,0.5,0.3],
    TSLA: [0.4,0.1,0.6,0.7,0.5,0.2,0.3,0.8,0.4,0.6,0.7,0.6,0.7,0.5,0.4],
    MSFT: [0.6,0.3,0.7,0.5,0.6,0.4,0.2,0.7,0.3,0.5,0.5,0.6,0.6,0.4,0.3]
  };
  const input = inputs[ticker.toUpperCase()] || inputs["AAPL"];
  return tf.tensor2d([input]);
}
async function predict() {
  const ticker = document.getElementById('ticker').value.trim().toUpperCase();
  const model = await loadModel();
  const input = getDummyInput(ticker);
  const prediction = model.predict(input);
  prediction.array().then(arr => {
    const value = arr[0][0];
    document.getElementById('predictionOutput').innerText = ticker + " Prediction: $" + value.toFixed(2);
    updateChart(value, ticker);
  });
}
function updateChart(predictedValue, ticker) {
  const ctx = document.getElementById('stockChart').getContext('2d');
  const data = {
    labels: ['Now', 'Next Hour'],
    datasets: [{
      label: ticker + ' Price',
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
      scales: { y: { beginAtZero: false } }
    }
  });
}
