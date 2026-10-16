import { Module } from '@nestjs/common';
import { SickLettersService } from './sick-letters.service';
import { SickLettersController } from './sick-letters.controller';

@Module({
  controllers: [SickLettersController],
  providers: [SickLettersService],
  exports: [SickLettersService],
})
export class SickLettersModule {}
