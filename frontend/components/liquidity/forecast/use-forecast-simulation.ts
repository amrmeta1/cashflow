export interface SimulationParams {
  collectionDelay: number;
  revenueDrop: number;
  expenseSurge: number;
}

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  collectionDelay: 0,
  revenueDrop: 0,
  expenseSurge: 0,
};
