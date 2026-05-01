import { useState, useRef } from 'react';

/**
 * useSearch: Manages debounced search with auto-trigger
 * @param {number} delayMs - Debounce delay (default 300ms)
 * @param {number} minChars - Minimum characters to trigger (default 3)
 * @returns {object} { query, setQuery, handleInputChange, handleSearch }
 */
export function useSearch(delayMs = 300, minChars = 3) {
  const [query, setQuery] = useState('');
  const debounceTimer = useRef(null);

  const handleInputChange = (value, onSearch) => {
    setQuery(value);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (value.length >= minChars && onSearch) {
      debounceTimer.current = setTimeout(() => {
        onSearch(value);
      }, delayMs);
    }
  };

  const handleSearch = (term, onSearch) => {
    const searchTerm = (term || query).trim();
    if (searchTerm && onSearch) {
      onSearch(searchTerm);
    }
  };

  return {
    query,
    setQuery,
    handleInputChange,
    handleSearch,
  };
}