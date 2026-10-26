import { SICK_LETTER_UPLOAD_LIMITS } from './sick-letters.controller';

describe('Sick letter multipart limits', () => {
  it('caps all uploaded files, fields, parts, and text field size', () => {
    expect(SICK_LETTER_UPLOAD_LIMITS).toEqual({
      fileSize: expect.any(Number),
      files: 1,
      fields: 4,
      fieldSize: 2048,
      parts: 5,
    });
  });
});
