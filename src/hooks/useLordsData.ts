import { useState, useEffect, useCallback, useRef } from 'react';
import { Lord, StakingStats, FilterOptions, LORD_SPECIES, LORD_RARITIES } from '../types';

export function useLordsData() {
  const [lords, setLords] = useState<Lord[]>([]);
  const [filteredLords, setFilteredLords] = useState<Lord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StakingStats>({
    uniqueStakers: 0,
    totalStaked: 0,
    averageDuration: 0,
  });
  
  const [filters, setFilters] = useState<FilterOptions>({
    lordSpecie: 'All',
    lordRarity: 'All',
    minDuration: 0,
    sortBy: 'durationHighToLow',
    onlyStaked: false,
  });

  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const calculateGlobalStats = (lordsData: Lord[]): StakingStats => {
    const stakedLords = lordsData.filter(lord => lord.isStaked);
    const uniqueOwners = new Set(stakedLords.map(lord => lord.owner)).size;
    const totalDuration = stakedLords.reduce((sum, lord) => sum + (lord.stakingDuration || 0), 0);
    
    return {
      uniqueStakers: uniqueOwners,
      totalStaked: stakedLords.length,
      averageDuration: stakedLords.length ? Math.round(totalDuration / stakedLords.length) : 0,
    };
  };

  const fetchLordsData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (isRefresh) {
        try {
          const refreshResponse = await fetch('/api/client-proxy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (!refreshResponse.ok) {
            const errorData = await refreshResponse.json();
            console.error('Cache refresh response:', refreshResponse.status, errorData);
            throw new Error(`Failed to refresh cache: ${errorData.message || refreshResponse.statusText}`);
          }
        } catch (error) {
          console.error('Error refreshing cache:', error);
          setError('Failed to refresh data. Please try again later.');
          setRefreshing(false);
          return;
        }
      }

      const masterQueryParams = new URLSearchParams({
        from: '0',
        size: '50',
        lordSpecie: filtersRef.current.lordSpecie,
        lordRarity: filtersRef.current.lordRarity,
        minDuration: filtersRef.current.minDuration.toString(),
        onlyStaked: filtersRef.current.onlyStaked.toString(),
        checkMaster: 'true'
      });
      
      const masterResponse = await fetch(`/api/staking-data?${masterQueryParams}`);
      
      if (masterResponse.ok) {
        const masterData = await masterResponse.json();
        
        if (masterData.isMasterCache && !isRefresh) {
          setLords(masterData.lords);
          setStats(masterData.stats);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      let allLords: Lord[] = [];
      let from = 0;
      const pageSize = 50;
      let hasMoreResults = true;
      
      const initialFetch = async () => {
        const currentFilters = filtersRef.current;
        const queryParams = new URLSearchParams({
          from: '0',
          size: pageSize.toString(),
          lordSpecie: currentFilters.lordSpecie,
          lordRarity: currentFilters.lordRarity,
          minDuration: currentFilters.minDuration.toString(),
          onlyStaked: currentFilters.onlyStaked.toString(),
          checkMaster: 'false' 
        });
        
        const response = await fetch(`/api/staking-data?${queryParams}`);
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
      };
      
      const initialData = await initialFetch();
      allLords = [...initialData.lords];

      setLords(initialData.lords);
      setStats(calculateGlobalStats(initialData.lords));
      
      from = pageSize;
      
      const fetchBatch = async () => {
        if (!hasMoreResults || from >= 3000) {
          setLoading(false);
          setRefreshing(false);
          setIsFetchingMore(false);
          return;
        }
        
        setIsFetchingMore(true);
      
        const batchRequests: Promise<Lord[]>[] = [];
        
        for (let i = 0; i < 8 && from < 3000; i++) {
          const currentFrom = from + (i * pageSize);
          
          const fetchPage = async (): Promise<Lord[]> => {
            try {
              await new Promise(resolve => setTimeout(resolve, i * 75));
              
              const currentFilters = filtersRef.current;
              const queryParams = new URLSearchParams({
                from: currentFrom.toString(),
                size: pageSize.toString(),
                lordSpecie: currentFilters.lordSpecie,
                lordRarity: currentFilters.lordRarity,
                minDuration: currentFilters.minDuration.toString(),
                onlyStaked: currentFilters.onlyStaked.toString(),
                checkMaster: 'false'
              });
              
              const response = await fetch(`/api/staking-data?${queryParams}`);
              
              if (!response.ok) {
                console.error(`API request failed: ${response.statusText}`);
                return [];
              }
              
              const data = await response.json();
              return Array.isArray(data.lords) ? data.lords as Lord[] : [];
            } catch (err) {
              console.error('Error in batch fetch:', err);
              return [];
            }
          };
          
          batchRequests.push(fetchPage());
        }
        
        from += pageSize * 8;
        
        const batchResults = await Promise.all(batchRequests);
        const newLords = batchResults.flat();
        
        if (newLords.length === 0) {
          hasMoreResults = false;
          setLoading(false);
          setRefreshing(false);
          setIsFetchingMore(false);
          return;
        }

        allLords = [...allLords, ...newLords];
        
        setLords(prev => {
          const updatedLords = [...prev, ...newLords];
          setStats(calculateGlobalStats(updatedLords));
          return updatedLords;
        });
        
        setTimeout(fetchBatch, 300);
      };
      
      fetchBatch();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Lord data');
      console.error('Error fetching Lord data:', err);
      setLoading(false);
      setRefreshing(false);
      setIsFetchingMore(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      await fetchLordsData(true);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setRefreshing(false);
    }
  }, [fetchLordsData]);

  const applyFiltersAndSort = useCallback(() => {
    const filtered = lords.filter(lord => {
      if (filters.onlyStaked && !lord.isStaked) {
        return false;
      }
      
      const specie = lord.attributes.specie[0]?.toLowerCase() || '';
      const matchesSpecie = filters.lordSpecie === 'All' ? 
        true : 
        specie === filters.lordSpecie.toLowerCase();
      
      const rarity = lord.attributes.rank[0]?.toLowerCase() || '';
      const matchesRarity = filters.lordRarity === 'All' ? 
        true : 
        rarity === filters.lordRarity.toLowerCase();
      
      const matchesDuration = !lord.isStaked ? 
        !filters.onlyStaked : 
        (lord.stakingDuration || 0) >= filters.minDuration;
      
      return matchesSpecie && matchesRarity && matchesDuration;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (filters.sortBy) {
        case 'durationHighToLow':
          if (!a.isStaked && !b.isStaked) return 0;
          if (!a.isStaked) return 1;
          if (!b.isStaked) return -1;
          return (b.stakingDuration || 0) - (a.stakingDuration || 0);
          
        case 'durationLowToHigh':
          if (!a.isStaked && !b.isStaked) return 0;
          if (!a.isStaked) return 1;
          if (!b.isStaked) return -1;
          return (a.stakingDuration || 0) - (b.stakingDuration || 0);
          
        case 'tokenIdAsc':
          return parseInt(a.tokenId) - parseInt(b.tokenId);
          
        case 'tokenIdDesc':
          return parseInt(b.tokenId) - parseInt(a.tokenId);
          
        default:
          return 0;
      }
    });
    
    setFilteredLords(sorted);
  }, [filters, lords]);

  useEffect(() => {
    if (lords.length > 0) {
      applyFiltersAndSort();
    }
  }, [lords, applyFiltersAndSort]);

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  useEffect(() => {
    fetchLordsData();
  }, [fetchLordsData]);

  return {
    lords: filteredLords,
    allLords: lords,
    loading,
    refreshing,
    isFetchingMore,
    error,
    stats,
    filters,
    updateFilters,
    refreshData,
    species: LORD_SPECIES,
    rarities: LORD_RARITIES,
  };
}