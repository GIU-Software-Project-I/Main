import { OfferResponseStatus } from '@/app/types/enums';

/**
 * Returns badge class and label for a given OfferResponseStatus
 */
export function getOfferResponseStatusConfig(status: OfferResponseStatus): { badge: string; label: string } {
  switch (status) {
    case OfferResponseStatus.PENDING:
      return {
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        label: 'Pending',
      };
    case OfferResponseStatus.ACCEPTED:
      return {
        badge: 'bg-green-100 text-green-800 border-green-300',
        label: 'Accepted',
      };
    case OfferResponseStatus.REJECTED:
      return {
        badge: 'bg-red-100 text-red-800 border-red-300',
        label: 'Rejected',
      };
    default:
      return {
        badge: 'bg-gray-100 text-gray-800 border-gray-300',
        label: 'Unknown',
      };
  }
}
