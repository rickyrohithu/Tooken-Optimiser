import React from 'react';
import { motion } from 'framer-motion';
import './TokenStack.css';

const TokenStack = ({ jsonTokens, toonTokens }) => {
  const savings = jsonTokens > 0 ? ((jsonTokens - toonTokens) / jsonTokens * 100).toFixed(1) : 0;
  
  // Calculate relative heights (JSON is always 100% relative, TOON is proportional)
  const toonHeight = jsonTokens > 0 ? (toonTokens / jsonTokens * 100) : 0;

  return (
    <div className="token-stack-container">
      <div className="stack-bars">
        <div className="bar-group">
          <motion.div 
            className="bar json-bar"
            initial={{ height: 0 }}
            animate={{ height: '100%' }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="bar-value">{jsonTokens}</span>
          </motion.div>
          <span className="bar-label">JSON</span>
        </div>

        <div className="bar-group">
          <motion.div 
            className="bar toon-bar"
            initial={{ height: 0 }}
            animate={{ height: `${toonHeight}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <span className="bar-value">{toonTokens}</span>
          </motion.div>
          <span className="bar-label">TOON</span>
        </div>
      </div>

      <motion.div 
        className="savings-badge"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
      >
        <span className="savings-title">SAVINGS</span>
        <span className="savings-value">{savings}%</span>
      </motion.div>
    </div>
  );
};

export default TokenStack;
