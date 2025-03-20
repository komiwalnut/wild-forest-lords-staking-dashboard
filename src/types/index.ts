export interface Lord {
  tokenId: string;
  name: string;
  owner: string;
  isStaked: boolean;
  stakingDuration: number | null;
  attributes: {
    rank: string[];
    specie: string[];
  };
}

export interface GraphQLResponse {
  data: {
    erc721Tokens: {
      results: {
        name: string;
        owner: string;
        tokenId: string;
        attributes: {
          rank: string[];
          specie: string[];
        };
      }[];
    };
  };
}

export interface RPCResponse {
  result?: string;
  error?: {
    code: number;
    message: string;
    data: string;
  };
}

export interface StakingStats {
  uniqueStakers: number;
  totalStaked: number;
  averageDuration: number;
}

export interface FilterOptions {
  lordSpecie: string;
  lordRarity: string;
  minDuration: number;
  sortBy: SortOption;
  onlyStaked: boolean;
}

export interface OwnerData {
  address: string;
  totalLords: number;
  rare: number;
  epic: number;
  legendary: number;
  mystic: number;
  staked: number;
  rafflePower: number;
  lords: Lord[];
}

export interface OwnerStats {
  uniqueOwners: number;
  highestLordCount: number;
  highestLordOwner: string;
}

export interface OwnersStatsProps {
  uniqueOwners: number;
  highestLordCount: number;
  highestLordOwner: string;
  loading: boolean;
}

export interface OwnersListProps {
  owners: OwnerData[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export interface Participant {
  address: string;
  rafflePower: number;
  winChance: number;
  status: 'Eligible' | 'No Raffle Power';
}

export interface Winner {
  address: string;
  power: number;
  winChance: number;
}

export interface RaffleStats {
  total: number;
  eligible: number;
  ineligible: number;
  totalRafflePower: number;
}

export interface ValidationInfo {
  lines: number;
  validAddresses: number;
  uniqueAddresses: number;
  duplicates: number;
}

export interface DrawWinnersProps {
  guaranteeCount: number;
  fcfsCount: number;
  setGuaranteeCount: (count: number) => void;
  setFcfsCount: (count: number) => void;
  drawWinners: () => void;
  guaranteeWinners: Winner[];
  fcfsWinners: Winner[];
  exportWinnersToCSV: () => void;
  loading: boolean;
  eligibleCount: number;
}

export interface ParticipantsListProps {
  participants: Participant[];
  statistics: RaffleStats;
  loading: boolean;
}

export interface AddressInputProps {
  onAddressesChange: (text: string) => void;
  useAllStakers: (callback?: (text: string) => void) => void;
  validationInfo: ValidationInfo;
  loading: boolean;
  uniqueStakersCount: number;
}

export type SortOption = 
  | 'durationHighToLow' 
  | 'durationLowToHigh' 
  | 'tokenIdAsc'
  | 'tokenIdDesc';

export const LORD_SPECIES = ['All', 'Wolf', 'Owl', 'Raven', 'Boar', 'Fox'];
export const LORD_RARITIES = ['All', 'Rare', 'Epic', 'Legendary', 'Mystic'];