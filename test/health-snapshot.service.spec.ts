import { HealthSnapshotService } from '../src/modules/health-snapshot/health-snapshot.service';

describe('HealthSnapshotService', () => {
  const service = new HealthSnapshotService({} as never, {} as never);

  it('sorts maintenance by urgency', () => {
    const sorted = service.sortMaintenanceByUrgency([
      { id: 'ok', status: 'ok', nextDueDate: null },
      { id: 'due', status: 'due', nextDueDate: null },
      { id: 'soon', status: 'soon', nextDueDate: null },
    ] as never);

    expect(sorted.map((item) => item.id)).toEqual(['due', 'soon', 'ok']);
  });
});
