import React from 'react';
import { ViewMode } from '../types/api';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  disabled?: boolean;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onViewModeChange,
  disabled = false,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Chart View</h3>
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onViewModeChange('aggregated')}
          disabled={disabled}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            viewMode === 'aggregated'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Aggregated
        </button>
        <button
          onClick={() => onViewModeChange('split')}
          disabled={disabled}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            viewMode === 'split'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Split by Account
        </button>
      </div>
      <div className="mt-3 text-sm text-gray-600">
        {viewMode === 'aggregated' 
          ? 'Shows the total combined value of all selected accounts over time'
          : 'Shows each selected account as a separate line on the chart'
        }
      </div>
    </div>
  );
};