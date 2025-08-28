import React, { useState, useEffect } from 'react';
import { dataService } from '../services/api';

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  loading?: boolean;
}

export const TagFilter: React.FC<TagFilterProps> = ({ 
  selectedTags, 
  onTagsChange, 
  loading = false 
}) => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const tags = await dataService.getAllUniqueTags();
        setAvailableTags(tags);
      } catch (err) {
        setError('Failed to load tags');
        console.error('Error fetching tags:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, []);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleSelectAll = () => {
    onTagsChange(availableTags);
  };

  const handleClearAll = () => {
    onTagsChange([]);
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filter by Tags</h3>
        <div className="flex items-center justify-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filter by Tags</h3>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filter by Tags</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800"
            disabled={loading || selectedTags.length === availableTags.length}
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleClearAll}
            className="text-sm text-blue-600 hover:text-blue-800"
            disabled={loading || selectedTags.length === 0}
          >
            Clear All
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {availableTags.map((tag) => (
          <label
            key={tag}
            className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedTags.includes(tag)
                ? 'bg-blue-50 border-blue-300 text-blue-900'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="checkbox"
              checked={selectedTags.includes(tag)}
              onChange={() => handleTagToggle(tag)}
              disabled={loading}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm font-medium">{tag}</span>
          </label>
        ))}
      </div>
      
      {selectedTags.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};