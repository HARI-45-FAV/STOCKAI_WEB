// utils/runPython.js
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

function runPython(scriptPath, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        // Validate script exists
        const fullScriptPath = path.resolve(scriptPath);
        if (!fs.existsSync(fullScriptPath)) {
            return reject(new Error(`Python script not found: ${fullScriptPath}`));
        }

        console.log(`🐍 Running Python script: ${scriptPath}`);
        console.log(`📝 Args: ${args.slice(0, 2).join(', ')}${args.length > 2 ? '...' : ''}`);

        // Try different Python commands
        const pythonCommands = ['python3', 'python', 'py'];
        let currentCommandIndex = 0;

        function tryPython() {
            const pythonCmd = pythonCommands[currentCommandIndex];
            
            const pyProcess = spawn(pythonCmd, [fullScriptPath, ...args], {
                stdio: ['pipe', 'pipe', 'pipe'],
                ...options
            });

            let output = "";
            let errorOutput = "";

            pyProcess.stdout.on("data", (data) => {
                const chunk = data.toString();
                output += chunk;
                console.log(`🐍 Python stdout: ${chunk.substring(0, 100)}${chunk.length > 100 ? '...' : ''}`);
            });

            pyProcess.stderr.on("data", (data) => {
                const chunk = data.toString();
                errorOutput += chunk;
                console.error(`🐍 Python stderr: ${chunk}`);
            });

            pyProcess.on("close", (code) => {
                if (code === 0) {
                    console.log(`✅ Python script completed successfully`);
                    resolve(output.trim());
                } else {
                    console.error(`❌ Python script exited with code ${code}`);
                    
                    // Try next Python command if available
                    if (currentCommandIndex < pythonCommands.length - 1) {
                        currentCommandIndex++;
                        console.log(`🔄 Trying ${pythonCommands[currentCommandIndex]}...`);
                        tryPython();
                    } else {
                        reject(new Error(`Python script failed with code ${code}\nError: ${errorOutput}\nOutput: ${output}`));
                    }
                }
            });

            pyProcess.on("error", (err) => {
                if (err.code === 'ENOENT') {
                    // Python command not found, try next one
                    if (currentCommandIndex < pythonCommands.length - 1) {
                        currentCommandIndex++;
                        console.log(`🔄 ${pythonCmd} not found, trying ${pythonCommands[currentCommandIndex]}...`);
                        tryPython();
                    } else {
                        reject(new Error(`Python not found. Please install Python and ensure it's in PATH. Tried: ${pythonCommands.join(', ')}`));
                    }
                } else {
                    reject(new Error(`Failed to start Python process: ${err.message}`));
                }
            });

            // Handle timeout
            const timeout = options.timeout || 30000; // 30 second default
            const timer = setTimeout(() => {
                pyProcess.kill('SIGTERM');
                reject(new Error(`Python script timed out after ${timeout}ms`));
            }, timeout);

            pyProcess.on('close', () => {
                clearTimeout(timer);
            });
        }

        tryPython();
    });
}

// Helper function to check if Python is available
function checkPython() {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        exec('python --version', (error) => {
            if (error) {
                exec('python3 --version', (error3) => {
                    if (error3) {
                        exec('py --version', (errorPy) => {
                            resolve(!errorPy);
                        });
                    } else {
                        resolve(true);
                    }
                });
            } else {
                resolve(true);
            }
        });
    });
}

// Mock Python execution for development/testing
function mockPythonExecution(scriptPath, args = []) {
    console.log(`🎭 Mock Python execution: ${scriptPath}`);
    
    if (scriptPath.includes('stock_service.py') || scriptPath.includes('radapt.py')) {
        const mockResult = {
            success: true,
            message: "Stock data processed successfully (MOCK)",
            cleanedData: [
                { date: "2023-01-01", open: 100, high: 105, low: 99, close: 103, volume: 1000000 },
                { date: "2023-01-02", open: 103, high: 107, low: 102, close: 106, volume: 1200000 }
            ],
            statistics: {
                totalRows: 252,
                cleanedRows: 250,
                missingValues: 2,
                dateRange: "2023-01-01 to 2023-12-31"
            },
            indicators: {
                sma_20: 104.5,
                ema_12: 105.2,
                rsi_14: 65.8,
                volatility: 0.15
            }
        };
        
        return Promise.resolve(JSON.stringify(mockResult));
    }
    
    return Promise.resolve('{"success": true, "message": "Mock execution completed"}');
}

module.exports = runPython;
module.exports.checkPython = checkPython;
module.exports.mockPython = mockPythonExecution;