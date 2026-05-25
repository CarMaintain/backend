import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { UploadsService } from '../src/modules/uploads/uploads.service';

describe('UploadsService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function serviceWithConfig(overrides?: Record<string, unknown>) {
    const values: Record<string, unknown> = {
      'maxUploadSizeMb': 8,
      'supabase.url': 'https://example.supabase.co',
      'supabase.serviceRoleKey': 'service-role-key',
      'supabase.storageBucket': 'maintaincar-uploads',
      ...overrides,
    };
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => (key in values ? values[key] : defaultValue)),
    } as unknown as ConfigService;
    return new UploadsService(configService);
  }

  it('uploads a maintenance photo to Supabase Storage and returns its public URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn(),
    }) as typeof fetch;
    const service = serviceWithConfig();

    const result = await service.uploadPhoto(
      'user_1',
      { category: 'maintenance' },
      {
        buffer: Buffer.from('image-bytes'),
        mimetype: 'image/jpeg',
        originalname: 'receipt.jpg',
        size: 1024,
      },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/example\.supabase\.co\/storage\/v1\/object\/maintaincar-uploads\/maintenance\/user_1\//),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer service-role-key',
          apikey: 'service-role-key',
          'Content-Type': 'image/jpeg',
          'x-upsert': 'false',
        }),
        body: expect.any(Uint8Array),
      }),
    );
    expect(result.data.url).toMatch(
      /^https:\/\/example\.supabase\.co\/storage\/v1\/object\/public\/maintaincar-uploads\/maintenance\/user_1\//,
    );
  });

  it('rejects non-image uploads', async () => {
    const service = serviceWithConfig();

    await expect(
      service.uploadPhoto(
        'user_1',
        { category: 'documents' },
        {
          buffer: Buffer.from('not-an-image'),
          mimetype: 'application/pdf',
          originalname: 'paper.pdf',
          size: 1024,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fails clearly when Supabase storage is not configured', async () => {
    const service = serviceWithConfig({ 'supabase.url': '', 'supabase.serviceRoleKey': '' });

    await expect(
      service.uploadPhoto(
        'user_1',
        { category: 'documents' },
        {
          buffer: Buffer.from('image-bytes'),
          mimetype: 'image/png',
          originalname: 'paper.png',
          size: 1024,
        },
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
