export const RISK_FACTORS = {
  DIRECTLY_FLAGGED: {
    points: 60,
    description: 'Address is directly flagged in our database',
  },
  ONE_HOP_FLAGGED: {
    points: 40,
    description: 'Direct interaction with flagged address',
  },
  TWO_HOPS_FLAGGED: {
    points: 20,
    description: 'Two hops away from flagged address',
  },
  TORNADO_CASH: {
    points: 35,
    description: 'Tornado Cash mixer interaction',
  },
  EXCHANGE_DEPOSIT: {
    points: 10,
    description: 'Deposit to known exchange',
  },
  DARKNET: {
    points: 50,
    description: 'Darknet marketplace interaction',
  },
  HIGH_VELOCITY: {
    points: 15,
    description: 'Transaction velocity > 100 ETH/day',
  },
  NEW_HIGH_VOLUME: {
    points: 10,
    description: 'New address with high volume',
  },
} as const;
