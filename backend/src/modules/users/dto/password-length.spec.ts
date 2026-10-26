import { validate } from 'class-validator';
import { Role } from '@prisma/client';
import { LoginDto } from '../../auth/dto/login.dto';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';

describe('Bcrypt password byte limit', () => {
  it('rejects passwords that bcrypt would silently truncate on account creation', async () => {
    const dto = Object.assign(new CreateUserDto(), {
      nama: 'Guru',
      email: 'guru@example.sch.id',
      role: Role.GURU_PIKET,
      password: 'a'.repeat(73),
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects UTF-8 passwords over the bcrypt limit on updates and login', async () => {
    const update = Object.assign(new UpdateUserDto(), { password: '🙂'.repeat(19) });
    const login = Object.assign(new LoginDto(), {
      email: 'guru@example.sch.id',
      password: '🙂'.repeat(19),
    });

    expect(await validate(update)).not.toHaveLength(0);
    expect(await validate(login)).not.toHaveLength(0);
  });
});
