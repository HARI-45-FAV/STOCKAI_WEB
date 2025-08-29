const { spawn } = require('child_process');
const path = require('path');

const runPredictionAnalysis = (companies, targetDate) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../python/prediction_service.py');
    const inputData = JSON.stringify({ companies, targetDate });
    
    const pythonProcess = spawn('python', [pythonScript, inputData]);
    
    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', errorString);
        reject(new Error(errorString || 'Python script failed'));
        return;
      }

      try {
        const results = JSON.parse(dataString);
        resolve(results);
      } catch (parseError) {
        reject(new Error('Failed to parse prediction results: ' + parseError.message));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error('Failed to start Python process: ' + error.message));
    });
  });
};

module.exports = { runPredictionAnalysis };