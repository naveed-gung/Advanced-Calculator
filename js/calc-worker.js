self.onmessage = function(e) {
    const { calculation } = e.data;
    
    // Perform heavy calculations here
    const result = performCalculation(calculation);
    
    self.postMessage(result);
};

function performCalculation(calc) {
    // Complex calculation logic
    return eval(calc); // Note: implement proper safe evaluation
} 