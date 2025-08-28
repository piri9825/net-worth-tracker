import React, { useState, useEffect } from 'react';
import { Account } from '../types/api';
import { dataService } from '../services/api';

interface AccountSelectorProps {
  selectedTags: string[];
  selectedAccounts: string[];
  onAccountsChange: (accounts: string[]) => void;
  loading?: boolean;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  selectedTags,
  selectedAccounts,
  onAccountsChange,
  loading = false,
}) => {
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const accounts = await dataService.getAccountsByTags(selectedTags);
        setAvailableAccounts(accounts);
        
        // Remove any selected accounts that are no longer available
        const availableAccountNames = accounts.map(acc => acc.name);
        const validSelectedAccounts = selectedAccounts.filter(name =>
          availableAccountNames.includes(name)
        );
        
        if (validSelectedAccounts.length !== selectedAccounts.length) {
          onAccountsChange(validSelectedAccounts);
        }
      } catch (err) {
        setError('Failed to load accounts');
        console.error('Error fetching accounts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [selectedTags, selectedAccounts, onAccountsChange]);

  const handleAccountToggle = (accountName: string) => {
    if (selectedAccounts.includes(accountName)) {
      onAccountsChange(selectedAccounts.filter(name => name !== accountName));
    } else {
      onAccountsChange([...selectedAccounts, accountName]);
    }
  };

  const handleSelectAll = () => {
    onAccountsChange(availableAccounts.map(acc => acc.name));
  };

  const handleClearAll = () => {
    onAccountsChange([]);
  };

  const getAccountTagColors = (tags: string[]) => {
    const colors: { [key: string]: string } = {
      'Asset': 'bg-green-100 text-green-800',
      'Liability': 'bg-red-100 text-red-800',
      'Short Term': 'bg-blue-100 text-blue-800',
      'Long Term': 'bg-purple-100 text-purple-800',
    };
    
    return tags.map(tag => colors[tag] || 'bg-gray-100 text-gray-800');
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Accounts</h3>
        <div className="flex items-center justify-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Accounts</h3>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Select Accounts 
          <span className="text-sm text-gray-500 ml-2">
            ({availableAccounts.length} available)
          </span>
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800"
            disabled={loading || selectedAccounts.length === availableAccounts.length}
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleClearAll}
            className="text-sm text-blue-600 hover:text-blue-800"
            disabled={loading || selectedAccounts.length === 0}
          >
            Clear All
          </button>
        </div>
      </div>

      {availableAccounts.length === 0 ? (
        <div className="text-gray-500 text-sm py-4">
          No accounts match the selected tags
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {availableAccounts.map((account) => (
            <label
              key={account.name}
              className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedAccounts.includes(account.name)
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedAccounts.includes(account.name)}
                onChange={() => handleAccountToggle(account.name)}
                disabled={loading}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{account.name}</div>
                {account.description && (
                  <div className="text-sm text-gray-600 mt-1">{account.description}</div>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {account.tags.map((tag, index) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        getAccountTagColors(account.tags)[index]
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}

      {selectedAccounts.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
};