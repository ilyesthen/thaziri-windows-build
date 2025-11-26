import React, { useState } from 'react'
import './Calculator.css'

interface CalculatorProps {
  onClose: () => void
}

const Calculator: React.FC<CalculatorProps> = ({ onClose }) => {
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [newNumber, setNewNumber] = useState(true)

  const handleNumber = (num: string) => {
    if (newNumber) {
      setDisplay(num)
      setNewNumber(false)
    } else {
      setDisplay(display === '0' ? num : display + num)
    }
  }

  const handleOperator = (op: string) => {
    const current = parseFloat(display)
    
    if (previousValue === null) {
      setPreviousValue(current)
    } else if (operation) {
      const result = calculate(previousValue, current, operation)
      setDisplay(String(result))
      setPreviousValue(result)
    }
    
    setOperation(op)
    setNewNumber(true)
  }

  const calculate = (prev: number, current: number, op: string): number => {
    switch (op) {
      case '+': return prev + current
      case '-': return prev - current
      case '×': return prev * current
      case '÷': return prev / current
      default: return current
    }
  }

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const current = parseFloat(display)
      const result = calculate(previousValue, current, operation)
      setDisplay(String(result))
      setPreviousValue(null)
      setOperation(null)
      setNewNumber(true)
    }
  }

  const handleClear = () => {
    setDisplay('0')
    setPreviousValue(null)
    setOperation(null)
    setNewNumber(true)
  }

  const handleDecimal = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.')
      setNewNumber(false)
    }
  }

  return (
    <div className="calculator-overlay" onClick={onClose}>
      <div className="calculator" onClick={(e) => e.stopPropagation()}>
        <div className="calculator-header">
          <span>Calculatrice</span>
          <button className="calc-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="calculator-display">{display}</div>
        <div className="calculator-buttons">
          <button onClick={handleClear} className="btn-function">C</button>
          <button onClick={() => handleOperator('÷')} className="btn-operator">÷</button>
          <button onClick={() => handleOperator('×')} className="btn-operator">×</button>
          <button onClick={() => handleOperator('-')} className="btn-operator">-</button>
          
          <button onClick={() => handleNumber('7')} className="btn-number">7</button>
          <button onClick={() => handleNumber('8')} className="btn-number">8</button>
          <button onClick={() => handleNumber('9')} className="btn-number">9</button>
          <button onClick={() => handleOperator('+')} className="btn-operator">+</button>
          
          <button onClick={() => handleNumber('4')} className="btn-number">4</button>
          <button onClick={() => handleNumber('5')} className="btn-number">5</button>
          <button onClick={() => handleNumber('6')} className="btn-number">6</button>
          <button onClick={handleEquals} className="btn-equals" style={{ gridRow: 'span 2' }}>=</button>
          
          <button onClick={() => handleNumber('1')} className="btn-number">1</button>
          <button onClick={() => handleNumber('2')} className="btn-number">2</button>
          <button onClick={() => handleNumber('3')} className="btn-number">3</button>
          
          <button onClick={() => handleNumber('0')} className="btn-number" style={{ gridColumn: 'span 2' }}>0</button>
          <button onClick={handleDecimal} className="btn-number">.</button>
        </div>
      </div>
    </div>
  )
}

export default Calculator
