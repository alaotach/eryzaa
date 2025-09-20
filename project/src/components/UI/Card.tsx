import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hover = false,
  onClick 
}) => {
  const cardClasses = `
    bg-white dark:bg-dark-card 
    rounded-lg 
    shadow-sm 
    border border-gray-200 dark:border-dark-border
    ${hover ? 'transition-transform hover:shadow-lg' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `;

  if (hover || onClick) {
    return (
      <motion.div
        whileHover={hover ? { y: -2, shadow: '0 10px 25px rgba(0, 0, 0, 0.1)' } : {}}
        onClick={onClick}
        className={cardClasses}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={cardClasses}>
      {children}
    </div>
  );
};

export default Card;