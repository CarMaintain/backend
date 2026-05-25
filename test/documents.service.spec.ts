import { DocumentsService } from '../src/modules/documents/documents.service';
import { DocumentStatus } from '../src/modules/documents/dto/document.enums';

describe('DocumentsService', () => {
  const service = new DocumentsService({} as never);
  const today = new Date('2026-05-20T10:00:00.000Z');

  it('returns unknown without an expiry date', () => {
    expect(service.calculateStatus(null, today)).toBe(DocumentStatus.unknown);
  });

  it('returns expired for past expiry dates', () => {
    expect(service.calculateStatus(new Date('2026-05-19T00:00:00.000Z'), today)).toBe(DocumentStatus.expired);
  });

  it('returns soon within 30 days', () => {
    expect(service.calculateStatus(new Date('2026-06-10T00:00:00.000Z'), today)).toBe(DocumentStatus.soon);
  });

  it('returns valid after 30 days', () => {
    expect(service.calculateStatus(new Date('2026-07-01T00:00:00.000Z'), today)).toBe(DocumentStatus.valid);
  });
});
