import { useState, useEffect } from 'react';

/**
 * useFetchData: Generic async data fetcher with loading/error states
 * @param {function} fetchFn - Async function that returns data
 * @param {array} dependencies - Dependencies array to re-run fetch
 * @returns {object} { data, loading, error, refetch }
 */
export function useFetchData(fetchFn, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.message || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, dependencies);

  return { data, loading, error, refetch };
}