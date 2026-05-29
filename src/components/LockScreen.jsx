import React, { useState, useEffect } from 'react';
import { ShieldAlert, Delete, Lock, Unlock } from 'lucide-react';

export default function LockScreen({ correctPin, onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        setUnlocking(true);
        setTimeout(() => {
          onUnlock();
        }, 600);
      } else {
        setError(true);
        // Trigger a haptic feel (visual shake) and reset
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
      }
    }
  }, [pin, correctPin, onUnlock]);

  const handleKeyPress = (num) => {
    if (pin.length < 4 && !unlocking) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    if (!unlocking) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="lock-screen-container">
      <div className="lock-shield-icon">
        {unlocking ? <Unlock size={48} /> : <Lock size={48} />}
      </div>
      
      <div className="lock-title">
        {unlocking ? 'Solace Unlocked' : 'Journal Locked'}
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '-1.5rem' }}>
        Please enter your 4-digit security PIN
      </p>

      <div className="lock-dots-row">
        {[0, 1, 2, 3].map((index) => (
          <div 
            key={index} 
            className={`lock-dot ${index < pin.length ? 'filled' : ''}`}
          />
        ))}
      </div>

      <div className="lock-error-msg">
        {error && 'Incorrect PIN. Please try again.'}
      </div>

      <div className="lock-keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button 
            key={num} 
            className="keypad-btn"
            onClick={() => handleKeyPress(num.toString())}
          >
            {num}
          </button>
        ))}
        <button 
          className="keypad-btn" 
          style={{ fontSize: '0.9rem', opacity: 0.5, pointerEvents: 'none' }}
        >
          {/* Empty spacer */}
        </button>
        <button 
          className="keypad-btn"
          onClick={() => handleKeyPress('0')}
        >
          0
        </button>
        <button 
          className="keypad-btn"
          onClick={handleDelete}
        >
          <Delete size={20} />
        </button>
      </div>
    </div>
  );
}
